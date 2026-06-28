import { FrameworkClock } from '@/framework/utils/FrameworkClock';

/**
 * Controller to freeze and manipulate time during testing using FrameworkClock.
 */
export class TimeController {
  static freeze(dateString: string) {
    FrameworkClock.freeze(dateString);
  }

  static advanceDays(days: number) {
    FrameworkClock.advance(days);
  }

  static reset() {
    FrameworkClock.reset();
  }
}
