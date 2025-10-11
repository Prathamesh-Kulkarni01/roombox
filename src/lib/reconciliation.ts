import type { Guest, RentCycleUnit, LedgerEntry } from './types';
import { format, addMinutes, addHours, addDays, addWeeks, addMonths, parseISO, isAfter, differenceInMinutes, differenceInHours, differenceInDays, differenceInWeeks, differenceInMonths } from 'date-fns';
import { calculateFirstDueDate } from './utils';
import { produce } from 'immer';

export function runReconciliationLogic(guest: Guest, now: Date): { guest: Guest, cyclesProcessed: number } {
    // Stop processing for vacated guests or those on notice period
    if (guest.isVacated || guest.exitDate) {
        return { guest, cyclesProcessed: 0 };
    }

    const dueDate = parseISO(guest.dueDate);
    if (!isAfter(now, dueDate)) {
        return { guest, cyclesProcessed: 0 };
    }

    const cycleUnit: RentCycleUnit = guest.rentCycleUnit || 'months';
    const cycleValue: number = guest.rentCycleValue || 1;

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

        for (let i = 0; i < cyclesToProcess; i++) {
            const rentEntry: LedgerEntry = {
                id: `rent-${format(currentDueDate, 'yyyy-MM-dd')}`,
                date: currentDueDate.toISOString(),
                type: 'debit',
                description: `Rent for ${format(currentDueDate, 'MMM yyyy')}`,
                amount: draft.rentAmount,
            };
            if (!draft.ledger.some(entry => entry.id === rentEntry.id)) {
                draft.ledger.push(rentEntry);
            }
            
            currentDueDate = calculateFirstDueDate(currentDueDate, cycleUnit, cycleValue, draft.billingAnchorDay);
        }

        draft.dueDate = currentDueDate.toISOString();

        const totalDebits = draft.ledger.filter(e => e.type === 'debit').reduce((sum, e) => sum + e.amount, 0);
        const totalCredits = draft.ledger.filter(e => e.type === 'credit').reduce((sum, e) => sum + e.amount, 0);
        const newBalance = totalDebits - totalCredits;

        if (newBalance <= 0) {
            draft.rentStatus = 'paid';
        } else {
             // A guest is 'partial' if they have paid something, but still have a balance.
             // Otherwise, they are 'unpaid'.
            draft.rentStatus = totalCredits > 0 ? 'partial' : 'unpaid';
        }
    });

    return { guest: updatedGuest, cyclesProcessed: cyclesToProcess };
}
