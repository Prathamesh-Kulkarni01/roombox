import { PlatformProvider } from "../../core/engine/PlatformProvider";
import { WorldBuilderContext } from "../../world/WorldBuilder";
import { EventStream } from "../../validation/EventStream";
import { InvariantEngine } from "../../validation/invariants/InvariantEngine";
import { ExecutionContext } from "../../core/engine/ExecutionContext";
import { VirtualTimeEngine } from "../../core/time/VirtualTimeEngine";

interface ScenarioManifest {
  title: string;
  requirements: string[];
  executionMode: "API" | "UI" | "Hybrid";
  tags: string[];
  expectedTime: string;
}

export class ScenarioRunner {
  private manifest: ScenarioManifest;
  private provider: PlatformProvider | null = null;
  private worldContext: WorldBuilderContext | null = null;
  private executeFn: ((ctx: ExecutionContext) => Promise<void>) | null = null;
  private expectedEvents: string[] = [];

  constructor(title: string) {
    this.manifest = {
      title,
      requirements: [],
      executionMode: "API",
      tags: [],
      expectedTime: "<5s"
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

    // Use provider factory if the provider implements a construct mechanism (in real app)
    // For now, inject the event stream directly into our mock provider for testing
    if ((this.provider as any).eventStream !== undefined) {
       (this.provider as any).eventStream = eventStream;
    }
    
    await this.provider.initialize();
    
    if (this.executeFn) {
      await this.executeFn(ctx);
    }
    
    if (this.expectedEvents.length > 0) {
      ctx.eventStream.expectEvents(this.expectedEvents);
      console.log(`[Scenario] ✔️ Verified events: ${this.expectedEvents.join(" -> ")}`);
    }
    
    ctx.invariants.verifyAll(ctx);
    
    await this.provider.cleanup();
    
    const duration = Date.now() - startTime;
    console.log(`[Metrics] Execution Time: ${duration}ms`);
    console.log(`[Scenario] Finished: ${this.manifest.title}`);
  }
}

export function Scenario(title: string) {
  return new ScenarioRunner(title);
}
