
/**
 * Utility for generating UPI payment links and handling RentSutra specific tracking.
 */

export interface UpiConfig {
    pa: string;      // Payee VPA (UPI ID)
    pn: string;      // Payee Name
    am?: string;     // Amount
    cu?: string;     // Currency (default INR)
    tn?: string;     // Transaction Note
}

/**
 * Generates a standard UPI deep link.
 * Format: upi://pay?pa={upiId}&pn={name}&am={amount}&cu=INR&tn={note}
 */
export function generateUpiLink(config: UpiConfig): string {
    const { pa, pn, am, cu = 'INR', tn } = config;
    
    const params = new URLSearchParams();
    params.append('pa', pa);
    params.append('pn', pn);
    if (am) params.append('am', am);
    params.append('cu', cu);
    if (tn) params.append('tn', tn);

    return `upi://pay?${params.toString()}`;
}

/** 
 * Generates the descriptive payment reference ID.
 * Format: R-{NAME}-{MONTH}-{ID}
 * Example: R-PRATHA-APR-A1B2
 */
export function generateRentSutraNote(shortId: string, amount: number, month: string, guestName?: string): string {
    const cleanId = shortId ? shortId.toUpperCase() : 'NEW';
    const cleanMonth = month ? month.substring(0, 3).toUpperCase() : 'MTH';
    
    if (guestName) {
        // Clean name: alphanumeric only, max 10 chars
        const cleanName = guestName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 10).toUpperCase();
        return `R-${cleanName}-${cleanMonth}-${cleanId}`;
    }

    return `R-${cleanMonth}-${cleanId}`;
}

/**
 * Extracts details from a RentSutra payment note.
 */
export function parseRentSutraNote(note: string) {
    if (!note || !note.startsWith('R-')) return null;
    
    const parts = note.split('-');
    // Handles formats: R-MONTH-ID or R-NAME-MONTH-ID
    if (parts.length === 3) {
        return { month: parts[1], shortId: parts[2] };
    }
    if (parts.length === 4) {
        return { name: parts[1], month: parts[2], shortId: parts[3] };
    }
    return null;
}
