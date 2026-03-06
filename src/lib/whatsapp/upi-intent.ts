export function generateUpiIntentLink(
    payeeVpa: string,
    payeeName: string,
    amount: number,
    transactionNote: string
): string {
    // Standard UPI Intent URI format
    // upi://pay?pa=payee@vpa&pn=Payee%20Name&tr=txn_id&tn=transaction%20note&am=amount&cu=INR

    const baseUrl = 'upi://pay';
    const params = new URLSearchParams({
        pa: payeeVpa,
        pn: payeeName,
        tn: transactionNote,
        am: amount.toString(),
        cu: 'INR'
    });

    return `${baseUrl}?${params.toString()}`;
}
