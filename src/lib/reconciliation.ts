
'use server';

import type { Guest, RentCycleUnit } from './types';
import { calculateFirstDueDate } from './utils';
import { parseISO, isBefore, differenceInMinutes, differenceInHours, differenceInDays, differenceInWeeks, differenceInMonths } from 'date-fns';

/**
 * A pure function that calculates the new state of a guest after rent reconciliation.
 * It does not perform any database operations.
 * @param guest The current guest object.
 * @param now The current date/time to reconcile against.
 * @returns An object with the updated guest state and the number of cycles processed.
 */
export function runReconciliationLogic(guest: Guest, now: Date): { guest: Guest, cyclesProcessed: number } {
  // Do not process guests who are vacated, on notice, or fully paid with a future due date
  if (guest.isVacated || guest.exitDate || (guest.rentStatus === 'paid' && isBefore(now, parseISO(guest.dueDate)))) {
    return { guest, cyclesProcessed: 0 };
  }

  const currentDueDate = parseISO(guest.dueDate);

  // Do not process if the due date is in the future
  if (isBefore(now, currentDueDate)) {
      return { guest, cyclesProcessed: 0 };
  }
  
  let totalDifference = 0;
  const cycleUnit = guest.rentCycleUnit || 'months';

  // Calculate the difference in the given unit
  switch (cycleUnit) {
      case 'minutes': totalDifference = differenceInMinutes(now, currentDueDate); break;
      case 'hours': totalDifference = differenceInHours(now, currentDueDate); break;
      case 'days': totalDifference = differenceInDays(now, currentDueDate); break;
      case 'weeks': totalDifference = differenceInWeeks(now, currentDueDate); break;
      case 'months': totalDifference = differenceInMonths(now, currentDueDate); break;
      default: totalDifference = differenceInMonths(now, currentDueDate);
  }

  // Calculate how many full cycles have been missed
  const cyclesToProcess = Math.floor(totalDifference / (guest.rentCycleValue || 1));

  if (cyclesToProcess <= 0) {
    return { guest, cyclesProcessed: 0 };
  }

  const rentForMissedCycles = guest.rentAmount * cyclesToProcess;
  // Any existing dues are carried forward, plus the rent for all the missed cycles.
  const newBalance = (guest.balanceBroughtForward || 0) + rentForMissedCycles;

  // Correctly iterate the due date forward using the proper utility function
  let newDueDate = currentDueDate;
  for (let i = 0; i < cyclesToProcess; i++) {
    newDueDate = calculateFirstDueDate(newDueDate, cycleUnit, guest.rentCycleValue, guest.billingAnchorDay);
  }
  
  const updatedGuest: Guest = {
      ...guest,
      dueDate: newDueDate.toISOString(),
      balanceBroughtForward: newBalance,
      rentPaidAmount: 0, // Reset paid amount for the new cycle(s)
      rentStatus: 'unpaid', // Mark as unpaid since new cycles are added
      additionalCharges: [], // Clear one-time charges from previous cycle
  };

  return { guest: updatedGuest, cyclesProcessed: cyclesToProcess };
}
