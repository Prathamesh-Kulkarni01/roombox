
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
    if (absoluteMinutes < 60) {
        return `${absoluteMinutes} minute(s)`;
    }
    const hours = Math.floor(absoluteMinutes / 60);
    if (hours < 24) {
        return `${hours} hour(s)`;
    }
    const days = Math.floor(hours / 24);
    return `${days} day(s)`;
}

export function getReminderForGuest(guest: Guest, now: Date): ReminderInfo {
    if (!guest.userId || guest.isVacated || guest.rentStatus === 'paid') {
        return { shouldSend: false, title: '', body: '' };
    }

    const dueDate = parseISO(guest.dueDate);
    
    if (isPast(dueDate)) {
        const minutesOverdue = differenceInMinutes(now, dueDate);
        const durationText = getHumanReadableDuration(minutesOverdue);
        return {
            shouldSend: true,
            title: 'Action Required: Your Rent is Overdue',
            body: `Hi ${guest.name}, your rent payment is ${durationText} overdue. Please pay as soon as possible.`
        };
    }

    const minutesUntilDue = differenceInMinutes(dueDate, now);

    // Upcoming Reminders Logic
    switch (guest.rentCycleUnit) {
        case 'minutes':
            if (minutesUntilDue >= 0 && minutesUntilDue <= 5) {
                return {
                    shouldSend: true,
                    title: 'Gentle Reminder: Your Rent is Due Soon',
                    body: `Hi ${guest.name}, a friendly reminder that your rent is due in ${minutesUntilDue} minute(s).`
                };
            }
            break;
        case 'hours':
            const hoursUntilDue = Math.ceil(minutesUntilDue / 60);
             if (hoursUntilDue >= 0 && hoursUntilDue <= 3) {
                const hourText = hoursUntilDue === 0 ? 'in less than an hour' : `in ${hoursUntilDue} hour(s)`;
                return {
                    shouldSend: true,
                    title: 'Gentle Reminder: Your Rent is Due Soon',
                    body: `Hi ${guest.name}, a friendly reminder that your rent is due ${hourText}.`
                };
            }
            break;
        default: // days, weeks, months
            const daysUntilDue = Math.ceil(minutesUntilDue / (60 * 24));
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

    // No reminder needed
    return { shouldSend: false, title: '', body: '' };
}

    