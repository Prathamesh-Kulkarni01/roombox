/**
 * Structured logger for recording the execution timeline of scenarios.
 * Outputs are guaranteed deterministic if time is frozen.
 */
export class ScenarioLogger {
  private events: { time: Date; action: string; metadata?: any }[] = [];

  log(action: string, metadata?: any) {
    this.events.push({
      time: new Date(), // Could use FrameworkClock.now() if desired
      action,
      metadata
    });
  }

  getTimeline() {
    return this.events;
  }

  printTimeline() {
    console.log('\n--- Scenario Execution Timeline ---');
    this.events.forEach((e) => {
      console.log(`[${e.time.toISOString()}] ${e.action}`, e.metadata || '');
    });
    console.log('-----------------------------------\n');
  }
}
