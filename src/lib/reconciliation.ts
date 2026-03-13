

import type { Guest, RentCycleUnit, LedgerEntry } from './types';
import { format, parseISO, isAfter } from 'date-fns';
import { calculateFirstDueDate } from './utils';
import { produce } from 'immer';
import { getBalanceBreakdown } from './ledger-utils';

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
  // No early return on dueDate comparison anymore.
  // We compute cyclesToProcess and then proceed to ALWAYS reconcile balance/status.


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

  // cyclesToProcess could be 0, but we still proceed to reconciliation below


  let finalGuest = guest;
  if (cyclesToProcess > 0) {
      finalGuest = produce(guest, (draft) => {
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
              draft.ledger = draft.ledger || [];
              draft.ledger.push(rentEntry);

              currentDueDate = calculateFirstDueDate(currentDueDate, cycleUnit, cycleValue, billingAnchorDay);
          }
          draft.dueDate = currentDueDate.toISOString();
      });
  }

  // ALWAYS Reconcile Status and Balance based on the full ledger
  const fullyReconciled = produce(finalGuest, (draft) => {
      const breakdown = getBalanceBreakdown(draft as Guest);
      draft.balance = breakdown.total;
      draft.symbolicBalance = (breakdown.symbolic || null) as any;

      const isSymbolicGuest = draft.amountType === 'symbolic';
      const hasNumericDebt = breakdown.total > 0;
      const hasSymbolicDebt = (breakdown.symbolicRent || 0) > 0 || (breakdown.symbolicDeposit || 0) > 0;

      if (!hasNumericDebt && !hasSymbolicDebt) {
          draft.rentStatus = 'paid';
      } else if (isSymbolicGuest || hasSymbolicDebt) {
          // Symbolic guests (Ghost Mode) or ANY symbolic debt = 'unpaid' (due)
          // (per user rule: cant be partial in ghost mode)
          draft.rentStatus = 'unpaid';
      } else {
          // Numeric guest with purely numeric debt
          const oneCycleAmount = draft.rentAmount || 1; 
          draft.rentStatus = breakdown.total < oneCycleAmount ? 'partial' : 'unpaid';
      }

  });

  return {
    guest: fullyReconciled,
    cyclesProcessed: cyclesToProcess,
  };
}

