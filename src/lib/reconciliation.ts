

import type { Guest, RentCycleUnit, LedgerEntry } from './types';
import { format, parseISO, isAfter } from 'date-fns';
import { calculateFirstDueDate } from './utils';
import { produce } from 'immer';

export function runReconciliationLogic(
  guest: Guest,
  now: Date
): { guest: Guest; cyclesProcessed: number } {
  if (guest.isVacated || guest.exitDate) return { guest, cyclesProcessed: 0 };

  if (!guest.dueDate) {
    console.error(`[Reconcile] Guest ${guest.id} is missing dueDate. Skipping.`);
    return { guest, cyclesProcessed: 0 };
  }

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

  let moveInDate = guest.moveInDate || guest.dueDate;
  if (!moveInDate) {
    console.error(`[Reconcile] Guest ${guest.id} is missing moveInDate/joinDate. Skipping.`);
    return { guest, cyclesProcessed: 0 };
  }
  const billingAnchorDay = guest.billingAnchorDay || parseISO(moveInDate).getDate();

  let cyclesToProcess = 0;
  let nextDueDate = dueDate;

  // Iteratively count how many cycles have passed.
  // Use >= comparison to catch cycles that are precisely due now.
  while (now.getTime() >= nextDueDate.getTime()) {
    cyclesToProcess++;
    nextDueDate = calculateFirstDueDate(nextDueDate, cycleUnit, cycleValue, billingAnchorDay);
  }

  if (cyclesToProcess <= 0) {
    // Even if no new cycles, ensure status is reconciled based on current balance
    const currentBalance = Number(((guest.ledger || []).reduce((acc, entry) => acc + (entry.type === 'debit' ? entry.amount : -entry.amount), 0)).toFixed(2));
    if (guest.rentStatus !== 'paid' && currentBalance <= 0) {
      return { guest: produce(guest, d => { d.rentStatus = 'paid'; d.balance = 0; }), cyclesProcessed: 0 };
    }
    return { guest, cyclesProcessed: 0 };
  }

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
    // Round to 2 decimal places to avoid floating point issues (e.g. 0.000000001 showing as partial)
    const balance = Number((totalDebits - totalCredits).toFixed(2));

    draft.balance = balance;

    if (balance > 0) {
      // Improved logic: 
      // It's 'unpaid' if the balance is exactly a multiple of the rent amount (meaning no partial payment made yet)
      // or if total credits is zero.
      const hasCredits = totalCredits > 0;
      const hasRemainder = Math.abs((totalCredits % draft.rentAmount)) > 0.01 &&
        Math.abs((totalCredits % draft.rentAmount) - draft.rentAmount) > 0.01;

      draft.rentStatus = hasRemainder ? 'partial' : 'unpaid';
    } else {
      draft.rentStatus = 'paid';
    }
  });

  return {
    guest: updatedGuest,
    cyclesProcessed: cyclesToProcess,
  };
}

