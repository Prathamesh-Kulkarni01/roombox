/**
 * FrameworkClock acts as the central time provider for RentSutra.
 * 
 * In production, this falls back to real time.
 * In testing and simulation (RentLab), this can be frozen or advanced
 * to deterministically verify billing, ledgers, and schedulers.
 */
export class FrameworkClock {
  private static frozenTime: Date | null = null;

  static now(): Date {
    if (this.frozenTime) {
      return new Date(this.frozenTime.getTime());
    }
    return new Date();
  }

  static freeze(date: string | Date): void {
    this.frozenTime = typeof date === 'string' ? new Date(date) : date;
  }

  static advance(days: number): void {
    if (!this.frozenTime) {
      throw new Error('Cannot advance time unless clock is frozen.');
    }
    this.frozenTime.setDate(this.frozenTime.getDate() + days);
  }

  static reset(): void {
    this.frozenTime = null;
  }
}
