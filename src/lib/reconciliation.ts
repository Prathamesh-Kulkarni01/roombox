

'use server';

import type { Guest, RentCycleUnit } from './types';
import { addMinutes, addHours, addDays, addWeeks, addMonths, parseISO, isAfter, differenceInMinutes, differenceInHours, differenceInDays, differenceInWeeks, differenceInMonths } from 'date-fns';
import { calculateFirstDueDate } from './utils';
import { produce } from 'immer';


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

    const dueDate = parseISO(guest.dueDate);
    if (!isAfter(now, dueDate)) {
      return { guest, cyclesProcessed: 0 };
    }

    const cycleUnit: RentCycleUnit = guest.rentCycleUnit || 'months';
    const cycleValue: number = guest.rentCycleValue || 1;
    const rentAmount = guest.rentAmount;

    let totalDifference = 0;
    switch (cycleUnit) {
        case 'minutes': totalDifference = differenceInMinutes(now, dueDate); break;
        case 'hours': totalDifference = differenceInHours(now, dueDate); break;
        case 'days': totalDifference = differenceInDays(now, dueDate); break;
        case 'weeks': totalDifference = differenceInWeeks(now, dueDate); break;
        case 'months': totalDifference = differenceInMonths(now, dueDate); break;
        default: totalDifference = 0;
    }
    
    // Calculate how many full cycles have passed.
    const cyclesToProcess = Math.floor(totalDifference / cycleValue);

    if (cyclesToProcess <= 0) {
        return { guest, cyclesProcessed: 0 };
    }
    
    const updatedGuest = produce(guest, draft => {
        // If the guest was paid, their first overdue cycle makes them 'unpaid'.
        // The balance from last cycle becomes their new current balance.
        if (draft.rentStatus === 'paid') {
            draft.balanceBroughtForward = (draft.balanceBroughtForward || 0) + (draft.rentPaidAmount || 0);
            draft.rentPaidAmount = 0;
        }

        // Add rent for all the overdue cycles.
        draft.balanceBroughtForward = (draft.balanceBroughtForward || 0) + (rentAmount * cyclesToProcess);
        
        // Advance the due date for all processed cycles.
        let newDueDate = dueDate;
        for (let i = 0; i < cyclesToProcess; i++) {
            newDueDate = calculateFirstDueDate(newDueDate, cycleUnit, cycleValue, draft.billingAnchorDay);
        }
        draft.dueDate = newDueDate.toISOString();
        
        // The guest is now definitely unpaid.
        draft.rentStatus = 'unpaid';
        draft.additionalCharges = []; // Old charges are rolled into balanceBroughtForward
    });

    return { guest: updatedGuest, cyclesProcessed: cyclesToProcess };
}
