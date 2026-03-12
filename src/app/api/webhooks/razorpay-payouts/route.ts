
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getAdminDb } from '@/lib/firebaseAdmin';
import type { Guest, Payment, User } from '@/lib/types';
import { produce } from 'immer';
import { createAndSendNotification } from '@/lib/actions/notificationActions';
import Razorpay from 'razorpay';

const WEBHOOK_SECRET = process.env.RAZORPAYX_WEBHOOK_SECRET || process.env.RAZORPAY_WEBHOOK_SECRET;

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(req: NextRequest) {
    if (!WEBHOOK_SECRET) {
        console.error('RazorpayX payout webhook secret is not set.');
        return NextResponse.json({ success: false, error: 'Webhook secret not configured.' }, { status: 500 });
    }

    const signature = req.headers.get('x-razorpay-signature');
    const body = await req.text();

    try {
        const expectedSignature = crypto
            .createHmac('sha256', WEBHOOK_SECRET)
            .update(body)
            .digest('hex');

        if (signature !== expectedSignature) {
            console.warn('[Webhook: Razorpay-Payouts] Invalid signature mismatch.');
            return NextResponse.json({ success: false, error: 'Invalid signature.' }, { status: 400 });
        }

        const event = JSON.parse(body);
        const payout = event.payload.payout?.entity;

        if (!payout) {
            console.warn('[Webhook: Razorpay-Payouts] No payout entity in payload.');
            return NextResponse.json({ success: true });
        }

        const { guestId, paymentId, type } = payout.notes || {};
        
        // Only process payouts related to rent
        if (type !== 'rent_payout' || !guestId || !paymentId) {
            console.log(`[Webhook: Razorpay-Payouts] Ignoring non-rent payout event: ${event.event}`);
            return NextResponse.json({ success: true });
        }

        console.log(`[Webhook: Razorpay-Payouts] Processing ${event.event} for Payment: ${paymentId}, Payout: ${payout.id}`);

        const adminDb = await getAdminDb();
        
        // Find the ownerId for this guest. Since we don't have ownerId in notes (my bad in previous turn), 
        // we might need to search or better, I should have added it.
        // Let's search for the guest by ID across all users_data. 
        // Actually, searching is expensive. I'll check if I can get ownerId from payout.account_number or something.
        // Better: I'll update the previous code to include ownerId in notes if I can, but for now I'll assume I need to find it.
        
        // OPTIMIZATION: In a real app, you'd include ownerId in the payout notes. 
        // Since I'm hardening, I'll add ownerId to the notes in the next step of route.ts.
        // For now, let's try to find the owner by checking the payout's contact or reference_id if possible.
        
        // Actually, let's look for the guest in the most likely place or wait... 
        // I can use the payout.notes.ownerId if I add it.
        const ownerId = payout.notes.ownerId;
        if (!ownerId) {
            console.error('[Webhook: Razorpay-Payouts] Missing ownerId in payout notes. Cannot process.');
            return NextResponse.json({ success: true }); // Still return 200 to Razorpay
        }

        const ownerDoc = await adminDb.collection('users').doc(ownerId).get();
        if (!ownerDoc.exists) {
            console.error(`Owner ${ownerId} not found.`);
            return NextResponse.json({ success: true });
        }

        const enterpriseDbId = ownerDoc.data()?.subscription?.enterpriseProject?.databaseId as string | undefined;
        const enterpriseProjectId = ownerDoc.data()?.subscription?.enterpriseProject?.projectId as string | undefined;
        const dataDb = await getAdminDb(enterpriseProjectId, enterpriseDbId);
        const guestDocRef = dataDb.collection('users_data').doc(ownerId).collection('guests').doc(guestId);

        switch (event.event) {
            case 'payout.processed': {
                await dataDb.runTransaction(async (transaction) => {
                    const guestDoc = await transaction.get(guestDocRef);
                    if (!guestDoc.exists) return;

                    const guest = guestDoc.data() as Guest;
                    const updatedPaymentHistory = produce(guest.paymentHistory || [], draft => {
                        const p = draft.find(prev => prev.id === paymentId);
                        if (p) {
                            p.payoutStatus = 'SETTLED';
                        }
                    });

                    transaction.update(guestDocRef, { paymentHistory: updatedPaymentHistory });
                });
                console.log(`[Webhook: Razorpay-Payouts] Payment ${paymentId} marked as SETTLED.`);
                break;
            }

            case 'payout.failed':
            case 'payout.rejected':
            case 'payout.reversed': {
                const failureReason = payout.failure_reason || event.event;
                console.warn(`[Webhook: Razorpay-Payouts] Payout failed for payment ${paymentId}. Reason: ${failureReason}. Triggering refund.`);

                await dataDb.runTransaction(async (transaction) => {
                    const guestDoc = await transaction.get(guestDocRef);
                    if (!guestDoc.exists) return;

                    const guest = guestDoc.data() as Guest;
                    const paymentEntry = guest.paymentHistory?.find(p => p.id === paymentId);
                    
                    if (!paymentEntry || paymentEntry.payoutStatus === 'REFUNDED' || paymentEntry.payoutStatus === 'REFUND_PENDING') {
                        console.log(`[Webhook: Razorpay-Payouts] Refund already in progress or completed for ${paymentId}.`);
                        return;
                    }

                    // 1. Update status to PAYOUT_FAILED
                    const updatedHistory = produce(guest.paymentHistory || [], draft => {
                        const p = draft.find(prev => prev.id === paymentId);
                        if (p) {
                            p.payoutStatus = 'PAYOUT_FAILED';
                            p.payoutFailureReason = failureReason;
                        }
                    });

                    transaction.update(guestDocRef, { paymentHistory: updatedHistory });
                });

                // 2. Trigger Refund (Safe Flow)
                // We don't need to check status again since the webhook *is* the failure status
                try {
                    console.log(`[Webhook: Razorpay-Payouts] Initiating automatic refund for failed payout ${payout.id}...`);
                    await razorpay.payments.refund(paymentId, {
                        notes: {
                            reason: "Payout failed: " + failureReason,
                            payoutId: payout.id
                        }
                    });

                    // 3. Revert Ledger
                    await dataDb.runTransaction(async (revertTx) => {
                        const latestGuestDoc = await revertTx.get(guestDocRef);
                        if (!latestGuestDoc.exists) return;
                        
                        const guestCurrent = latestGuestDoc.data() as Guest;
                        const updatedGuest = produce(guestCurrent, draft => {
                            const pIndex = draft.paymentHistory?.findIndex(p => p.id === paymentId);
                            const pEntry = draft.paymentHistory?.[pIndex ?? -1];
                            
                            if (pIndex !== undefined && pIndex !== -1) {
                                draft.paymentHistory![pIndex].payoutStatus = 'REFUND_PENDING';
                                draft.paymentHistory![pIndex].notes = `Refund Initiated due to payout failure: ${failureReason}`;
                            }

                            draft.ledger.push({
                                id: `revert-${paymentId}`,
                                date: new Date().toISOString(),
                                type: 'debit',
                                description: `Revert: Payout failed (${failureReason})`,
                                amount: pEntry?.amount || 0
                            });

                            const totalDebits = draft.ledger.filter(e => e.type === 'debit').reduce((sum, e) => sum + e.amount, 0);
                            const totalCredits = draft.ledger.filter(e => e.type === 'credit').reduce((sum, e) => sum + e.amount, 0);
                            draft.balance = totalDebits - totalCredits;
                            if (draft.balance > 0) {
                                draft.rentStatus = draft.balance >= draft.rentAmount ? 'unpaid' : 'partial';
                            }
                        });

                        revertTx.set(guestDocRef, updatedGuest);
                    });

                    // 4. Notify Owner
                    await createAndSendNotification({
                        ownerId: ownerId,
                        notification: { 
                            type: 'payout-failed', 
                            title: 'Payout Failed & Refunded', 
                            message: `The settlement of ₹${payout.amount / 100} failed (${failureReason}). The tenant has been automatically refunded.`, 
                            targetId: ownerId 
                        }
                    });

                } catch (refundError: any) {
                    const errorMsg = refundError.message || "Unknown error";
                    console.error(`[Webhook: Razorpay-Payouts] CRITICAL: Refund failed for payment ${paymentId}:`, errorMsg);
                    
                    // Log to central alerts collection
                    await adminDb.collection('payment_alerts').add({
                        type: 'REFUND_FAILED',
                        paymentId,
                        payoutId: payout.id,
                        ownerId,
                        guestId,
                        error: errorMsg,
                        timestamp: new Date().toISOString(),
                        severity: 'CRITICAL'
                    });

                    // Update state to FAILED for manual intervention
                    await guestDocRef.update({
                        paymentHistory: produce((await guestDocRef.get()).data()?.paymentHistory || [], (draft: any) => {
                            const p = draft.find((prev: any) => prev.id === paymentId);
                            if (p) p.payoutStatus = 'FAILED';
                        })
                    });
                }
                break;
            }

            default:
                console.log(`[Webhook: Razorpay-Payouts] Unhandled event: ${event.event}`);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error processing Razorpay Payout webhook:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
