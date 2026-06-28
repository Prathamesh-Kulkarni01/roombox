export class VirtualTimeEngine {
  private offsetMs = 0;

  /**
   * Advances the virtual clock by a given duration string (e.g. "30d", "24h").
   */
  public async advance(durationStr: string) {
    const ms = this.parseDuration(durationStr);
    this.offsetMs += ms;
    console.log(`[VirtualTimeEngine] Time advanced by ${durationStr} (${ms}ms)`);
    // In real implementation, this would trigger crons and queues here.
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

export const virtualTime = new VirtualTimeEngine();
