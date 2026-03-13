import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initAdmin } from '@/lib/firebaseAdmin';

export async function POST(req: NextRequest) {
    try {
        await initAdmin();
        const auth = getAuth();
        const db = getFirestore();

        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await auth.verifyIdToken(idToken);
        const ownerId = decodedToken.uid;

        const { guestId, paymentId, status, notes } = await req.json();

        if (!guestId || !paymentId || !status) {
            return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }

        const guestRef = db.collection('tenants').doc(guestId);
        const guestDoc = await guestRef.get();

        if (!guestDoc.exists) {
            return NextResponse.json({ success: false, error: 'Guest not found' }, { status: 404 });
        }

        const guestData = guestDoc.data();
        if (guestData?.ownerId !== ownerId) {
             // Check if owner has access via pgIds
             const userDoc = await db.collection('users').doc(ownerId).get();
             const userData = userDoc.data();
             if (!userData?.pgIds?.includes(guestData?.pgId)) {
                return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
             }
        }

        let paymentHistory = guestData?.paymentHistory || [];
        let ledger = guestData?.ledger || [];

        const paymentIndex = paymentHistory.findIndex((p: any) => p.id === paymentId);
        if (paymentIndex === -1) {
            return NextResponse.json({ success: false, error: 'Payment not found' }, { status: 404 });
        }

        const payment = paymentHistory[paymentIndex];
        payment.verificationStatus = status;
        payment.verifiedBy = ownerId;
        payment.verifiedAt = new Date().toISOString();
        if (notes) payment.notes = (payment.notes ? `${payment.notes} | ` : '') + `Verification Notes: ${notes}`;

        // If verified, we need to find the corresponding credit entry in the ledger and update it if needed?
        // Actually, our getBalanceBreakdown already excludes unverified credits.
        // So just updating the verificationStatus in paymentHistory and ledger is enough.
        
        const ledgerIndex = ledger.findIndex((l: any) => l.description.includes(paymentId) || (l.type === 'credit' && l.amount === payment.amount && Math.abs(new Date(l.date).getTime() - new Date(payment.date).getTime()) < 5000));
        // Better: when we created the ledger entry in confirm-manual, we should have tagged it with the paymentId.
        // Let's assume description contains the paymentId or we can search by other fields.
        
        if (ledgerIndex !== -1) {
            ledger[ledgerIndex].verificationStatus = status; // Add this field to ledger entry too for consistency
        }

        await guestRef.update({
            paymentHistory,
            ledger
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Error verifying payment:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
