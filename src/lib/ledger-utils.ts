
import { Guest } from "./types";

/**
 * Calculates the breakdown of the current unpaid balance for a guest.
 * It applies total credits against debits chronologically.
 */
export function getBalanceBreakdown(guest: Guest) {
    if (!guest.ledger || guest.ledger.length === 0) {
        return { 
            rent: 0, 
            deposit: 0, 
            other: 0, 
            total: 0, 
            symbolicRent: 0, 
            symbolicDeposit: 0, 
            symbolic: guest.amountType === 'symbolic' ? '0' : null 
        };
    }

    const isSymbolic = guest.amountType === 'symbolic';
    const unit = guest.symbolicRentValue || 'XXX';

    let creditsToApply = guest.ledger
        .filter(e => e.type === 'credit' && e.amountType !== 'symbolic')
        .reduce((sum, e) => sum + e.amount, 0);

    let symbolicCreditsToApply = guest.ledger
        .filter(e => e.type === 'credit' && e.amountType === 'symbolic')
        .length; // Each symbolic credit is 1 unit of XXX

    const debits = [...guest.ledger]
        .filter(e => e.type === 'debit')
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const breakdown = {
        rent: 0,
        deposit: 0,
        other: 0,
        total: 0,
        symbolicRent: 0,
        symbolicDeposit: 0,
    };

    for (const debit of debits) {
        const debitIsSymbolic = debit.amountType === 'symbolic';
        let unpaid = debitIsSymbolic ? 1 : debit.amount;

        if (debitIsSymbolic) {
            if (symbolicCreditsToApply >= unpaid) {
                symbolicCreditsToApply -= unpaid;
                unpaid = 0;
            } else {
                unpaid -= symbolicCreditsToApply;
                symbolicCreditsToApply = 0;
            }
        } else {
            if (creditsToApply >= unpaid) {
                creditsToApply -= unpaid;
                unpaid = 0;
            } else {
                unpaid -= creditsToApply;
                creditsToApply = 0;
            }
        }

        if (unpaid > 0) {
            const desc = debit.description.toLowerCase();
            if (desc.includes('security deposit') || desc.includes('deposit')) {
                if (debitIsSymbolic) breakdown.symbolicDeposit += unpaid;
                else breakdown.deposit += unpaid;
            } else if (desc.includes('rent')) {
                if (debitIsSymbolic) breakdown.symbolicRent += unpaid;
                else breakdown.rent += unpaid;
            } else {
                // Symbolic other? Unlikely but fallback
                breakdown.other += unpaid;
            }
            if (!debitIsSymbolic) breakdown.total += unpaid;
        }
    }

    // Construct symbolic string: "2 * XXX + 500"
    const symbolicParts = [];
    const totalSymbolicUnits = breakdown.symbolicRent + breakdown.symbolicDeposit;
    if (totalSymbolicUnits > 0) {
        symbolicParts.push(totalSymbolicUnits === 1 ? unit : `${totalSymbolicUnits} * ${unit}`);
    }
    if (breakdown.total > 0) {
        symbolicParts.push(`${breakdown.total}`);
    }

    return {
        ...breakdown,
        symbolic: symbolicParts.length > 0 ? symbolicParts.join(' + ') : (isSymbolic ? '0' : null)
    };
}

/**
 * Formats the breakdown into a readable string like "₹5 Rent + ₹10 Dep" or "2 * XXX + ₹500"
 */
export function formatBalanceBreakdown(guest: Guest) {
    const breakdown = getBalanceBreakdown(guest);

    if (breakdown.total <= 0 && (!breakdown.symbolic || breakdown.symbolic === '0')) return null;

    const parts = [];
    const unit = guest.symbolicRentValue || 'XXX';

    if (breakdown.symbolicRent > 0) {
        parts.push(breakdown.symbolicRent === 1 ? unit : `${breakdown.symbolicRent} * ${unit}`);
    } else if (breakdown.rent > 0) {
        parts.push(`₹${breakdown.rent} (Rent)`);
    }

    if (breakdown.symbolicDeposit > 0) {
        parts.push(breakdown.symbolicDeposit === 1 ? `Deposit (${unit})` : `${breakdown.symbolicDeposit} * ${unit} (Dep)`);
    } else if (breakdown.deposit > 0) {
        parts.push(`₹${breakdown.deposit} (Dep)`);
    }

    if (breakdown.other > 0) parts.push(`₹${breakdown.other} (Other)`);

    if (parts.length === 0) return null;
    return parts.join(' + ');
}
