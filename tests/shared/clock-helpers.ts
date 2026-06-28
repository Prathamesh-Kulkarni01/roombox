import { vi } from 'vitest';

export class ClockHelpers {
  static freezeTime(dateString: string) {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(dateString));
  }

  static advanceTime(ms: number) {
    vi.advanceTimersByTime(ms);
  }

  static resetTime() {
    vi.useRealTimers();
  }
}
