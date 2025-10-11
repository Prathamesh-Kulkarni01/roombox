import type { Guest } from './types';

interface ReminderResult {
  shouldSend: boolean;
  title: string;
  body: string;
}

const REMINDER_WINDOW = 3; // last 3 units or days

export function getReminderForGuest(guest: Guest, now: Date = new Date()): ReminderResult {
  const dueDate = new Date(guest.dueDate);

  // Skip reminders for paid or vacated tenants
  if (guest.rentStatus === 'paid' || guest.isVacated) {
    return { shouldSend: false, title: '', body: '' };
  }

  const diffMs = dueDate.getTime() - now.getTime(); // positive = upcoming
  const diffMinutes = Math.round(diffMs / (1000 * 60));
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  // -----------------------------
  // Overdue
  // -----------------------------
  if (diffMs < 0) {
    const overdueMinutes = Math.ceil(Math.abs(diffMinutes));
    const overdueHours = Math.ceil(Math.abs(diffHours));
    const overdueDays = Math.ceil(Math.abs(diffDays));

    let body = '';
    switch (guest.rentCycleUnit) {
      case 'minutes':
        body = `Hi ${guest.name}, your rent payment is ${overdueMinutes} minute(s) overdue. Please pay as soon as possible.`;
        break;
      case 'hours':
        body = `Hi ${guest.name}, your rent payment is ${overdueHours} hour(s) overdue. Please pay as soon as possible.`;
        break;
      case 'days':
        body = `Hi ${guest.name}, your rent payment is ${overdueDays} day(s) overdue. Please pay as soon as possible.`;
        break;
      case 'months':
        const monthsOverdue = Math.floor(overdueDays / (30 * guest.rentCycleValue));
        body = monthsOverdue > 0
          ? `Hi ${guest.name}, your rent payment is ${monthsOverdue} month(s) overdue. Please pay as soon as possible.`
          : `Hi ${guest.name}, your rent payment is ${overdueDays} day(s) overdue. Please pay as soon as possible.`;
        break;
    }
    return { shouldSend: true, title: 'Overdue', body };
  }

  // -----------------------------
  // Upcoming / Due today
  // -----------------------------
  let shouldSend = false;
  let body = '';

  switch (guest.rentCycleUnit) {
    case 'minutes':
      if (diffMinutes <= REMINDER_WINDOW) shouldSend = true;
      body = `Hi ${guest.name}, your rent is due in ${Math.max(1, diffMinutes)} minute(s).`;
      break;
    case 'hours':
      if (diffHours <= REMINDER_WINDOW) shouldSend = true;
      body = `Hi ${guest.name}, your rent is due in ${Math.max(1, diffHours)} hour(s).`;
      break;
    case 'days':
      if (diffDays <= REMINDER_WINDOW) shouldSend = true;
      body = `Hi ${guest.name}, your rent is due in ${Math.max(1, diffDays)} day(s).`;
      break;
    case 'months':
      // For monthly cycle, send reminders in last 3 days before due
      if (diffDays <= REMINDER_WINDOW) shouldSend = true;
      body = `Hi ${guest.name}, your rent is due in ${Math.max(1, diffDays)} day(s).`;
      break;
  }

  if (!shouldSend) return { shouldSend: false, title: '', body: '' };

  return { shouldSend: true, title: 'Gentle Reminder', body };
}
