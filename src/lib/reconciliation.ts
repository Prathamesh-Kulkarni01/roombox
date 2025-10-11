
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
        // "Close the books" on the cycle that just became overdue.
        // Calculate what was owed for the *last* cycle.
        const billForLastCycle = (draft.balanceBroughtForward || 0) + draft.rentAmount + (draft.additionalCharges || []).reduce((sum, charge) => sum + charge.amount, 0);
        
        // Calculate what was left unpaid from that cycle.
        const unpaidFromLastCycle = billForLastCycle - (draft.rentPaidAmount || 0);

        // This unpaid amount becomes the NEW starting balance for the next cycles.
        draft.balanceBroughtForward = unpaidFromLastCycle;
        
        // Add rent for all the newly overdue cycles.
        draft.balanceBroughtForward += (rentAmount * cyclesToProcess);
        
        // Advance the due date for all processed cycles.
        let newDueDate = dueDate;
        for (let i = 0; i < cyclesToProcess; i++) {
            newDueDate = calculateFirstDueDate(newDueDate, cycleUnit, cycleValue, draft.billingAnchorDay);
        }
        draft.dueDate = newDueDate.toISOString();
        
        // Reset for the new cycle.
        draft.rentStatus = 'unpaid';
        draft.rentPaidAmount = 0;
        draft.additionalCharges = [];
    });

    return { guest: updatedGuest, cyclesProcessed: cyclesToProcess };
}
