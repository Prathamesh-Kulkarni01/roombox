

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
    const currentAmountType = draft.amountType || 'numeric';
    let currentDueDate = parseISO(draft.dueDate);

    for (let i = 0; i < cyclesToProcess; i++) {
      const rentEntry: LedgerEntry = {
        id: `rent-${format(currentDueDate, 'yyyy-MM-dd-HH-mm-ss')}`,
        date: currentDueDate.toISOString(),
        type: 'debit',
        description: `Rent for Cycle Starting ${format(currentDueDate, 'do MMM')}`,
        amount: currentAmountType === 'symbolic' ? 0 : draft.rentAmount,
        amountType: currentAmountType,
        ...(currentAmountType === 'symbolic' && draft.symbolicRentValue ? { symbolicValue: draft.symbolicRentValue } : {}),
      };
      draft.ledger.push(rentEntry);

      currentDueDate = calculateFirstDueDate(currentDueDate, cycleUnit, cycleValue, billingAnchorDay);
    }

    draft.dueDate = currentDueDate.toISOString();

    const totalDebits = draft.ledger.filter((e) => e.type === 'debit' && e.amountType !== 'symbolic').reduce((sum, e) => sum + e.amount, 0);
    const totalCredits = draft.ledger.filter((e) => e.type === 'credit' && e.amountType !== 'symbolic').reduce((sum, e) => sum + e.amount, 0);
    
    // Symbolic totals
    const totalSymbolicDebits = draft.ledger.filter((e) => e.type === 'debit' && e.amountType === 'symbolic').length;
    const totalSymbolicCredits = draft.ledger.filter((e) => e.type === 'credit' && e.amountType === 'symbolic').length;
    const symbolicBalanceUnits = totalSymbolicDebits - totalSymbolicCredits;

    const balance = Number((totalDebits - totalCredits).toFixed(2));
    draft.balance = balance;

    // Construct symbolic balance string
    const unit = draft.symbolicRentValue || 'XXX';
    const symbolicParts = [];
    if (symbolicBalanceUnits > 0) {
      symbolicParts.push(symbolicBalanceUnits === 1 ? unit : `${symbolicBalanceUnits} * ${unit}`);
    }
    if (balance > 0) {
      symbolicParts.push(`${balance}`);
    }
    draft.symbolicBalance = symbolicParts.join(' + ');

    if (balance > 0 || symbolicBalanceUnits > 0) {
      const hasCredits = (totalCredits > 0 || totalSymbolicCredits > 0);
      
      // For symbolic, reminder checks if exactly multiple of unit
      // Since it's integer units, if units > 0 it might be partial if credits exist?
      // Simplified: if there's a balance or symbolic balance, and no credits, it's unpaid. 
      // If credits exist, it's partial.
      draft.rentStatus = hasCredits ? 'partial' : 'unpaid';
    } else {
      draft.rentStatus = 'paid';
    }
  });

  return {
    guest: updatedGuest,
    cyclesProcessed: cyclesToProcess,
  };
}

