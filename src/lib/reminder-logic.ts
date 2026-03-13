import type { Guest } from './types';

interface ReminderResult {
  shouldSend: boolean;
  type?: 'T-3' | 'T-1' | 'T0' | 'T+2';
  title: string;
  body: string;
}

function getOldestUnpaidDate(guest: Guest): Date | null {
  const isSymbolic = guest.amountType === 'symbolic';
  const hasNumericBalance = guest.balance > 0;
  const hasSymbolicBalance = isSymbolic && guest.symbolicBalance && guest.symbolicBalance !== '0';

  if (!hasNumericBalance && !hasSymbolicBalance) return null;

  const debits = (guest.ledger || []).filter(e => e.type === 'debit').sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const credits = (guest.ledger || []).filter(e => e.type === 'credit');
  
  let totalCredits = credits.filter(e => e.amountType !== 'symbolic').reduce((sum, e) => sum + e.amount, 0);
  let totalSymbolicCredits = credits.filter(e => e.amountType === 'symbolic').length;

  for (const debit of debits) {
    if (debit.amountType === 'symbolic') {
      if (totalSymbolicCredits >= 1) {
        totalSymbolicCredits -= 1;
      } else {
        return new Date(debit.date);
      }
    } else {
      if (totalCredits >= debit.amount) {
        totalCredits -= debit.amount;
      } else {
        return new Date(debit.date);
      }
    }
  }
  return null;
}

export function getReminderForGuest(guest: Guest, now: Date = new Date()): ReminderResult {
  if (guest.isVacated) {
    return { shouldSend: false, title: '', body: '' };
  }

  // Helper to determine calendar day difference respecting timezone
  function getMidnightInTZ(date: Date, tzOffsetMinutes: number = 0): number {
    const shifted = new Date(date.getTime() + tzOffsetMinutes * 60000);
    return new Date(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()).getTime();
  }

  let tzOffset = 0;
  if (guest.timezone === 'Asia/Kolkata') tzOffset = 330;
  else if (guest.timezone === 'Europe/London') tzOffset = 60;

  const nowMidnight = getMidnightInTZ(now, tzOffset);

  // Helper to get check value
  function getCheckValue(targetDate: Date, unit: string): { checkValue: number, unitString: string } {
    const diffMs = targetDate.getTime() - now.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const targetMidnight = getMidnightInTZ(targetDate, tzOffset);
    const diffDays = Math.round((targetMidnight - nowMidnight) / (1000 * 60 * 60 * 24));

    if (unit === 'months' || unit === 'weeks') {
      return { checkValue: diffDays, unitString: 'day(s)' };
    } else if (unit === 'days') {
      return { checkValue: diffHours, unitString: 'hour(s)' };
    } else if (unit === 'hours') {
      return { checkValue: diffHours, unitString: 'hour(s)' };
    } else if (unit === 'minutes') {
      return { checkValue: diffMinutes, unitString: 'minute(s)' };
    }
    return { checkValue: diffDays, unitString: 'day(s)' };
  }

  const nextDueDate = new Date(guest.dueDate);
  const nextDueCheck = getCheckValue(nextDueDate, guest.rentCycleUnit || 'months');

  let type: 'T-3' | 'T-1' | 'T0' | 'T+2' | undefined = undefined;
  let body = '';
  let unitString = nextDueCheck.unitString;

  const rentStr = guest.amountType === 'symbolic' ? (guest.symbolicRentValue || 'XXX') : `₹${guest.rentAmount}`;
  const hasNumericBalance = guest.balance > 0;
  const hasSymbolicBalance = guest.amountType === 'symbolic' && guest.symbolicBalance && guest.symbolicBalance !== '0';
  const balanceStr = guest.amountType === 'symbolic' 
    ? guest.symbolicBalance 
    : `₹${guest.balance}`;

  // 1. Check Upcoming Reminders (T-3, T-1, T0) based on nextDueDate
  if (nextDueCheck.checkValue === 3) {
    type = 'T-3';
    body = `Hello ${guest.name},\nThis is a reminder that your rent for ${guest.pgName || 'your PG'} is coming up in 3 ${unitString}.\nDue Date: ${nextDueDate.toLocaleDateString()}\nPlease keep the amount ready.`;
  } else if (nextDueCheck.checkValue === 1) {
    type = 'T-1';
    const dueStr = unitString === 'day(s)' ? '*Tomorrow*' : `in 1 ${unitString}`;
    body = `Hello ${guest.name},\nYour rent of ${rentStr} for ${guest.pgName || 'your PG'} is due ${dueStr}.\nPlease pay on time to avoid late fees.`;
  } else if (nextDueCheck.checkValue === 0) {
    type = 'T0';
    const todayStr = unitString === 'day(s)' ? '*TODAY*' : '*NOW*';
    body = `Hello ${guest.name},\nThis is a gentle reminder that your rent of ${rentStr} for ${guest.pgName || 'your PG'} is due ${todayStr}.\nTotal Due: ${balanceStr}\nPlease pay using the link below.`;
  }

  // 2. Check Overdue Reminders (T+2) based on Oldest Unpaid Date
  if (!type && (hasNumericBalance || hasSymbolicBalance)) {
    const oldestUnpaidDate = getOldestUnpaidDate(guest);
    if (oldestUnpaidDate) {
      const overdueCheck = getCheckValue(oldestUnpaidDate, guest.rentCycleUnit || 'months');
      if (overdueCheck.checkValue === -2) {
        type = 'T+2';
        unitString = overdueCheck.unitString;
        body = `⚠️ Hello ${guest.name},\nYour rent payment is *2 ${unitString} overdue*.\nDue Date was: ${oldestUnpaidDate.toLocaleDateString()}.\nTotal Outstanding: ${balanceStr}\nPlease clear your dues immediately.`;
      }
    }
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
