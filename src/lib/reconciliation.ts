import type { Guest, RentCycleUnit, LedgerEntry } from './types';
import { format, parseISO, isAfter, differenceInMinutes, differenceInHours, differenceInDays, differenceInWeeks, differenceInMonths } from 'date-fns';
import { calculateFirstDueDate } from './utils';
import { produce } from 'immer';

export function runReconciliationLogic(
  guest: Guest,
  now: Date
): { guest: Guest; cyclesProcessed: number } {
  // Skip vacated guests or those on notice
  if (guest.isVacated || guest.exitDate) return { guest, cyclesProcessed: 0 };

  const dueDate = parseISO(guest.dueDate);
  if (!isAfter(now, dueDate)) return { guest, cyclesProcessed: 0 };

  const cycleUnit: RentCycleUnit = guest.rentCycleUnit || 'months';
  const cycleValue: number = guest.rentCycleValue || 1;

  // Calculate total overdue difference in units
  let totalDifference = 0;
  switch (cycleUnit) {
    case 'minutes':
      totalDifference = differenceInMinutes(now, dueDate);
      break;
    case 'hours':
      totalDifference = differenceInHours(now, dueDate);
      break;
    case 'days':
      totalDifference = differenceInDays(now, dueDate);
      break;
    case 'weeks':
      totalDifference = differenceInWeeks(now, dueDate);
      break;
    case 'months':
      totalDifference = differenceInMonths(now, dueDate);
      break;
  }

  const cyclesToProcess = Math.floor(totalDifference / cycleValue);
  if (cyclesToProcess <= 0) return { guest, cyclesProcessed: 0 };

  const updatedGuest = produce(guest, (draft) => {
    let currentDueDate = parseISO(draft.dueDate);

    for (let i = 0; i < cyclesToProcess; i++) {
      const rentEntry: LedgerEntry = {
        id: `rent-${format(currentDueDate, 'yyyy-MM-dd-HH-mm-ss')}`,
        date: currentDueDate.toISOString(),
        type: 'debit',
        description: `Rent for ${format(currentDueDate, 'MMM yyyy')} (${format(currentDueDate, 'HH:mm')})`,
        amount: draft.rentAmount,
      };
      draft.ledger.push(rentEntry);

      currentDueDate = calculateFirstDueDate(currentDueDate, cycleUnit, cycleValue, draft.billingAnchorDay);
    }

    draft.dueDate = currentDueDate.toISOString();

    const totalDebits = draft.ledger.filter((e) => e.type === 'debit').reduce((sum, e) => sum + e.amount, 0);
    const totalCredits = draft.ledger.filter((e) => e.type === 'credit').reduce((sum, e) => sum + e.amount, 0);
    const balance = totalDebits - totalCredits;

    draft.rentStatus = balance <= 0 ? 'paid' : 'unpaid';
  });

  // Return fully mutable guest including ledger
  return {
    guest: {
      ...updatedGuest,
      ledger: [...updatedGuest.ledger],
    },
    cyclesProcessed: cyclesToProcess,
  };
}
