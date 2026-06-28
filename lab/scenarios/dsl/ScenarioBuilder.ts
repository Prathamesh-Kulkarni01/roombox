import { PlatformProvider } from "../../core/engine/PlatformProvider";
import { WorldBuilderContext } from "../../world/WorldBuilder";
import { globalEventStream } from "../../validation/EventStream";

export class ScenarioRunner {
  private title: string;
  private provider: PlatformProvider | null = null;
  private worldContext: WorldBuilderContext | null = null;
  private executeFn: ((world: WorldBuilderContext, provider: PlatformProvider) => Promise<void>) | null = null;
  private expectedEvents: string[] = [];

  constructor(title: string) {
    this.title = title;
  }

  public on(provider: PlatformProvider) {
    this.provider = provider;
    return this;
  }

  public withAPI() {
    // sets execution mode
    return this;
  }

  public setup(world: WorldBuilderContext) {
    this.worldContext = world.build();
    return this;
  }

  public execute(fn: (world: WorldBuilderContext, provider: PlatformProvider) => Promise<void>) {
    this.executeFn = fn;
    return this;
  }

  public expectEvents(events: string[]) {
    this.expectedEvents = events;
    return this;
  }

  public async run() {
    console.log(`[Scenario] Starting: ${this.title}`);
    if (!this.provider) throw new Error("No provider specified");
    if (!this.worldContext) throw new Error("No world setup specified");
    
    globalEventStream.clear();
    await this.provider.initialize();
    
    if (this.executeFn) {
      await this.executeFn(this.worldContext, this.provider);
    }
    
    if (this.expectedEvents.length > 0) {
      globalEventStream.expectEvents(this.expectedEvents);
      console.log(`[Scenario] ✔️ Verified events: ${this.expectedEvents.join(" -> ")}`);
    }
    
    await this.provider.teardown();
    console.log(`[Scenario] Finished: ${this.title}`);
  }
}

export function Scenario(title: string) {
  return new ScenarioRunner(title);
}
