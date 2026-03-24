
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
 * Generates the standardized lightweight payment reference ID.
 * Format: R{shortId}-{month}-{amount} 
 * Example: R12A-MAR-5000
 */
export function generateRentSutraNote(shortId: string, amount: number, month: string): string {
    const cleanId = shortId ? shortId.substring(0, 4).toUpperCase() : 'XXX';
    const cleanMonth = month ? month.substring(0, 3).toUpperCase() : 'MTH';
    
    // R12A-MAR-5000
    return `R${cleanId}-${cleanMonth}-${amount}`;
}

/**
 * Extracts details from a RentSutra payment note.
 */
export function parseRentSutraNote(note: string) {
    if (!note || !note.startsWith('RS|')) return null;
    
    const parts = note.split('|');
    if (parts.length < 4) return null;

    return {
        prefix: parts[0],
        shortId: parts[1],
        amount: parts[2],
        month: parts[3],
        name: parts[4],
        room: parts[5]
    };
}
