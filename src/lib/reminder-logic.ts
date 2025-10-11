
'use server';

import type { Guest, RentCycleUnit } from './types';
import { format, parseISO, differenceInDays, differenceInMinutes, differenceInHours, isPast } from 'date-fns';

interface ReminderInfo {
  shouldSend: boolean;
  title: string;
  body: string;
}

function getHumanReadableDuration(minutes: number): string {
    const absoluteMinutes = Math.abs(minutes);
    const days = Math.floor(absoluteMinutes / 1440);
    const hours = Math.floor((absoluteMinutes % 1440) / 60);
    const mins = absoluteMinutes % 60;

    if (days > 0) {
        return `${days} day(s)`;
    }
    if (hours > 0) {
        return `${hours} hour(s)`;
    }
    return `${mins} minute(s)`;
}

export function getReminderForGuest(guest: Guest, now: Date): ReminderInfo {
    if (!guest.userId || guest.isVacated || guest.rentStatus === 'paid') {
        return { shouldSend: false, title: '', body: '' };
    }

    const dueDate = parseISO(guest.dueDate);
    
    if (isPast(dueDate)) {
        const minutesOverdue = differenceInMinutes(now, dueDate);
        // Only send if it's been at least a minute
        if (minutesOverdue < 1) return { shouldSend: false, title: '', body: '' };
        
        const durationText = getHumanReadableDuration(minutesOverdue);
        return {
            shouldSend: true,
            title: 'Action Required: Your Rent is Overdue',
            body: `Hi ${guest.name}, your rent payment is ${durationText} overdue. Please pay as soon as possible.`
        };
    }

    // Upcoming Reminders Logic
    const minutesUntilDue = differenceInMinutes(dueDate, now);
    const daysUntilDue = Math.ceil(minutesUntilDue / (60 * 24));

    if (daysUntilDue <= 5) {
         const durationText = getHumanReadableDuration(minutesUntilDue);
         const dayText = daysUntilDue === 0 ? 'today' : `in ${durationText} on ${format(dueDate, 'do MMM')}`;

         return {
            shouldSend: true,
            title: 'Gentle Reminder: Your Rent is Due Soon',
            body: `Hi ${guest.name}, a friendly reminder that your rent is due ${dayText}.`
        };
    }


    // No reminder needed
    return { shouldSend: false, title: '', body: '' };
}
