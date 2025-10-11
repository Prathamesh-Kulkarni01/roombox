import type { Guest, RentCycleUnit, LedgerEntry } from './types';
import { format, addMinutes, addHours, addDays, addWeeks, addMonths, parseISO, isAfter, differenceInMinutes, differenceInHours, differenceInDays, differenceInWeeks, differenceInMonths } from 'date-fns';
import { calculateFirstDueDate } from './utils';
import { produce } from 'immer';

export function runReconciliationLogic(guest: Guest, now: Date): { guest: Guest, cyclesProcessed: number } {
    // Stop processing for vacated guests
    if (guest.isVacated || guest.exitDate) {
        return { guest, cyclesProcessed: 0 };
    }

    const dueDate = parseISO(guest.dueDate);
    if (!isAfter(now, dueDate)) {
        return { guest, cyclesProcessed: 0 };
    }

    const cycleUnit: RentCycleUnit = guest.rentCycleUnit || 'months';
    const cycleValue: number = guest.rentCycleValue || 1;

    // --- Step 1: Calculate how many full cycles have passed ---
    let totalDifference = 0;
    switch (cycleUnit) {
        case 'minutes': totalDifference = differenceInMinutes(now, dueDate); break;
        case 'hours': totalDifference = differenceInHours(now, dueDate); break;
        case 'days': totalDifference = differenceInDays(now, dueDate); break;
        case 'weeks': totalDifference = differenceInWeeks(now, dueDate); break;
        case 'months': totalDifference = differenceInMonths(now, dueDate); break;
    }
    const cyclesToProcess = Math.floor(totalDifference / cycleValue);

    if (cyclesToProcess <= 0) {
        return { guest, cyclesProcessed: 0 };
    }

    const updatedGuest = produce(guest, draft => {
        let currentDueDate = parseISO(draft.dueDate);

        // --- Step 2: Add a debit entry for each missed cycle ---
        for (let i = 0; i < cyclesToProcess; i++) {
            const rentEntry: LedgerEntry = {
                id: `rent-${format(currentDueDate, 'yyyy-MM-dd')}`,
                date: currentDueDate.toISOString(),
                type: 'debit',
                description: `Rent for ${format(currentDueDate, 'MMM yyyy')}`,
                amount: draft.rentAmount,
            };
            // Avoid adding duplicate rent entries
            if (!draft.ledger.some(entry => entry.id === rentEntry.id)) {
                draft.ledger.push(rentEntry);
            }
            
            // Advance the due date for the next iteration
            currentDueDate = calculateFirstDueDate(currentDueDate, cycleUnit, cycleValue, draft.billingAnchorDay);
        }

        // --- Step 3: Update the main due date ---
        draft.dueDate = currentDueDate.toISOString();

        // --- Step 4: Update rent status based on new balance ---
        const totalDebits = draft.ledger.filter(e => e.type === 'debit').reduce((sum, e) => sum + e.amount, 0);
        const totalCredits = draft.ledger.filter(e => e.type === 'credit').reduce((sum, e) => sum + e.amount, 0);
        const newBalance = totalDebits - totalCredits;

        if (newBalance <= 0) {
            draft.rentStatus = 'paid';
        } else {
            // Check if the paid amount covers at least one full rent cycle's worth of debits
            const debitsThisCycle = draft.ledger
                .filter(e => e.type === 'debit' && isAfter(parseISO(e.date), subMonths(new Date(), 1)))
                .reduce((sum, e) => sum + e.amount, 0);
            
            if (totalCredits > 0 && totalCredits < debitsThisCycle) {
                draft.rentStatus = 'partial';
            } else {
                draft.rentStatus = 'unpaid';
            }
        }
    });

    return { guest: updatedGuest, cyclesProcessed: cyclesToProcess };
}
