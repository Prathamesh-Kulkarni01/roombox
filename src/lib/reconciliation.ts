
import type { Guest, RentCycleUnit } from './types';
import { calculateFirstDueDate } from '@/lib/utils';
import { parseISO, isAfter, differenceInMinutes, differenceInHours, differenceInDays, differenceInWeeks, differenceInMonths } from 'date-fns';

/**
 * A pure function that calculates the new state of a guest after rent reconciliation.
 * It does not perform any database operations.
 * @param guest The current guest object.
 * @param now The current date/time to reconcile against.
 * @returns An object with the updated guest state and the number of cycles processed.
 */
export function runReconciliationLogic(guest: Guest, now: Date): { guest: Guest, cyclesProcessed: number } {
  // A guest who has vacated or is on notice period should not accumulate new rent.
  if (guest.isVacated || guest.exitDate) {
    return { guest, cyclesProcessed: 0 };
  }

  const currentDueDate = parseISO(guest.dueDate);
  
  // Do not process if the current time is not yet *after* the due date.
  if (!isAfter(now, currentDueDate)) {
    // However, if the status was 'paid', it should now become 'unpaid' because the due date has passed.
    // This handles the edge case where the cron runs exactly on the due date but before the next cycle starts.
    if (guest.rentStatus === 'paid' && now >= currentDueDate) {
      const updatedGuest: Guest = {
        ...guest,
        rentStatus: 'unpaid',
        // The balance from the 'paid' state was 0, so the new balance is just the new cycle's rent.
        balanceBroughtForward: guest.rentAmount, 
        rentPaidAmount: 0,
        additionalCharges: [],
      };
       // This counts as one cycle because we're transitioning from paid to unpaid.
      return { guest: updatedGuest, cyclesProcessed: 1 };
    }
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
      rentStatus: 'unpaid', // The status is now 'unpaid' as a new cycle is due.
      additionalCharges: [],
  };

  return { guest: updatedGuest, cyclesProcessed: cyclesToProcess };
}
