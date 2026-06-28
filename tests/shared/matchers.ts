import { expect } from 'vitest';

expect.extend({
  toBeFinanciallyEqual(received: number, expected: number) {
    // Floating point math often breaks on decimals in JS (e.g. 0.1 + 0.2)
    // This matcher allows a 0.01 tolerance (1 cent)
    const pass = Math.abs(received - expected) < 0.01;
    if (pass) {
      return {
        message: () => `expected ${received} not to be financially equal to ${expected}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be financially equal to ${expected}`,
        pass: false,
      };
    }
  },
});
