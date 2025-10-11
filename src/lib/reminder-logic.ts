
'use server';

import type { Guest } from './types';
import { format, parseISO, differenceInMinutes, isPast } from 'date-fns';

interface ReminderInfo {
  shouldSend: boolean;
  title: string;
  body: string;
}

function getHumanReadableDuration(totalMinutes: number): { value: number; unit: string } {
    if (totalMinutes >= 24 * 60) {
        const days = Math.floor(totalMinutes / (24 * 60));
        return { value: days, unit: 'day(s)' };
    }
    if (totalMinutes >= 60) {
        const hours = Math.floor(totalMinutes / 60);
        return { value: hours, unit: 'hour(s)' };
    }
    return { value: totalMinutes, unit: 'minute(s)' };
}

export function getReminderForGuest(guest: Guest, now: Date): ReminderInfo {
    if (!guest.userId || guest.isVacated || guest.rentStatus === 'paid') {
        return { shouldSend: false, title: '', body: '' };
    }

    const dueDate = parseISO(guest.dueDate);
    const totalMinutesDifference = differenceInMinutes(dueDate, now);

    // --- Overdue Reminders Logic ---
    if (totalMinutesDifference < 0) {
        const minutesOverdue = Math.abs(totalMinutesDifference);
        
        // Don't send if it's less than a minute overdue
        if (minutesOverdue < 1) {
            return { shouldSend: false, title: '', body: '' };
        }

        const duration = getHumanReadableDuration(minutesOverdue);
        
        return {
            shouldSend: true,
            title: 'Action Required: Your Rent is Overdue',
            body: `Hi ${guest.name}, your rent payment is ${duration.value} ${duration.unit} overdue. Please pay as soon as possible.`
        };
    }

    // --- Upcoming Reminders Logic ---
    const minutesUntilDue = totalMinutesDifference;
    
    // Set a reasonable window for upcoming reminders (e.g., 5 days for monthly cycles)
    const upcomingWindowMinutes = {
        months: 5 * 24 * 60,
        weeks: 3 * 24 * 60,
        days: 2 * 24 * 60,
        hours: 120, // 2 hours
        minutes: 10, // 10 minutes
    }[guest.rentCycleUnit || 'months'];
    
    if (minutesUntilDue >= 0 && minutesUntilDue <= upcomingWindowMinutes) {
         const duration = getHumanReadableDuration(minutesUntilDue);
         const dayText = minutesUntilDue === 0 ? 'today' : `in ${duration.value} ${duration.unit}`;

         return {
            shouldSend: true,
            title: 'Gentle Reminder: Your Rent is Due Soon',
            body: `Hi ${guest.name}, a friendly reminder that your rent is due ${dayText} on ${format(dueDate, 'do MMM')}.`
        };
    }

    // No reminder needed if it's too far in the future
    return { shouldSend: false, title: '', body: '' };
}
