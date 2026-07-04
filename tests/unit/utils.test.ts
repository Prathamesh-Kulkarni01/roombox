import { describe, it, expect } from 'vitest';
import { calculateProratedRent, getNextFixedCollectionDate } from '../../src/lib/utils';
import { addMonths, setDate } from 'date-fns';

describe('Prorated Rent Calculation', () => {
  it('should prorate correctly for 15th of a 30-day month', () => {
    // 30 day month: April 2024
    const moveInDate = new Date('2024-04-15T12:00:00Z');
    const monthlyRent = 3000;
    
    // Days in April = 30. Remaining days = (30 - 15) + 1 = 16.
    // Prorated = (3000 / 30) * 16 = 1600.
    expect(calculateProratedRent(monthlyRent, moveInDate)).toBe(1600);
  });

  it('should prorate correctly for 1st of a 31-day month', () => {
    // 31 day month: Jan 2024
    const moveInDate = new Date('2024-01-01T12:00:00Z');
    const monthlyRent = 3100;
    
    // Days in Jan = 31. Remaining days = (31 - 1) + 1 = 31.
    // Prorated = (3100 / 31) * 31 = 3100.
    expect(calculateProratedRent(monthlyRent, moveInDate)).toBe(3100);
  });

  it('should prorate correctly for 28th of a 28-day month (Feb)', () => {
    // 28 day month: Feb 2023
    const moveInDate = new Date('2023-02-28T12:00:00Z');
    const monthlyRent = 2800;
    
    // Days in Feb = 28. Remaining days = (28 - 28) + 1 = 1.
    // Prorated = (2800 / 28) * 1 = 100.
    expect(calculateProratedRent(monthlyRent, moveInDate)).toBe(100);
  });
});

describe('Next Fixed Collection Date Calculation', () => {
  it('should return next month 1st when move in is 15th and fixed is 1', () => {
    const moveInDate = new Date('2024-04-15T12:00:00Z');
    const nextDate = getNextFixedCollectionDate(moveInDate, 1);
    
    expect(nextDate.getMonth()).toBe(4); // May is month 4
    expect(nextDate.getDate()).toBe(1);
  });

  it('should return next month 5th when move in is 1st and fixed is 5', () => {
    const moveInDate = new Date('2024-01-01T12:00:00Z');
    const nextDate = getNextFixedCollectionDate(moveInDate, 5);
    
    expect(nextDate.getMonth()).toBe(1); // Feb
    expect(nextDate.getDate()).toBe(5);
  });

  it('should clamp to 28th for Feb if fixed day is 31', () => {
    const moveInDate = new Date('2023-01-15T12:00:00Z');
    const nextDate = getNextFixedCollectionDate(moveInDate, 31);
    
    expect(nextDate.getMonth()).toBe(1); // Feb
    expect(nextDate.getDate()).toBe(28); // Clamped to 28
  });
});
