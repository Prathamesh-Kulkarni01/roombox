

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
  if (!isAfter(now, dueDate)) {
    // Even if not overdue, let's ensure the status is correct based on the current balance.
    const currentBalance = (guest.ledger || []).reduce((acc, entry) => acc + (entry.type === 'debit' ? entry.amount : -entry.amount), 0);
    if (guest.rentStatus !== 'paid' && currentBalance <= 0) {
        const correctedGuest = produce(guest, draft => {
            draft.rentStatus = 'paid';
        });
        return { guest: correctedGuest, cyclesProcessed: 0 };
    }
    return { guest, cyclesProcessed: 0 };
  }

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

    // Corrected Logic: If a new cycle has been added, the balance will be > 0.
    // The status should become 'unpaid' because this is a new, unpaid charge.
    // The 'partial' status should only be set when a *payment* is made that doesn't clear the balance.
    // The reconciliation logic's job is to add debits, thus making it 'unpaid'.
    if (balance > 0) {
      draft.rentStatus = 'unpaid';
    } else {
      draft.rentStatus = 'paid';
    }
  });

  return {
    guest: updatedGuest,
    cyclesProcessed: cyclesToProcess,
  };
}

    