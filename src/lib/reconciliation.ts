
'use server';

import type { Guest } from '@/lib/types';
import { calculateFirstDueDate } from '@/lib/utils';
import { parseISO, isBefore } from 'date-fns';

/**
 * A pure function that calculates the new state of a guest after rent reconciliation.
 * It does not perform any database operations.
 * @param guest The current guest object.
 * @param now The current date/time to reconcile against.
 * @returns An object with the updated guest state and the number of cycles processed.
 */
export function runReconciliationLogic(guest: Guest, now: Date): { guest: Guest, cyclesProcessed: number } {
  // --- Pre-computation checks ---
  if (guest.isVacated || guest.exitDate) {
    return { guest, cyclesProcessed: 0 };
  }

  let currentDueDate = parseISO(guest.dueDate);
  if (!isBefore(now, currentDueDate)) {
    // If due date is not in the past, no reconciliation needed.
  } else {
    // The due date is in the past. Proceed.
  }

  let cyclesToProcess = 0;
  let nextDueDate = new Date(currentDueDate.getTime());

  // Count how many full cycles have passed
  while (isBefore(nextDueDate, now)) {
      cyclesToProcess++;
      nextDueDate = calculateFirstDueDate(nextDueDate, guest.rentCycleUnit, guest.rentCycleValue, guest.billingAnchorDay);
  }

  // If no full cycle has passed, do nothing.
  if (cyclesToProcess === 0) {
      return { guest, cyclesProcessed: 0 };
  }

  const newRentDue = guest.rentAmount * cyclesToProcess;
  const newBalance = (guest.balanceBroughtForward || 0) + newRentDue;
  
  const updatedGuest: Guest = {
      ...guest,
      dueDate: nextDueDate.toISOString(),
      balanceBroughtForward: newBalance,
      rentPaidAmount: 0,
      rentStatus: 'unpaid',
      additionalCharges: [], // Clear one-time charges as we roll over to a new cycle
  };

  return { guest: updatedGuest, cyclesProcessed: cyclesToProcess };
}
