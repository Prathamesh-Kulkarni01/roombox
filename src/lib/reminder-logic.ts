import type { Guest } from './types';

interface ReminderResult {
  shouldSend: boolean;
  type?: 'T-3' | 'T-1' | 'T0' | 'T+2';
  title: string;
  body: string;
}

export function getReminderForGuest(guest: Guest, now: Date = new Date()): ReminderResult {
  const dueDate = new Date(guest.dueDate);

  // Skip reminders for paid or vacated tenants
  if (guest.rentStatus === 'paid' || guest.isVacated) {
    return { shouldSend: false, title: '', body: '' };
  }

  const diffMs = dueDate.getTime() - now.getTime(); // positive = upcoming, negative = overdue
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  // For days, we want calendar days ideally, but Math.floor covers roughly 24h chunks
  // Offset by timezone safely by just using the absolute difference in days
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueMidnight = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
  const diffDays = Math.round((dueMidnight.getTime() - nowMidnight.getTime()) / (1000 * 60 * 60 * 24));

  let checkValue = diffDays;
  let unitString = 'day(s)';

  // Support for accelerated testing cycles
  if (guest.rentCycleUnit === 'hours') {
    checkValue = diffMinutes; // Hourly cycle -> Minute-based reminders
    unitString = 'minute(s)';
  } else if (guest.rentCycleUnit === 'days') {
    checkValue = diffHours; // Daily cycle -> Hour-based reminders
    unitString = 'hour(s)';
  } else if (guest.rentCycleUnit === 'minutes') {
    // This is for extreme acceleration if ever needed
    checkValue = diffMinutes;
    unitString = 'minute(s)';
  }

  // Exact Match Logic for RentSutra Automations: T-3, T-1, T0, T+2
  // Note: diffMs is positive for upcoming, negative for overdue.
  // So T-3 means checkValue === 3 (upcoming in 3 units)
  // T-1 means checkValue === 1
  // T0 means checkValue === 0
  // T+2 means checkValue === -2 (overdue by 2 units)

  let type: 'T-3' | 'T-1' | 'T0' | 'T+2' | undefined = undefined;
  let body = '';

  if (checkValue === 3) {
    type = 'T-3';
    body = `Hello ${guest.name},\nThis is a reminder that your rent for ${guest.pgName || 'your PG'} is coming up in 3 ${unitString}.\nDue Date: ${dueDate.toLocaleDateString()}\nPlease keep the amount ready.`;
  } else if (checkValue === 1) {
    type = 'T-1';
    body = `Hello ${guest.name},\nYour rent of ₹${guest.rentAmount} for ${guest.pgName || 'your PG'} is due *Tomorrow*.\nPlease pay on time to avoid late fees.`;
  } else if (checkValue === 0) {
    type = 'T0';
    body = `Hello ${guest.name},\nThis is a gentle reminder that your rent of ₹${guest.rentAmount} for ${guest.pgName || 'your PG'} is due *TODAY*.\nPlease pay using the link below.`;
  } else if (checkValue === -2) {
    type = 'T+2';
    body = `⚠️ Hello ${guest.name},\nYour rent payment is *2 ${unitString} overdue*.\nDue Date was: ${dueDate.toLocaleDateString()}.\nPlease clear your dues immediately.`;
  }

  if (type) {
    return {
      shouldSend: true,
      type,
      title: type === 'T+2' ? 'Overdue' : 'Rent Reminder',
      body
    };
  }

  return { shouldSend: false, title: '', body: '' };
}
