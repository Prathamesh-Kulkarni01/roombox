
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

    let creditsToApply = (guest.ledger || [])
        .filter(e => e.type === 'credit' && e.amountType !== 'symbolic')
        .reduce((sum, e) => sum + e.amount, 0);

    const symbolicCreditsMap: Record<string, number> = {};
    (guest.ledger || [])
        .filter(e => e.type === 'credit' && e.amountType === 'symbolic')
        .forEach(e => {
            const val = e.symbolicValue || 'XXX';
            symbolicCreditsMap[val] = (symbolicCreditsMap[val] || 0) + 1;
        });

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
            const val = debit.symbolicValue || 'XXX';
            if (symbolicCreditsMap[val] > 0) {
                symbolicCreditsMap[val]--;
                unpaid = 0;
            } else {
                // Keep unpaid as 1
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
                if (debitIsSymbolic) breakdown.symbolicRent += unpaid; // fallback to rent for symbolic if not deposit
                else breakdown.other += unpaid;
            }
            if (!debitIsSymbolic) breakdown.total += unpaid;
        }
    }

    // Construct symbolic string: "XXX + YYY + ₹500"
    const symbolicParts = [];
    const rentUnit = guest.symbolicRentValue || 'XXX';
    const depUnit = guest.symbolicDepositValue || 'YYY';

    if (breakdown.symbolicRent > 0) {
        symbolicParts.push(breakdown.symbolicRent === 1 ? rentUnit : `${breakdown.symbolicRent}${rentUnit}`);
    }
    if (breakdown.symbolicDeposit > 0) {
        symbolicParts.push(breakdown.symbolicDeposit === 1 ? depUnit : `${breakdown.symbolicDeposit}${depUnit}`);
    }
    if (breakdown.total > 0) {
        symbolicParts.push(`₹${breakdown.total.toLocaleString('en-IN')}`);
    }

    return {
        ...breakdown,
        symbolic: symbolicParts.length > 0 ? symbolicParts.join(' + ') : null
    };
}



/**
 * Formats the breakdown into a readable string like "₹5 Rent + ₹10 Dep" or "2 * XXX + ₹500"
 */
export function formatBalanceBreakdown(guest: Guest) {
    const breakdown = getBalanceBreakdown(guest);

    if (breakdown.total <= 0 && (!breakdown.symbolic || breakdown.symbolic === '0')) return null;

    const parts = [];
    const rentUnit = guest.symbolicRentValue || 'XXX';
    const depUnit = guest.symbolicDepositValue || 'YYY';

    if (breakdown.symbolicRent > 0) {
        parts.push(breakdown.symbolicRent === 1 ? rentUnit : `${breakdown.symbolicRent}${rentUnit}`);
    } else if (breakdown.rent > 0) {
        parts.push(`₹${breakdown.rent.toLocaleString('en-IN')}`);
    }

    if (breakdown.symbolicDeposit > 0) {
        parts.push(breakdown.symbolicDeposit === 1 ? depUnit : `${breakdown.symbolicDeposit}${depUnit}`);
    } else if (breakdown.deposit > 0) {
        parts.push(`₹${breakdown.deposit.toLocaleString('en-IN')}`);
    }

    if (breakdown.other > 0) parts.push(`₹${breakdown.other} (Other)`);

    if (parts.length === 0) return null;
    return parts.join(' + ');
}
