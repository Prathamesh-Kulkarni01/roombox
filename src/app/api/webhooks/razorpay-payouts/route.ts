
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { resolveTenant } from '@/platform/auth/server/tenant-resolver';
import { getAdminDb } from '@/lib/firebaseAdmin';
import type { Guest, Payment, User } from '@/lib/types';
import { produce } from 'immer';
import { createAndSendNotification } from '@/lib/actions/notificationActions';
import Razorpay from 'razorpay';
import { FieldValue } from 'firebase-admin/firestore';

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

        const { db: adminDb } = await resolveTenant(req);
        
        // --- 1. IDEMPOTENCY CHECK ---
        const eventRef = adminDb.collection('processed_webhook_events').doc(event.id);
        const eventDoc = await eventRef.get();
        if (eventDoc.exists) {
            console.log(`[Webhook: Razorpay-Payouts] Event ${event.id} already processed. Skipping.`);
            return NextResponse.json({ success: true });
        }

        // --- 2. OWNER & GUEST LOOKUP ---
        let ownerId = payout.notes?.ownerId;
        
        if (!ownerId && payout.fund_account_id) {
            console.log(`[Webhook: Razorpay-Payouts] ownerId missing in notes. Searching by fund_account_id: ${payout.fund_account_id}`);
            const ownerQuery = await adminDb.collection('users')
                .where('subscription.payoutMethods', 'array-contains', { razorpay_fund_account_id: payout.fund_account_id })
                .limit(1)
                .get();
            
            if (!ownerQuery.empty) {
                ownerId = ownerQuery.docs[0].id;
                console.log(`[Webhook: Razorpay-Payouts] Found owner via fund_account_id: ${ownerId}`);
            }
        }

        if (!ownerId) {
            console.error('[Webhook: Razorpay-Payouts] Could not determine ownerId. Cannot process.');
            // Still mark as processed so we don't keep failing on a "ghost" payout
            await eventRef.set({ processedAt: FieldValue.serverTimestamp(), status: 'error', error: 'Missing ownerId' });
            return NextResponse.json({ success: true });
        }
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
                            p.payoutProcessedAt = new Date().toISOString();
                        }
                    });

                    transaction.update(guestDocRef, { paymentHistory: updatedPaymentHistory });
                });
                
                await eventRef.set({ processedAt: FieldValue.serverTimestamp(), status: 'success', event: event.event });
                console.log(`[Webhook: Razorpay-Payouts] Payment ${paymentId} marked as SETTLED.`);
                break;
            }

            case 'payout.failed':
            case 'payout.rejected':
            case 'payout.reversed': {
                const failureReason = payout.failure_reason || event.event;
                console.warn(`[Webhook: Razorpay-Payouts] Payout failed for payment ${paymentId}. Reason: ${failureReason}. Triggering reversal.`);

                // 1. ATOMIC: Revert Ledger & Mark Status
                const result = await dataDb.runTransaction(async (transaction) => {
                    const guestDoc = await transaction.get(guestDocRef);
                    if (!guestDoc.exists) return null;

                    const guest = guestDoc.data() as Guest;
                    const paymentEntry = guest.paymentHistory?.find(p => p.id === paymentId);
                    
                    if (!paymentEntry || paymentEntry.payoutStatus === 'REFUNDED' || paymentEntry.payoutStatus === 'REFUND_PENDING') {
                        console.log(`[Webhook: Razorpay-Payouts] Refund already in progress or completed for ${paymentId}.`);
                        return { skip: true };
                    }

                    const amountToRevert = paymentEntry.amount || 0;

                    const updatedGuest = produce(guest, draft => {
                        const pIndex = draft.paymentHistory?.findIndex(p => p.id === paymentId);
                        if (pIndex !== undefined && pIndex !== -1) {
                            draft.paymentHistory![pIndex].payoutStatus = 'REFUND_PENDING';
                            draft.paymentHistory![pIndex].payoutFailureReason = failureReason;
                            draft.paymentHistory![pIndex].notes = `Refund Initiated due to payout failure: ${failureReason}`;
                        }

                        // Add debit to net out the previous credit
                        (draft.ledger || []).push({
                            id: `revert-${paymentId}`,
                            date: new Date().toISOString(),
                            type: 'debit',
                            description: `Revert: Payout failed (${failureReason})`,
                            amount: amountToRevert
                        });

                        // Recalculate balance
                        const totalDebits = (draft.ledger || []).filter(e => e.type === 'debit').reduce((sum, e) => sum + e.amount, 0);
                        const totalCredits = (draft.ledger || []).filter(e => e.type === 'credit').reduce((sum, e) => sum + e.amount, 0);
                        draft.balance = totalDebits - totalCredits;

                        // Update rent status if balance became positive
                        if (draft.balance > 0) {
                            draft.rentStatus = draft.balance >= draft.rentAmount ? 'unpaid' : 'partial';
                        }
                    });

                    transaction.set(guestDocRef, updatedGuest);
                    return { success: true, guestName: guest.name };
                });

                if (result?.skip) {
                    await eventRef.set({ processedAt: FieldValue.serverTimestamp(), status: 'skipped', reason: 'Already refunded' });
                    break;
                }

                // 2. Trigger Refund (External API Call)
                try {
                    console.log(`[Webhook: Razorpay-Payouts] Initiating automatic refund for failed payout ${payout.id}...`);
                    await razorpay.payments.refund(paymentId, {
                        notes: {
                            reason: "Payout failed: " + failureReason,
                            payoutId: payout.id,
                            ownerId,
                            guestId,
                            type: 'rent_refund'
                        }
                    });

                    // 3. Mark Event as Success
                    await eventRef.set({ processedAt: FieldValue.serverTimestamp(), status: 'success', event: event.event });

                    // 4. Notify Owner
                    await createAndSendNotification({
                        ownerId: ownerId,
                        notification: { 
                            type: 'payout-failed', 
                            title: 'Payout Failed & Refunded', 
                            message: `The settlement for ${result?.guestName || 'a guest'} failed (${failureReason}). The tenant has been automatically refunded.`, 
                            targetId: ownerId 
                        }
                    });

                } catch (refundError: any) {
                    const errorMsg = refundError.message || "Unknown error";
                    console.error(`[Webhook: Razorpay-Payouts] CRITICAL: Refund API failed for payment ${paymentId}:`, errorMsg);
                    
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

                    // Mark event with error for monitoring
                    await eventRef.set({ 
                        processedAt: FieldValue.serverTimestamp(), 
                        status: 'error', 
                        event: event.event,
                        error: errorMsg 
                    });

                    // Update state to FAILED for manual intervention (since refund failed)
                    await guestDocRef.update({
                        'paymentHistory': produce((await guestDocRef.get()).data()?.paymentHistory || [], (draft: any) => {
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
