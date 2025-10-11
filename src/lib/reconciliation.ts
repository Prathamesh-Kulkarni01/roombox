
'use server';

import type { Guest, RentCycleUnit } from './types';
import { addMinutes, addHours, addDays, addWeeks, addMonths, parseISO, isAfter, differenceInMinutes, differenceInHours, differenceInDays, differenceInWeeks, differenceInMonths } from 'date-fns';
import { calculateFirstDueDate } from './utils';


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

    let currentDueDate = parseISO(guest.dueDate);
    if (!isAfter(now, currentDueDate)) {
      return { guest, cyclesProcessed: 0 };
    }
    
    let workingGuest = { ...guest };
    let totalCyclesProcessed = 0;

    const cycleUnit = workingGuest.rentCycleUnit || 'months';
    const cycleValue = workingGuest.rentCycleValue || 1;

    // Handle the initial transition from 'paid' to 'unpaid' if necessary
    if (workingGuest.rentStatus === 'paid') {
        const nextDueDate = calculateFirstDueDate(currentDueDate, cycleUnit, cycleValue, workingGuest.billingAnchorDay);
        workingGuest = {
          ...workingGuest,
          dueDate: nextDueDate.toISOString(),
          rentStatus: 'unpaid',
          balanceBroughtForward: (workingGuest.balanceBroughtForward || 0) + workingGuest.rentAmount,
          rentPaidAmount: 0,
          additionalCharges: [],
        };
        totalCyclesProcessed = 1;
        currentDueDate = nextDueDate; // Update the due date we're comparing against
    }
    
    // If we're still overdue after the potential 'paid' -> 'unpaid' flip, calculate further cycles
    if (!isAfter(now, currentDueDate)) {
        return { guest: workingGuest, cyclesProcessed: totalCyclesProcessed };
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
    
    const additionalCyclesToProcess = Math.floor(totalDifference / cycleValue);

    if (additionalCyclesToProcess <= 0) {
       return { guest: workingGuest, cyclesProcessed: totalCyclesProcessed };
    }

    const rentForMissedCycles = workingGuest.rentAmount * additionalCyclesToProcess;
    const newBalance = (workingGuest.balanceBroughtForward || 0) + rentForMissedCycles;
    
    let newDueDate = currentDueDate;
    for (let i = 0; i < additionalCyclesToProcess; i++) {
      newDueDate = calculateFirstDueDate(newDueDate, cycleUnit, cycleValue, workingGuest.billingAnchorDay);
    }
    
    const finalGuest: Guest = {
        ...workingGuest,
        dueDate: newDueDate.toISOString(),
        balanceBroughtForward: newBalance,
        rentPaidAmount: 0,
        rentStatus: 'unpaid',
    };

    return { guest: finalGuest, cyclesProcessed: totalCyclesProcessed + additionalCyclesToProcess };
}

    