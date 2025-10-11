
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
      // This handles month calculation more accurately, considering the anchor day.
      let monthDiff = differenceInMonths(now, dueDate);
      if (now.getDate() >= dueDate.getDate()) {
          monthDiff++;
      }
      // For a newly created guest, their first bill is already in the ledger.
      // The difference might be 1 month immediately, but we should only process if a full cycle has passed.
      // The logic below handles this by iterating from the due date.
      totalDifference = monthDiff > 0 ? monthDiff * 30 * 24 * 60 : 0; // Approximate for cycle calculation
      break;
  }
  
  // This is the key fix: The number of cycles is the floor of the total difference divided by the cycle value.
  // This was miscalculating for the very first cycle of a new guest.
  // A more robust method is to iterate.
  let cyclesToProcess = 0;
  let nextDueDate = dueDate;
  while(isAfter(now, nextDueDate)) {
      cyclesToProcess++;
      nextDueDate = calculateFirstDueDate(nextDueDate, cycleUnit, cycleValue, guest.billingAnchorDay);
  }

  if (cyclesToProcess <= 0) return { guest, cyclesProcessed: 0 };

  const updatedGuest = produce(guest, (draft) => {
    if (!draft.ledger) {
      draft.ledger = [];
    }
    let currentDueDate = parseISO(draft.dueDate);

    for (let i = 0; i < cyclesToProcess; i++) {
      const rentEntry: LedgerEntry = {
        id: `rent-${format(currentDueDate, 'yyyy-MM-dd-HH-mm-ss')}`,
        date: currentDueDate.toISOString(),
        type: 'debit',
        description: `Rent for Cycle Starting ${format(currentDueDate, 'do MMM')}`,
        amount: draft.rentAmount,
      };
      draft.ledger.push(rentEntry);

      currentDueDate = calculateFirstDueDate(currentDueDate, cycleUnit, cycleValue, draft.billingAnchorDay);
    }

    draft.dueDate = currentDueDate.toISOString();

    const totalDebits = draft.ledger.filter((e) => e.type === 'debit').reduce((sum, e) => sum + e.amount, 0);
    const totalCredits = draft.ledger.filter((e) => e.type === 'credit').reduce((sum, e) => sum + e.amount, 0);
    const balance = totalDebits - totalCredits;

    if (balance <= 0) {
      draft.rentStatus = 'paid';
    } else {
        const totalRentDebits = draft.ledger.filter(e => e.type === 'debit' && e.description.toLowerCase().includes('rent')).reduce((sum, e) => sum + e.amount, 0);
        if (totalCredits >= totalRentDebits && balance > 0) {
            // This case means rent is paid but other charges are pending.
            // We can still consider rent status 'paid' if we want to differentiate.
            // For now, if there's any positive balance, it's not fully 'paid'.
            draft.rentStatus = 'partial';
        } else if (totalCredits > 0) {
            draft.rentStatus = 'partial';
        } else {
            draft.rentStatus = 'unpaid';
        }
    }
  });

  return {
    guest: updatedGuest,
    cyclesProcessed: cyclesToProcess,
  };
}
