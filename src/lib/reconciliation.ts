
import type { Guest, RentCycleUnit } from './types';
import { addMinutes, addHours, addDays, addWeeks, addMonths, parseISO, isAfter, differenceInMinutes, differenceInHours, differenceInDays, differenceInWeeks, differenceInMonths, setDate, lastDayOfMonth } from 'date-fns';
import { calculateFirstDueDate } from '@/lib/utils';


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
    return { guest, cyclesProcessed: 0 };
  }

  const cycleUnit = guest.rentCycleUnit || 'months';
  const cycleValue = guest.rentCycleValue || 1;

  // If rent was paid, but the due date has now passed, a new cycle must be initiated.
  if (guest.rentStatus === 'paid') {
      const nextDueDate = calculateFirstDueDate(currentDueDate, cycleUnit, cycleValue, guest.billingAnchorDay);

      let updatedGuest: Guest = {
        ...guest,
        dueDate: nextDueDate.toISOString(),
        rentStatus: 'unpaid',
        // The balance from the 'paid' state was 0, so the new balance is just the new cycle's rent.
        balanceBroughtForward: guest.rentAmount, 
        rentPaidAmount: 0,
        additionalCharges: [],
      };
       
       // Now, run reconciliation again on this new state to see if even more cycles are overdue.
       // This handles cases where a guest is overdue by multiple cycles from a 'paid' state.
       const result = runReconciliationLogic(updatedGuest, now);
       return { guest: result.guest, cyclesProcessed: 1 + result.cyclesProcessed };
  }

  let totalDifference = 0;
  
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
