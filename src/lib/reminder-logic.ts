
'use server';

import type { Guest, RentCycleUnit } from './types';
import { format, parseISO, differenceInDays, differenceInMinutes, differenceInHours, isPast } from 'date-fns';

interface ReminderInfo {
  shouldSend: boolean;
  title: string;
  body: string;
}

/**
 * A pure function to determine if a reminder should be sent for a guest and what the content should be.
 * @param guest The guest object.
 * @param now The current date to compare against.
 * @returns An object indicating if a reminder should be sent and the reminder content.
 */
export function getReminderForGuest(guest: Guest, now: Date): ReminderInfo {
    // --- Basic Exclusions ---
    if (!guest.userId || guest.isVacated || guest.rentStatus === 'paid') {
        return { shouldSend: false, title: '', body: '' };
    }

    const dueDate = parseISO(guest.dueDate);
    const rentCycleUnit: RentCycleUnit = guest.rentCycleUnit || 'months'; // Default to months

    // --- Overdue Reminders ---
    if (isPast(dueDate)) {
        let overdueText = '';
        switch (rentCycleUnit) {
            case 'minutes':
                overdueText = `${Math.max(1, differenceInMinutes(now, dueDate))} minute(s)`;
                break;
            case 'hours':
                 overdueText = `${Math.max(1, differenceInHours(now, dueDate))} hour(s)`;
                 break;
            default: // days, weeks, months
                overdueText = `${Math.max(1, differenceInDays(now, dueDate))} day(s)`;
                break;
        }
        return {
            shouldSend: true,
            title: 'Action Required: Your Rent is Overdue',
            body: `Hi ${guest.name}, your rent payment is ${overdueText} overdue. Please pay as soon as possible.`
        };
    }

    // --- Upcoming Reminders ---
    switch (rentCycleUnit) {
        case 'minutes': {
            const minutesUntilDue = differenceInMinutes(dueDate, now);
            if (minutesUntilDue >= 0 && minutesUntilDue <= 5) {
                const minuteText = minutesUntilDue === 0 ? 'now' : `in ${minutesUntilDue} minute(s)`;
                return {
                    shouldSend: true,
                    title: 'Gentle Reminder: Your Rent is Due Soon',
                    body: `Hi ${guest.name}, a friendly reminder that your rent is due ${minuteText}.`
                };
            }
            break;
        }
        case 'hours': {
            const hoursUntilDue = differenceInHours(dueDate, now);
            if (hoursUntilDue >= 0 && hoursUntilDue <= 3) {
                 const hourText = hoursUntilDue === 0 ? 'in less than an hour' : `in ${hoursUntilDue} hour(s)`;
                return {
                    shouldSend: true,
                    title: 'Gentle Reminder: Your Rent is Due Soon',
                    body: `Hi ${guest.name}, a friendly reminder that your rent is due ${hourText}.`
                };
            }
            break;
        }
        default: { // days, weeks, months
            const daysUntilDue = differenceInDays(dueDate, now);
            if (daysUntilDue >= 0 && daysUntilDue <= 5) {
                const dayText = daysUntilDue === 0 ? 'today' : `in ${daysUntilDue} day(s) on ${format(dueDate, 'do MMM')}`;
                return {
                    shouldSend: true,
                    title: 'Gentle Reminder: Your Rent is Due Soon',
                    body: `Hi ${guest.name}, a friendly reminder that your rent is due ${dayText}.`
                };
            }
            break;
        }
    }

    // --- No Reminder Needed ---
    return { shouldSend: false, title: '', body: '' };
}
