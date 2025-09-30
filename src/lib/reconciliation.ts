
'use server';

import type { Guest } from './types';
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
  if (guest.isVacated || guest.exitDate || guest.rentStatus === 'paid') {
    return { guest, cyclesProcessed: 0 };
  }

  const currentDueDate = parseISO(guest.dueDate);

  if (!isBefore(now, currentDueDate)) {
      // Due date is in the past, reconciliation might be needed.
  } else {
      // Due date is in the future.
      return { guest, cyclesProcessed: 0 };
  }
  
  let totalDifference = 0;
  switch (guest.rentCycleUnit) {
      case 'minutes': totalDifference = differenceInMinutes(now, currentDueDate); break;
      case 'hours': totalDifference = differenceInHours(now, currentDueDate); break;
      case 'days': totalDifference = differenceInDays(now, currentDueDate); break;
      case 'weeks': totalDifference = differenceInWeeks(now, currentDueDate); break;
      case 'months': totalDifference = differenceInMonths(now, currentDueDate); break;
  }

  const cyclesToProcess = Math.floor(totalDifference / guest.rentCycleValue);

  if (cyclesToProcess <= 0) {
    return { guest, cyclesProcessed: 0 };
  }

  const rentForMissedCycles = guest.rentAmount * cyclesToProcess;
  const newBalance = (guest.balanceBroughtForward || 0) + rentForMissedCycles;

  let newDueDate = currentDueDate;
  for (let i = 0; i < cyclesToProcess; i++) {
    newDueDate = calculateFirstDueDate(newDueDate, guest.rentCycleUnit, guest.rentCycleValue, guest.billingAnchorDay);
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
