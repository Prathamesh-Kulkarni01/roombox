
import type { Guest, RentCycleUnit } from './types';
import { format, parseISO, isPast, differenceInMinutes } from 'date-fns';

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
    const minutesDifference = differenceInMinutes(dueDate, now);

    // Overdue Logic
    if (minutesDifference < 0) {
        const minutesOverdue = Math.abs(minutesDifference);
        if (minutesOverdue >= 1) { // Only send if at least 1 minute overdue
             return {
                shouldSend: true,
                title: 'Action Required: Your Rent is Overdue',
                body: `Hi ${guest.name}, your rent payment is ${getHumanReadableDuration(minutesOverdue)} overdue. Please complete the payment as soon as possible.`
            };
        }
    } else { // Upcoming Reminder Logic
      const rentCycleUnit: RentCycleUnit = guest.rentCycleUnit || 'months';
      let shouldSendReminder = false;
      let timeUntilDue = '';

      switch (rentCycleUnit) {
          case 'minutes':
              const minutesUntilDue = Math.ceil(minutesDifference);
              if (minutesUntilDue > 0 && minutesUntilDue <= 5) {
                  shouldSendReminder = true;
                  timeUntilDue = `${minutesUntilDue} minute(s)`;
              }
              break;
          case 'hours':
              const hoursUntilDue = Math.ceil(minutesDifference / 60);
               if (hoursUntilDue > 0 && hoursUntilDue <= 3) {
                  shouldSendReminder = true;
                  timeUntilDue = `${hoursUntilDue} hour(s)`;
              }
              break;
          case 'days':
          case 'weeks':
          case 'months':
          default:
              const daysUntilDue = Math.ceil(minutesDifference / 1440);
               if (daysUntilDue > 0 && daysUntilDue <= 5) {
                  shouldSendReminder = true;
                  timeUntilDue = `${daysUntilDue} day(s) on ${format(dueDate, 'do MMM')}`;
              }
              break;
      }

      if (shouldSendReminder) {
          return {
              shouldSend: true,
              title: `Gentle Reminder: Your Rent is Due Soon`,
              body: `Hi ${guest.name}, a friendly reminder that your rent is due in ${timeUntilDue}.`
          };
      }
    }

    return { shouldSend: false, title: '', body: '' };
}
