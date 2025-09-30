
'use server';
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
  if (guest.isVacated || guest.exitDate) {
    return { guest, cyclesProcessed: 0 };
  }

  const currentDueDate = parseISO(guest.dueDate);

  if (!isAfter(now, currentDueDate)) {
    return { guest, cyclesProcessed: 0 };
  }

  const cycleUnit = guest.rentCycleUnit || 'months';
  const cycleValue = guest.rentCycleValue || 1;

  // Special handling for guests who were 'paid' and have now become overdue.
  if (guest.rentStatus === 'paid') {
      const nextDueDate = calculateFirstDueDate(currentDueDate, cycleUnit, cycleValue, guest.billingAnchorDay);
      const updatedGuest: Guest = {
        ...guest,
        dueDate: nextDueDate.toISOString(),
        rentStatus: 'unpaid',
        balanceBroughtForward: guest.rentAmount,
        rentPaidAmount: 0,
        additionalCharges: [],
      };
      
      // Recalculate if more cycles are due from this new date.
      return runReconciliationLogic(updatedGuest, now);
  }

  let totalDifference = 0;
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
