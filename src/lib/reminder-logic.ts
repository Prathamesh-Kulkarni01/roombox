
import type { Guest, RentCycleUnit } from './types';
import { format, parseISO, isPast, differenceInMinutes, differenceInDays } from 'date-fns';

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
    const isOverdue = isPast(dueDate);
    const minutesDifference = differenceInMinutes(dueDate, now);

    // --- Overdue Logic ---
    if (isOverdue) {
        const minutesOverdue = Math.abs(minutesDifference);
        // Only send if it's been at least a minute.
        if (minutesOverdue >= 1) { 
             return {
                shouldSend: true,
                title: 'Action Required: Your Rent is Overdue',
                body: `Hi ${guest.name}, your rent payment is ${getHumanReadableDuration(minutesOverdue)} overdue. Please complete the payment as soon as possible.`
            };
        }
    } 
    // --- Upcoming Reminder Logic ---
    else {
      const rentCycleUnit: RentCycleUnit = guest.rentCycleUnit || 'months';
      
      switch (rentCycleUnit) {
          case 'minutes':
              const minutesUntilDue = Math.ceil(minutesDifference);
              if (minutesUntilDue > 0 && minutesUntilDue <= 5) {
                  return {
                      shouldSend: true,
                      title: `Gentle Reminder: Your Rent is Due Soon`,
                      body: `Hi ${guest.name}, a friendly reminder that your rent is due in ${minutesUntilDue} minute(s).`
                  };
              }
              break;
          case 'hours':
              const hoursUntilDue = Math.ceil(minutesDifference / 60);
               if (hoursUntilDue > 0 && hoursUntilDue <= 3) {
                  return {
                      shouldSend: true,
                      title: `Gentle Reminder: Your Rent is Due Soon`,
                      body: `Hi ${guest.name}, a friendly reminder that your rent is due in ${hoursUntilDue} hour(s).`
                  };
              }
              break;
          case 'days':
          case 'weeks':
          case 'months':
          default:
              const daysUntilDue = differenceInDays(dueDate, now);
               if (daysUntilDue >= 0 && daysUntilDue <= 5) { // Use >= 0 to include same-day reminders
                  const dayText = daysUntilDue === 0 ? 'today' : `in ${daysUntilDue} day(s) on ${format(dueDate, 'do MMM')}`;
                  return {
                      shouldSend: true,
                      title: `Gentle Reminder: Your Rent is Due Soon`,
                      body: `Hi ${guest.name}, a friendly reminder that your rent is due ${dayText}.`
                  };
              }
              break;
      }
    }

    return { shouldSend: false, title: '', body: '' };
}
