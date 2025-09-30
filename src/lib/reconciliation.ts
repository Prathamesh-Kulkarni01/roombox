import type { Guest, RentCycleUnit } from './types';
import { calculateFirstDueDate } from './utils';
import { parseISO, isAfter, differenceInMinutes, differenceInHours, differenceInDays, differenceInWeeks, differenceInMonths } from 'date-fns';

/**
 * A pure function that calculates the new state of a guest after rent reconciliation.
 * It does not perform any database operations.
 * @param guest The current guest object.
 * @param now The current date/time to reconcile against.
 * @returns An object with the updated guest state and the number of cycles processed.
 */
export function runReconciliationLogic(guest: Guest, now: Date): { guest: Guest, cyclesProcessed: number } {
  if (guest.isVacated || guest.exitDate || guest.rentStatus === 'paid') {
    return { guest, cyclesProcessed: 0 };
  }

  const currentDueDate = parseISO(guest.dueDate);
  
  // The core logic fix: Do not process if the current time is not yet *after* the due date.
  // This correctly handles all "due today" and "due in the future" cases.
  if (!isAfter(now, currentDueDate)) {
     return { guest, cyclesProcessed: 0 };
  }

  let totalDifference = 0;
  const cycleUnit = guest.rentCycleUnit || 'months';
  const cycleValue = guest.rentCycleValue || 1;

  // Calculate the total number of full cycles that have passed.
  switch (cycleUnit) {
      case 'minutes': totalDifference = differenceInMinutes(now, currentDueDate); break;
      case 'hours': totalDifference = differenceInHours(now, currentDueDate); break;
      case 'days': totalDifference = differenceInDays(now, currentDueDate); break;
      case 'weeks': totalDifference = differenceInWeeks(now, currentDueDate); break;
      case 'months': totalDifference = differenceInMonths(now, currentDueDate); break;
      default: totalDifference = differenceInMonths(now, currentDueDate);
  }

  const cyclesToProcess = Math.floor(totalDifference / cycleValue);

  if (cyclesToProcess <= 0) {
    return { guest, cyclesProcessed: 0 };
  }

  // If we are here, it means at least one full cycle has passed.
  // We need to account for the balance that was due *at* the start of the overdue period.
  const rentForMissedCycles = guest.rentAmount * cyclesToProcess;
  const newBalance = (guest.balanceBroughtForward || 0) + rentForMissedCycles;

  let newDueDate = currentDueDate;
  for (let i = 0; i < cyclesToProcess; i++) {
    newDueDate = calculateFirstDueDate(newDueDate, cycleUnit, cycleValue, guest.billingAnchorDay);
  }
  
  const updatedGuest: Guest = {
      ...guest,
      dueDate: newDueDate.toISOString(),
      balanceBroughtForward: newBalance,
      rentPaidAmount: 0,
      rentStatus: 'unpaid',
      additionalCharges: [],
  };

  return { guest: updatedGuest, cyclesProcessed: cyclesToProcess };
}
