
'use server';

import type { Guest } from './types';
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
        
        // Only send if at least one full unit of time has passed.
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
    let sendWindowDays: number;

    switch (guest.rentCycleUnit) {
        case 'minutes':
            diff = differenceInMinutes(dueDate, now);
            unit = 'minute(s)';
            sendWindowDays = 1; // e.g., reminders within the same day for minute-cycles
            break;
        case 'hours':
            diff = differenceInHours(dueDate, now);
            unit = 'hour(s)';
            sendWindowDays = 1; 
            break;
        default:
            diff = differenceInDays(dueDate, now);
            unit = 'day(s)';
            sendWindowDays = 5; // Standard 5-day window for daily/weekly/monthly cycles
    }
    
    // Only send upcoming reminders if they are within a reasonable window
    // and the time difference is positive.
    if (diff >= 0 && differenceInDays(dueDate, now) <= sendWindowDays) {
         const dayText = diff === 0 ? 'today' : `in ${diff} ${unit}`;

         return {
            shouldSend: true,
            title: 'Gentle Reminder: Your Rent is Due Soon',
            body: `Hi ${guest.name}, a friendly reminder that your rent is due ${dayText} on ${format(dueDate, 'do MMM')}.`
        };
    }

    // No reminder needed if it's too far in the future
    return { shouldSend: false, title: '', body: '' };
}
