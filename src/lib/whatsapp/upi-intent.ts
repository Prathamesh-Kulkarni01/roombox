import { generateUpiLink } from '../upi';

export function generateUpiIntentLink(
    payeeVpa: string,
    payeeName: string,
    amount: number,
    transactionNote: string
): string {
    return generateUpiLink({
        pa: payeeVpa,
        pn: payeeName,
        am: amount.toString(),
        tn: transactionNote,
        cu: 'INR'
    });
}
