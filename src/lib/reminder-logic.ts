
'use server';

import type { Guest, RentCycleUnit } from './types';
import { format, parseISO, differenceInDays, differenceInMinutes, differenceInHours, isPast } from 'date-fns';

interface ReminderInfo {
  shouldSend: boolean;
  title: string;
  body: string;
}


export function getReminderForGuest(guest: Guest, now: Date): ReminderInfo {
    if (!guest.userId || guest.isVacated || guest.rentStatus === 'paid') {
        return { shouldSend: false, title: '', body: '' };
    }

    const dueDate = parseISO(guest.dueDate);
    
    // --- Overdue Reminders Logic ---
    if (isPast(dueDate)) {
        let diff: number;
        let unit: string;

        switch (guest.rentCycleUnit) {
            case 'minutes':
                diff = differenceInMinutes(now, dueDate);
                unit = 'minute(s)';
                break;
            case 'hours':
                 diff = differenceInHours(now, dueDate);
                 unit = 'hour(s)';
                 break;
            default: // Default to days for 'days', 'weeks', 'months'
                diff = differenceInDays(now, dueDate);
                unit = 'day(s)';
        }
        
        // This was the source of the bug. A positive difference means it's overdue.
        if (diff <= 0) {
            return { shouldSend: false, title: '', body: '' };
        }
        
        return {
            shouldSend: true,
            title: 'Action Required: Your Rent is Overdue',
            body: `Hi ${guest.name}, your rent payment is ${diff} ${unit} overdue. Please pay as soon as possible.`
        };
    }

    // --- Upcoming Reminders Logic ---
    let diff: number;
    let unit: string;

    switch (guest.rentCycleUnit) {
        case 'minutes':
            diff = differenceInMinutes(dueDate, now);
            unit = 'minute(s)';
            break;
        case 'hours':
            diff = differenceInHours(dueDate, now);
            unit = 'hour(s)';
            break;
        default:
            diff = differenceInDays(dueDate, now);
            unit = 'day(s)';
    }
    
    // Only send upcoming reminders if they are within a reasonable window (e.g., 5 days)
    // and the time difference is positive.
    if (diff >= 0 && differenceInDays(dueDate, now) <= 5) {
         const dayText = diff === 0 ? 'today' : `in ${diff} ${unit} on ${format(dueDate, 'do MMM')}`;

         return {
            shouldSend: true,
            title: 'Gentle Reminder: Your Rent is Due Soon',
            body: `Hi ${guest.name}, a friendly reminder that your rent is due ${dayText}.`
        };
    }

    // No reminder needed if it's too far in the future
    return { shouldSend: false, title: '', body: '' };
}
