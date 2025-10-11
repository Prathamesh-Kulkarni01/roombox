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
        const previousAdditionalCharges = draft.additionalCharges || [];
        const previousUnpaid = draft.balanceBroughtForward || 0;

        // --- Step 2: Calculate total balance including previous unpaid + all overdue cycles ---
        // First, add previous unpaid + previous additional charges + first overdue cycle rent
        let totalBalance = previousUnpaid
            + previousAdditionalCharges.reduce((sum, c) => sum + c.amount, 0)
            + rentAmount;

        // Then, if more than 1 cycle overdue, add remaining cycles rent
        if (cyclesToProcess > 1) {
            totalBalance += rentAmount * (cyclesToProcess - 1);
        }

        draft.balanceBroughtForward = totalBalance;

        // --- Step 3: Advance due date ---
        let newDueDate = dueDate;
        for (let i = 0; i < cyclesToProcess; i++) {
            newDueDate = calculateFirstDueDate(newDueDate, cycleUnit, cycleValue, draft.billingAnchorDay);
        }
        draft.dueDate = newDueDate.toISOString();

        // --- Step 4: Reset rent paid and additional charges for new cycle ---
        draft.rentPaidAmount = 0;
        draft.additionalCharges = [];
        draft.rentStatus = 'unpaid';
    });

    return { guest: updatedGuest, cyclesProcessed: cyclesToProcess };
}
