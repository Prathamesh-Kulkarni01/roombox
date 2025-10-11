import type { Guest, RentCycleUnit } from './types';
import { format, parseISO, differenceInDays, differenceInMinutes, differenceInHours } from 'date-fns';

interface ReminderInfo {
  shouldSend: boolean;
  title: string;
  body: string;
}

function getHumanReadableDuration(minutes: number): string {
    const positiveMinutes = Math.abs(Math.ceil(minutes));
    if (positiveMinutes < 1) return "just now";
    if (positiveMinutes < 60) return `${positiveMinutes} minute(s)`;
    
    const hours = Math.floor(positiveMinutes / 60);
    if (hours < 24) {
        const remainingMinutes = positiveMinutes % 60;
        return `${hours} hour(s)${remainingMinutes > 0 ? ` and ${remainingMinutes} minute(s)` : ''}`;
    }

    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days} day(s)${remainingHours > 0 ? ` and ${remainingHours} hour(s)` : ''}`;
}

export function getReminderForGuest(guest: Guest, now: Date): ReminderInfo {
    if (!guest.userId || guest.isVacated || guest.rentStatus === 'paid') {
        return { shouldSend: false, title: '', body: '' };
    }

    const dueDate = parseISO(guest.dueDate);
    const rentCycleUnit: RentCycleUnit = guest.rentCycleUnit || 'months';

    const isOverdue = now.getTime() > dueDate.getTime();

    // Helper to get overdue duration string
    const getOverdueText = () => {
        switch (rentCycleUnit) {
            case 'minutes': {
                const minutesOverdue = Math.max(1, differenceInMinutes(now, dueDate));
                return `${minutesOverdue} minute(s)`;
            }
            case 'hours': {
                const hoursOverdue = Math.max(1, differenceInHours(now, dueDate));
                return `${hoursOverdue} hour(s)`;
            }
            default: {
                const daysOverdue = Math.max(1, differenceInDays(now, dueDate));
                return `${daysOverdue} day(s)`;
            }
        }
    };

    // --- OVERDUE ---
    if (isOverdue) {
        return {
            shouldSend: true,
            title: 'Action Required: Your Rent is Overdue',
            body: `Hi ${guest.name}, your rent payment is ${getOverdueText()} overdue. Please pay as soon as possible.`
        };
    }

    // --- UPCOMING ---
    switch (rentCycleUnit) {
        case 'minutes': {
            const minutesUntilDue = differenceInMinutes(dueDate, now);
            if (minutesUntilDue > 0 && minutesUntilDue <= 5) {
                return {
                    shouldSend: true,
                    title: 'Gentle Reminder: Your Rent is Due Soon',
                    body: `Hi ${guest.name}, a friendly reminder that your rent is due in ${minutesUntilDue} minute(s).`
                };
            }
            break;
        }
        case 'hours': {
            const hoursUntilDue = differenceInHours(dueDate, now);
            if (hoursUntilDue > 0 && hoursUntilDue <= 3) {
                return {
                    shouldSend: true,
                    title: 'Gentle Reminder: Your Rent is Due Soon',
                    body: `Hi ${guest.name}, a friendly reminder that your rent is due in ${hoursUntilDue} hour(s).`
                };
            }
            break;
        }
        default: {
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

    return { shouldSend: false, title: '', body: '' };
}