import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { addMinutes, addHours, addDays, addWeeks, addMonths, setDate, lastDayOfMonth } from 'date-fns';
import type { RentCycleUnit } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Recursively removes properties with `undefined` values from an object.
 * This is crucial for preparing data to be sent to Firestore, which does not support `undefined`.
 * @param obj The object to clean.
 * @returns A new object with all `undefined` properties removed.
 */
export function sanitizeObjectForFirebase(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObjectForFirebase(item));
  }

  const newObj: { [key: string]: any } = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      if (value !== undefined) {
        newObj[key] = sanitizeObjectForFirebase(value);
      }
    }
  }
  return newObj;
}

/**
 * Calculates the next due date based on a start date, cycle, and anchor day.
 * This function correctly handles end-of-month dates to prevent date drift.
 * @param startDate The starting date of the cycle.
 * @param unit The unit of the rent cycle (e.g., 'months', 'days').
 * @param value The number of units in the cycle.
 * @param anchorDay The original day of the month for billing.
 * @returns The new calculated due date.
 */
export function calculateFirstDueDate(startDate: Date, unit: RentCycleUnit, value: number, anchorDay: number): Date {
    const addFn = {
        months: addMonths,
        weeks: addWeeks,
        days: addDays,
        hours: addHours,
        minutes: addMinutes,
    }[unit];

    if (unit === 'months') {
        const nextMonth = addMonths(startDate, value);
        const lastDayNextMonth = lastDayOfMonth(nextMonth).getDate();
        // If the original anchor day was something like the 31st, and the next month only has 30 days, use the 30th.
        const newDay = Math.min(anchorDay, lastDayNextMonth);
        return setDate(nextMonth, newDay);
    }
    
    return addFn(startDate, value);
};
