
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

    let currentGuestState = { ...guest };
    let cyclesProcessed = 0;
    let currentDueDate = parseISO(currentGuestState.dueDate);
    
    if (!isAfter(now, currentDueDate)) {
      return { guest: currentGuestState, cyclesProcessed: 0 };
    }

    const cycleUnit = currentGuestState.rentCycleUnit || 'months';
    const cycleValue = currentGuestState.rentCycleValue || 1;

    // Handle the transition from 'paid' to 'unpaid' first.
    if (currentGuestState.rentStatus === 'paid') {
        const nextDueDate = calculateFirstDueDate(currentDueDate, cycleUnit, cycleValue, currentGuestState.billingAnchorDay);
        currentGuestState = {
          ...currentGuestState,
          dueDate: nextDueDate.toISOString(),
          rentStatus: 'unpaid',
          balanceBroughtForward: currentGuestState.rentAmount,
          rentPaidAmount: 0,
          additionalCharges: [],
        };
        cyclesProcessed = 1;
        // The due date has been advanced by one cycle. Update our reference.
        currentDueDate = nextDueDate;

        // If the current time is still not after the new due date, we're done.
        if (!isAfter(now, currentDueDate)) {
            return { guest: currentGuestState, cyclesProcessed: cyclesProcessed };
        }
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
      return { guest: currentGuestState, cyclesProcessed: cyclesProcessed };
    }

    const rentForMissedCycles = currentGuestState.rentAmount * additionalCyclesToProcess;
    const newBalance = (currentGuestState.balanceBroughtForward || 0) + rentForMissedCycles;
    
    let newDueDate = currentDueDate;
    for (let i = 0; i < additionalCyclesToProcess; i++) {
      newDueDate = calculateFirstDueDate(newDueDate, cycleUnit, cycleValue, currentGuestState.billingAnchorDay);
    }
    
    const updatedGuest: Guest = {
        ...currentGuestState,
        dueDate: newDueDate.toISOString(),
        balanceBroughtForward: newBalance,
        rentPaidAmount: 0,
        rentStatus: 'unpaid',
        additionalCharges: [],
    };

    return { guest: updatedGuest, cyclesProcessed: cyclesProcessed + additionalCyclesToProcess };
}
