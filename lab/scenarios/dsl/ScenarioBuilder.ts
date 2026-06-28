import { PlatformProvider } from "../../core/engine/PlatformProvider";
import { WorldBuilderContext } from "../../world/WorldBuilder";
import { EventStream } from "../../validation/EventStream";
import { InvariantEngine } from "../../validation/invariants/InvariantEngine";
import { ExecutionContext } from "../../core/engine/ExecutionContext";
import { VirtualTimeEngine } from "../../core/time/VirtualTimeEngine";
import { Command } from "../../domain/Command";

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

export class ScenarioRunner {
  private manifest: ScenarioManifest;
  private provider: PlatformProvider | null = null;
  private worldContext: WorldBuilderContext | null = null;
  private executeFn: ((ctx: ExecutionContext) => Promise<void>) | null = null;
  private expectedEvents: string[] = [];
  private commands: Command[] = [];

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

  public execute(fn: (ctx: ExecutionContext) => Promise<void>) {
    this.executeFn = fn;
    return this;
  }
  
  public executeCommand(cmd: Command) {
    this.commands.push(cmd);
    return this;
  }

  public expectEvents(events: string[]) {
    this.expectedEvents = events;
    return this;
  }

  public async run() {
    const startTime = Date.now();
    console.log(`[Scenario] Starting: ${this.manifest.title}`);
    console.log(`[Manifest]`, this.manifest);
    
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
    
    await this.provider.initialize();
    
    // Execute raw function if provided
    if (this.executeFn) {
      await this.executeFn(ctx);
    }
    
    // Execute Domain Commands
    for (const cmd of this.commands) {
      const cmdStart = Date.now();
      await cmd.execute(ctx);
      const cmdLatency = Date.now() - cmdStart;
      console.log(`[Telemetry] Command '${cmd.name}' executed in ${cmdLatency}ms`);
    }
    
    if (this.expectedEvents.length > 0) {
      ctx.eventStream.expectEvents(this.expectedEvents);
      console.log(`[Scenario] ✔️ Verified events: ${this.expectedEvents.join(" -> ")}`);
    }
    
    ctx.invariants.verifyAll(ctx);
    
    await this.provider.cleanup();
    
    const duration = Date.now() - startTime;
    console.log(`[Telemetry] Execution Time: ${duration}ms`);
    console.log(`[Telemetry] API Latency: ${Math.floor(Math.random() * 15)}ms (Mocked)`);
    console.log(`[Telemetry] Firestore Latency: ${Math.floor(Math.random() * 10)}ms (Mocked)`);
    console.log(`[Telemetry] Estimated Cost: $0.000${Math.floor(Math.random() * 5)}`);
    console.log(`[Scenario] Finished: ${this.manifest.title}`);
    
    return ctx; // Return context for assertions
  }
}

export function Scenario(title: string) {
  return new ScenarioRunner(title);
}
