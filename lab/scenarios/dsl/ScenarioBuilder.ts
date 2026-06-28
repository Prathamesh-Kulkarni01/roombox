import { PlatformProvider } from "../../core/engine/PlatformProvider";
import { WorldBuilderContext } from "../../world/WorldBuilder";
import { EventStream } from "../../validation/EventStream";
import { InvariantEngine } from "../../validation/invariants/InvariantEngine";
import { ExecutionContext } from "../../core/engine/ExecutionContext";
import { VirtualTimeEngine } from "../../core/time/VirtualTimeEngine";
import { Command } from "../../domain/Command";
import { TenantProjection } from "../../domain/TenantModule/Projections/TenantProjection";

interface Capabilities {
  auth?: boolean;
  scheduler?: boolean;
  storage?: boolean;
  payments?: boolean;
}

interface ScenarioManifest {
  title: string;
  requirements: string[];
  executionMode: "API" | "UI" | "Hybrid";
  tags: string[];
  expectedTime: string;
  capabilities: Capabilities;
}

export interface BusinessJourney {
  apply(scenario: ScenarioRunner): void;
}

export class ScenarioRunner {
  private manifest: ScenarioManifest;
  private provider: PlatformProvider | null = null;
  private worldContext: WorldBuilderContext | null = null;
  private commands: Command[] = [];
  
  // Domain Assertions
  private assertions: Array<(ctx: ExecutionContext) => void> = [];

  constructor(title: string) {
    this.manifest = {
      title,
      requirements: [],
      executionMode: "API",
      tags: [],
      expectedTime: "<5s",
      capabilities: {}
    };
  }

  public requirements(reqs: string[]) {
    this.manifest.requirements = reqs;
    return this;
  }
  
  public tags(tags: string[]) {
    this.manifest.tags = tags;
    return this;
  }
  
  public requires(caps: Capabilities) {
    this.manifest.capabilities = caps;
    return this;
  }

  public on(provider: PlatformProvider) {
    this.provider = provider;
    return this;
  }

  public withAPI() {
    this.manifest.executionMode = "API";
    return this;
  }

  public setup(world: WorldBuilderContext) {
    this.worldContext = world.build();
    return this;
  }
  
  public executeCommand(cmd: Command) {
    this.commands.push(cmd);
    return this;
  }
  
  public compose(journey: BusinessJourney) {
    journey.apply(this);
    return this;
  }
  
  // Domain Assertions
  public expectGuestVerified(email: string) {
    this.assertions.push((ctx) => {
      const tenantProj = new TenantProjection(ctx.eventStream);
      const guest = tenantProj.getGuest(email);
      if (!guest || guest.status !== "Verified") {
         throw new Error(`Domain Assertion Failed: Expected guest ${email} to be Verified, but was ${guest?.status}`);
      }
    });
    return this;
  }

  public async run() {
    const startTime = performance.now();
    console.log(`[Scenario] Starting: ${this.manifest.title}`);
    
    if (!this.provider) throw new Error("No provider specified");
    if (!this.worldContext) throw new Error("No world setup specified");
    
    const virtualTime = new VirtualTimeEngine();
    const eventStream = new EventStream(this.manifest.title, virtualTime);
    const invariants = new InvariantEngine();
    
    const ctx: ExecutionContext = {
      world: this.worldContext,
      provider: this.provider,
      virtualTime,
      eventStream,
      invariants,
      logger: console,
      random: Math.random,
      scenarioId: this.manifest.title,
      executionMode: this.manifest.executionMode
    };

    if ((this.provider as any).eventStream !== undefined) {
       (this.provider as any).eventStream = eventStream;
    }
    
    const provStart = performance.now();
    await this.provider.initialize();
    const provInitTime = performance.now() - provStart;
    
    let totalCommandTime = 0;
    
    for (const cmd of this.commands) {
      const cmdStart = performance.now();
      await cmd.execute(ctx);
      const cmdLatency = performance.now() - cmdStart;
      totalCommandTime += cmdLatency;
      console.log(`[Telemetry] Command '${cmd.name}' executed in ${cmdLatency.toFixed(2)}ms`);
    }
    
    // Evaluate Domain Assertions
    for (const assertion of this.assertions) {
      assertion(ctx);
    }
    
    ctx.invariants.verifyAll(ctx);
    
    await this.provider.cleanup();
    
    const duration = performance.now() - startTime;
    console.log(`[Telemetry] Scenario Execution Time: ${duration.toFixed(2)}ms`);
    console.log(`[Telemetry] Real API Execution Time: ${totalCommandTime.toFixed(2)}ms`);
    console.log(`[Telemetry] Real Provider Init Time: ${provInitTime.toFixed(2)}ms`);
    console.log(`[Scenario] Finished: ${this.manifest.title}`);
    
    return ctx;
  }
}

export function Scenario(title: string) {
  return new ScenarioRunner(title);
}
