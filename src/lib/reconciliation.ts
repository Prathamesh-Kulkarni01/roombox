import type { Guest, RentCycleUnit, AdditionalCharge } from './types';
import { addMinutes, addHours, addDays, addWeeks, addMonths, parseISO, isAfter, differenceInMinutes, differenceInHours, differenceInDays, differenceInWeeks, differenceInMonths } from 'date-fns';
import { calculateFirstDueDate } from './utils';
import { produce } from 'immer';

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

    // --- Step 1: Calculate time difference ---
    let totalDifference = 0;
    switch (cycleUnit) {
        case 'minutes': totalDifference = differenceInMinutes(now, dueDate); break;
        case 'hours': totalDifference = differenceInHours(now, dueDate); break;
        case 'days': totalDifference = differenceInDays(now, dueDate); break;
        case 'weeks': totalDifference = differenceInWeeks(now, dueDate); break;
        case 'months': totalDifference = differenceInMonths(now, dueDate); break;
    }

    const cyclesToProcess = Math.floor(totalDifference / cycleValue);
    if (cyclesToProcess <= 0) return { guest, cyclesProcessed: 0 };

    const updatedGuest = produce(guest, draft => {
        // --- Step 2: Settle the books for the cycle that just ended ---
        const previousRentBill = (draft.balanceBroughtForward || 0) + draft.rentAmount;
        const totalPaid = draft.rentPaidAmount || 0;
        
        // Unpaid rent from the previous cycle. Additional charges are kept separate.
        const unpaidRent = previousRentBill - totalPaid;

        // --- Step 3: Calculate the new balance forward ---
        // New balance is the unpaid rent from the last cycle plus rent for all newly overdue cycles.
        let newBalance = unpaidRent + (rentAmount * cyclesToProcess);
        
        draft.balanceBroughtForward = newBalance;

        // --- Step 4: Advance due date ---
        let newDueDate = dueDate;
        for (let i = 0; i < cyclesToProcess; i++) {
            newDueDate = calculateFirstDueDate(newDueDate, cycleUnit, cycleValue, draft.billingAnchorDay);
        }
        draft.dueDate = newDueDate.toISOString();

        // --- Step 5: Reset rent paid for the new cycle ---
        // Additional charges are NOT cleared. They persist until paid.
        draft.rentPaidAmount = 0;
        draft.rentStatus = 'unpaid';
    });

    return { guest: updatedGuest, cyclesProcessed: cyclesToProcess };
}
