
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

  let currentDueDate = parseISO(guest.dueDate);
  if (!isBefore(now, currentDueDate)) {
      // Due date is in the past, reconciliation might be needed
  } else {
      return { guest, cyclesProcessed: 0 };
  }

  let cyclesToProcess = 0;
  let nextDueDate = new Date(currentDueDate.getTime());

  // Count how many full cycles have passed
  while (isBefore(nextDueDate, now)) {
      cyclesToProcess++;
      currentDueDate = nextDueDate; // The start of the last processed cycle
      nextDueDate = calculateFirstDueDate(nextDueDate, guest.rentCycleUnit, guest.rentCycleValue, guest.billingAnchorDay);
  }
  
  if (cyclesToProcess === 0) {
      // Even if overdue, if a full cycle hasn't passed, no new rent is billed.
      // The rentStatus remains 'unpaid' or 'partial'.
      return { guest, cyclesProcessed: 0 };
  }

  const rentForMissedCycles = guest.rentAmount * cyclesToProcess;
  const newBalance = (guest.balanceBroughtForward || 0) + rentForMissedCycles;
  
  const updatedGuest: Guest = {
      ...guest,
      dueDate: currentDueDate.toISOString(), // The due date should be the *start* of the current cycle.
      balanceBroughtForward: newBalance,
      rentPaidAmount: 0, // Reset paid amount for the new cycle(s).
      rentStatus: 'unpaid',
      additionalCharges: [], // Clear one-time charges as we roll over to a new cycle
  };

  // Re-run the logic with the updated guest state to set the final correct due date
  let finalGuest = updatedGuest;
  let finalDueDate = currentDueDate;
  while(isBefore(finalDueDate, now)) {
      finalDueDate = calculateFirstDueDate(finalDueDate, finalGuest.rentCycleUnit, finalGuest.rentCycleValue, finalGuest.billingAnchorDay);
  }
  finalGuest.dueDate = finalDueDate.toISOString();


  return { guest: finalGuest, cyclesProcessed: cyclesToProcess };
}
