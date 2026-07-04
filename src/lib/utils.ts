import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { addMinutes, addHours, addDays, addWeeks, addMonths, setDate, lastDayOfMonth } from 'date-fns';
import { plans, PRICING_CONFIG } from "./constants";
import type { RentCycleUnit, LowBalanceStage, User } from "./types";

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
 * Calculates the pro-rated rent for the remaining days of a month.
 * @param monthlyRent The full monthly rent amount.
 * @param moveInDate The date the tenant moved in.
 * @returns The pro-rated rent amount (rounded to nearest integer).
 */
export function calculateProratedRent(monthlyRent: number, moveInDate: Date): number {
  if (!monthlyRent || monthlyRent <= 0) return 0;
  
  const year = moveInDate.getFullYear();
  const month = moveInDate.getMonth();
  // Get the last day of the month by getting the 0th day of the NEXT month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const currentDay = moveInDate.getDate();
  
  // E.g., if move in on 15th, and month has 30 days. They stay for 15th, 16th... 30th = 16 days.
  // Formula: (daysInMonth - currentDay) + 1
  const remainingDays = (daysInMonth - currentDay) + 1;
  
  const proratedAmount = (monthlyRent / daysInMonth) * remainingDays;
  return Math.round(proratedAmount);
}

/**
 * Calculates the next due date based on a fixed collection day.
 * If the current day is already past the collection day, it moves to the next month.
 */
export function getNextFixedCollectionDate(moveInDate: Date, fixedDay: number): Date {
  const currentDay = moveInDate.getDate();
  // If we move in on or before the fixed day (e.g. move in on 1st, fixed day is 1st),
  // should the first payment cover the CURRENT month, and next due date is NEXT month?
  // Yes, because the prorated rent covers the remainder of this month.
  // The NEXT due date is ALWAYS the fixed day of the NEXT month (if prorated).
  // E.g. Move in 15th Jan, next due is 1st Feb.
  // E.g. Move in 1st Jan, prorated = full month, next due is 1st Feb.
  
  const nextMonth = addMonths(moveInDate, 1);
  const lastDayNextMonth = lastDayOfMonth(nextMonth).getDate();
  const safeDay = Math.min(fixedDay, lastDayNextMonth);
  
  return setDate(nextMonth, safeDay);
}


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
/**
 * Parses a date string in DD/MM/YYYY format or "today" into a Date object.
 * Returns null if the format is invalid or the date is non-existent.
 */
export function parseDateString(input: string): Date | null {
  if (!input) return null;
  const clean = input.trim().toLowerCase();

  if (clean === 'today') return new Date();

  // Match DD/MM/YYYY or D/M/YYYY
  const match = clean.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (!match) return null;

  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1; // 0-indexed months
  const year = parseInt(match[3], 10);

  const date = new Date(year, month, day);

  // Validate if the date is real (e.g., prevent 31/02/2026)
  if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
    return date;
  }

  return null;
}

/**
 * Resolves the effective owner ID for data fetching and management.
 * For Owners and Admins, this is their own ID. 
 * For Staff/Managers/Tenants, this is the ID of their employer (ownerId).
 */
export function getEffectiveOwnerId(user: { id: string; role: string; ownerId?: string } | null | undefined): string | null {
  if (!user) return null;
  if (user.role === 'owner' || user.role === 'admin') return user.id;
  return user.ownerId || null;
}

/**
 * Categorizes the wallet balance into stages (normal, warning, risk, restricted).
 */
export function calculateLowBalanceStage(balance: number): LowBalanceStage {
  if (isNaN(balance) || balance <= PRICING_CONFIG.lowBalance.restrictedThreshold) return 'restricted';
  if (balance <= PRICING_CONFIG.lowBalance.riskThreshold) return 'risk';
  if (balance <= PRICING_CONFIG.lowBalance.warningThreshold) return 'warning';
  return 'normal';
}


export const getCurrentPlan = (currentUser: User | null) => {
    if (!currentUser || !currentUser.subscription) {
        return plans['trial'];
    }

    const planId = currentUser.subscription.planId;
    const plan = plans[planId as keyof typeof plans] || plans['monthly'] || plans['trial'];
    return plan;
}

/**
 * Gets the effective tenant limit for a user, checking custom overrides first,
 * then falling back to the standard plan limit.
 */
export function getEffectiveTenantLimit(user: User | null | undefined, planId?: string): number | 'unlimited' {
  // If user has a custom override, use it (specifically useful for trial extensions or custom deals)
  if (user?.subscription?.trialTenantLimit !== undefined) {
    return user.subscription.trialTenantLimit;
  }
  
  // Otherwise, use the standard limits mapped to the plan (defaults to free)
  const effectivePlanId = planId || user?.subscription?.planId || 'free';
  
  // We dynamically import getPlanLimit or just replicate the lookup here to avoid circular dependencies
  // Actually, planLimitsConfig is in permissions.ts. Let's just import it at the top of the file, or handle it here if it causes a circular dependency.
  // Wait, utils.ts is already importing plans from constants.ts. 
  // For safety against circular dependencies, we can just use the plans object directly.
  const plan = plans[effectivePlanId as keyof typeof plans];
  if (plan && plan.tenantLimit !== undefined) {
    return plan.tenantLimit;
  }
  
  // Hard fallback for free tier if not in plans object
  if (effectivePlanId === 'free') return 20;
  
  return 'unlimited';
}

/**
 * Helper to construct the redirection URL for a specific subdomain.
 * If targetRole is 'tenant' and a subdomain is provided, redirects to the subdomain.
 * If targetRole is NOT 'tenant' (e.g. owner, staff), redirects to the root host (apex domain) without subdomain.
 */
export function getRedirectUrlForSubdomain(
  targetRole: string,
  subdomain: string | null,
  targetPath: string
): string {
  if (typeof window === 'undefined') return targetPath;

  const hostname = window.location.hostname;
  const port = window.location.port;
  const protocol = window.location.protocol;

  const rootDomains = [
    'dev.rentsutra.in',
    'staging.rentsutra.in',
    'preview.rentsutra.in',
    'dev.roombox.in',
    'staging.roombox.in',
    'roombox.in',
    'rentsutra.in',
    'localhost',
    '127.0.0.1'
  ];

  // Find which root domain the current hostname ends with
  let matchedRoot = '';
  for (const domain of rootDomains) {
    if (hostname === domain || hostname.endsWith('.' + domain)) {
      matchedRoot = domain;
      break;
    }
  }

  // If no matched root, check Vercel preview domains
  if (!matchedRoot) {
    if (hostname.endsWith('.vercel.app')) {
      matchedRoot = 'vercel.app';
    } else {
      matchedRoot = hostname; // fallback
    }
  }

  let targetHost = matchedRoot;
  if (targetRole === 'tenant' && subdomain) {
    targetHost = `${subdomain}.${matchedRoot}`;
  }

  if (port) {
    targetHost = `${targetHost}:${port}`;
  }

  return `${protocol}//${targetHost}${targetPath}`;
}