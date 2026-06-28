type EventHandler = (time: number) => Promise<void>;

export class VirtualTimeEngine {
  private offsetMs = 0;
  private hooks: EventHandler[] = [];

  /**
   * Advances the virtual clock by a given duration string (e.g. "30d", "24h").
   */
  public async advance(durationStr: string) {
    const ms = this.parseDuration(durationStr);
    this.offsetMs += ms;
    console.log(`[VirtualTimeEngine] Time advanced by ${durationStr} (${ms}ms). Current Virtual Time: ${this.offsetMs}ms`);
    
    // Trigger scheduler hooks
    for (const hook of this.hooks) {
        await hook(this.offsetMs);
    }
  }

  public getTime(): number {
    return this.offsetMs;
  }
  
  public onTimeAdvanced(handler: EventHandler) {
      this.hooks.push(handler);
  }

  private parseDuration(durationStr: string): number {
    const val = parseInt(durationStr);
    if (durationStr.endsWith('d')) return val * 24 * 60 * 60 * 1000;
    if (durationStr.endsWith('h')) return val * 60 * 60 * 1000;
    if (durationStr.endsWith('m')) return val * 60 * 1000;
    if (durationStr.endsWith('s')) return val * 1000;
    return val;
  }
}
