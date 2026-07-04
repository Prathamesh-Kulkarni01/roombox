

import type { Guest, RentCycleUnit, LedgerEntry } from './types';
import { format, parseISO, isAfter } from 'date-fns';
import { calculateFirstDueDate } from './utils';
import { produce } from 'immer';
import { getBalanceBreakdown } from './ledger-utils';
import { getOldestUnpaidDate } from './reminder-logic';

export function runReconciliationLogic(
  guest: Guest,
  now: Date,
  pgOptions?: { lateFeeEnabled?: boolean; lateFeeGracePeriodDays?: number; lateFeeAmount?: number; minimumBalanceForLateFee?: number }
): { guest: Guest; cyclesProcessed: number; lateFeeApplied: boolean } {
  if (guest.isVacated || guest.exitDate) return { guest, cyclesProcessed: 0, lateFeeApplied: false };

  if (!guest.dueDate) {
    console.error(`[Reconcile] Guest ${guest.id} is missing dueDate. Skipping.`);
    return { guest, cyclesProcessed: 0, lateFeeApplied: false };
  }

  const dueDate = parseISO(guest.dueDate);
  // No early return on dueDate comparison anymore.
  // We compute cyclesToProcess and then proceed to ALWAYS reconcile balance/status.


  const cycleUnit: RentCycleUnit = guest.rentCycleUnit || 'months';
  const cycleValue: number = guest.rentCycleValue || 1;

  let moveInDate = guest.moveInDate || guest.dueDate;
  if (!moveInDate) {
    console.error(`[Reconcile] Guest ${guest.id} is missing moveInDate/joinDate. Skipping.`);
    return { guest, cyclesProcessed: 0, lateFeeApplied: false };
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

  let lateFeeApplied = false;

  // LATE FEE LOGIC
  if (pgOptions?.lateFeeEnabled && pgOptions.lateFeeAmount && pgOptions.lateFeeGracePeriodDays !== undefined) {
      finalGuest = produce(finalGuest, (draft) => {
          // Timezone Fix: Ensure we evaluate 'now' in Asia/Kolkata for string matching
          const istNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
          const nowStr = format(istNow, 'yyyy-MM-dd');
          
          // Waive Late Fees Until Fix - String comparison avoids timezone offset bugs
          if (draft.waiveLateFeesUntil) {
              if (nowStr <= draft.waiveLateFeesUntil) return; // Waived
          }

          // Minimum Balance Threshold
          const breakdown = getBalanceBreakdown(draft as Guest);
          const minBalance = pgOptions.minimumBalanceForLateFee ?? 100;
          if (breakdown.total < minBalance) return; // Debt is too small

          const oldestUnpaidDate = getOldestUnpaidDate(draft as Guest);
          if (oldestUnpaidDate) {
              // Compare UTC differences for days late (since JS dates internally are ms since epoch, this is fine)
              const daysLate = Math.floor((now.getTime() - oldestUnpaidDate.getTime()) / (1000 * 60 * 60 * 24));
              if (daysLate > pgOptions.lateFeeGracePeriodDays!) {
                  if (draft.lastLateFeeAppliedDate !== nowStr) {
                      const oldestUnpaidMonthStr = format(oldestUnpaidDate, 'MM-yyyy');
                      draft.ledger = draft.ledger || [];
                      
                      // Ledger Bloat Fix: Look for existing late fee entry for this month AND YEAR
                      const existingFeeIndex = draft.ledger.findIndex(
                          e => e.isLateFee && !e.paymentId && e.description?.includes(format(oldestUnpaidDate, 'MMM yyyy'))
                      );

                      if (existingFeeIndex >= 0) {
                          // Increment existing fee instead of adding a new row
                          draft.ledger[existingFeeIndex].amount += pgOptions.lateFeeAmount!;
                          // Optional: update date to reflect latest increment
                          draft.ledger[existingFeeIndex].date = now.toISOString();
                      } else {
                          // Create new fee entry
                          const lateFeeEntry: LedgerEntry = {
                              id: `latefee-${format(now, 'yyyy-MM-dd-HH-mm-ss')}`,
                              date: now.toISOString(),
                              type: 'debit',
                              description: `Late Fee for ${format(oldestUnpaidDate, 'do MMM yyyy')}`,
                              amount: pgOptions.lateFeeAmount!,
                              isLateFee: true
                          };
                          draft.ledger.push(lateFeeEntry);
                      }
                      
                      draft.lastLateFeeAppliedDate = nowStr;
                      lateFeeApplied = true;
                  }
              }
          }
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
    lateFeeApplied
  };
}

