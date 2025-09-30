
'use server';

import type { Guest } from './types';
import { calculateFirstDueDate } from './utils';
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
  if (guest.isVacated || guest.exitDate || guest.rentStatus === 'paid') {
    return { guest, cyclesProcessed: 0 };
  }

  let dueDate = parseISO(guest.dueDate);
  if (!isBefore(now, dueDate)) {
      // Due date is in the past, reconciliation might be needed
  } else {
      return { guest, cyclesProcessed: 0 };
  }

  let cyclesToProcess = 0;
  let nextDueDate = new Date(dueDate.getTime());

  // Count how many full cycles have passed
  while (isBefore(nextDueDate, now)) {
      cyclesToProcess++;
      dueDate = nextDueDate; // The start of the last processed cycle
      nextDueDate = calculateFirstDueDate(nextDueDate, guest.rentCycleUnit, guest.rentCycleValue, guest.billingAnchorDay);
  }
  
  if (cyclesToProcess === 0) {
      return { guest, cyclesProcessed: 0 };
  }

  const rentForMissedCycles = guest.rentAmount * cyclesToProcess;
  const newBalance = (guest.balanceBroughtForward || 0) + rentForMissedCycles;
  
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
