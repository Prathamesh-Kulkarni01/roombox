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
 * This function correctly handles end-of-month dates for monthly cycles and preserves the time for all cycles.
 * @param startDate The starting date of the cycle.
 * @param unit The unit of the rent cycle (e.g., 'months', 'days').
 * @param value The number of units in the cycle.
 * @param anchorDay The original day of the month for billing (only used for monthly cycles).
 * @returns The new calculated due date.
 */
export function calculateFirstDueDate(startDate: Date, unit: RentCycleUnit, value: number, anchorDay: number): Date {
    const addFn = {
        minutes: addMinutes,
        hours: addHours,
        days: addDays,
        weeks: addWeeks,
        months: addMonths,
    }[unit];

    if (unit === 'months') {
        const nextMonthBase = addMonths(startDate, value);
        const lastDayNextMonth = lastDayOfMonth(nextMonthBase).getDate();
        // If the original anchor day was something like the 31st, and the next month only has 30 days, use the 30th.
        const newDay = Math.min(anchorDay, lastDayNextMonth);
        return setDate(nextMonthBase, newDay);
    }
    
    // For all other units, simply add the value. This preserves the time component.
    return addFn(startDate, value);
};


/**
 * Provides a simple, actionable suggestion for common tenant complaints.
 * @param category The category of the complaint.
 * @returns A suggestion string or an empty string if no simple solution is obvious.
 */
export function getComplaintSuggestion(category: 'maintenance' | 'cleanliness' | 'wifi' | 'food' | 'other'): string {
    switch (category) {
        case 'wifi':
            return "Have you tried restarting the Wi-Fi router? Unplugging it for 30 seconds and plugging it back in often solves the issue.";
        case 'maintenance':
            return "For urgent issues like a major leak, please contact the manager directly. For minor issues like a flickering bulb, ensure it's tightly screwed in.";
        case 'cleanliness':
            return "Please let the cleaning staff know during their next scheduled round. For urgent spills, please inform the front desk.";
        default:
            return "";
    }
}
