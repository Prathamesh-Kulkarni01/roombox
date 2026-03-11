
import { Guest } from "./types";

/**
 * Calculates the breakdown of the current unpaid balance for a guest.
 * It applies total credits against debits chronologically.
 */
export function getBalanceBreakdown(guest: Guest) {
    if (!guest.ledger || guest.ledger.length === 0) {
        return { rent: 0, deposit: 0, other: 0, total: 0 };
    }

    let creditsToApply = guest.ledger
        .filter(e => e.type === 'credit')
        .reduce((sum, e) => sum + e.amount, 0);

    const debits = [...guest.ledger]
        .filter(e => e.type === 'debit')
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const breakdown = {
        rent: 0,
        deposit: 0,
        other: 0,
        total: 0
    };

    for (const debit of debits) {
        let unpaid = debit.amount;
        if (creditsToApply >= unpaid) {
            creditsToApply -= unpaid;
            unpaid = 0;
        } else {
            unpaid -= creditsToApply;
            creditsToApply = 0;
        }

        if (unpaid > 0) {
            const desc = debit.description.toLowerCase();
            if (desc.includes('security deposit') || desc.includes('deposit')) {
                breakdown.deposit += unpaid;
            } else if (desc.includes('rent')) {
                breakdown.rent += unpaid;
            } else {
                breakdown.other += unpaid;
            }
            breakdown.total += unpaid;
        }
    }

    return breakdown;
}

/**
 * Formats the breakdown into a readable string like "₹5 Rent + ₹10 Dep"
 */
export function formatBalanceBreakdown(guest: Guest) {
    const breakdown = getBalanceBreakdown(guest);

    if (breakdown.total <= 0) return null;

    const parts = [];
    if (breakdown.rent > 0) parts.push(`₹${breakdown.rent} (Rent)`);
    if (breakdown.deposit > 0) parts.push(`₹${breakdown.deposit} (Dep)`);
    if (breakdown.other > 0) parts.push(`₹${breakdown.other} (Other)`);

    if (parts.length === 0) return null;
    return parts.join(' + ');
}
