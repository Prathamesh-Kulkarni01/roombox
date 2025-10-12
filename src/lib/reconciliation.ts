

import type { Guest, RentCycleUnit, LedgerEntry } from './types';
import { format, parseISO, isAfter } from 'date-fns';
import { calculateFirstDueDate } from './utils';
import { produce } from 'immer';

export function runReconciliationLogic(
  guest: Guest,
  now: Date
): { guest: Guest; cyclesProcessed: number } {
  if (guest.isVacated || guest.exitDate) return { guest, cyclesProcessed: 0 };

  const dueDate = parseISO(guest.dueDate);
  if (!isAfter(now, dueDate)) return { guest, cyclesProcessed: 0 };

  const cycleUnit: RentCycleUnit = guest.rentCycleUnit || 'months';
  const cycleValue: number = guest.rentCycleValue || 1;
  const billingAnchorDay = guest.billingAnchorDay || parseISO(guest.moveInDate).getDate();

  let cyclesToProcess = 0;
  let nextDueDate = dueDate;

  // Iteratively count how many cycles have passed.
  while(isAfter(now, nextDueDate)) {
      cyclesToProcess++;
      nextDueDate = calculateFirstDueDate(nextDueDate, cycleUnit, cycleValue, billingAnchorDay);
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
      
      currentDueDate = calculateFirstDueDate(currentDueDate, cycleUnit, cycleValue, billingAnchorDay);
    }

    draft.dueDate = currentDueDate.toISOString();

    const totalDebits = draft.ledger.filter((e) => e.type === 'debit').reduce((sum, e) => sum + e.amount, 0);
    const totalCredits = draft.ledger.filter((e) => e.type === 'credit').reduce((sum, e) => sum + e.amount, 0);
    const balance = totalDebits - totalCredits;

    if (balance <= 0) {
      draft.rentStatus = 'paid';
    } else if (totalCredits > 0) {
      draft.rentStatus = 'partial';
    } else {
      draft.rentStatus = 'unpaid';
    }
  });

  return {
    guest: updatedGuest,
    cyclesProcessed: cyclesToProcess,
  };
}

    