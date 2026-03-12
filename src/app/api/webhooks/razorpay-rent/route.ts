

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { format, addMonths, setDate, lastDayOfMonth } from 'date-fns';
import type { Guest, Payment, User } from '@/lib/types';
import { produce } from 'immer';
import { createAndSendNotification } from '@/lib/actions/notificationActions';
import { calculateFirstDueDate } from '@/lib/utils';
import { FieldValue } from 'firebase-admin/firestore';
import { executePayout, fetchPayoutStatus, fetchPayoutByReference } from '@/lib/actions/payoutActions';
import Razorpay from 'razorpay';
import { UpiPaymentMethod } from '@/lib/types';


const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(req: NextRequest) {
    if (!WEBHOOK_SECRET) {
        console.error('Razorpay rent webhook secret is not set.');
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
            console.warn('[Webhook: Razorpay-Rent] Invalid signature mismatch.');
            return NextResponse.json({ success: false, error: 'Invalid signature.' }, { status: 400 });
        }

        const event = JSON.parse(body);
        console.log(`[Webhook: Razorpay-Rent] Received event: ${event.event} (ID: ${event.id})`);

        if (event.event === 'order.paid' || event.event === 'payment.captured') {
            const order = event.payload.order?.entity || { id: event.payload.payment.entity.order_id, notes: event.payload.payment.entity.notes };
            const payment = event.payload.payment?.entity;

            if (!payment) {
                console.warn('[Webhook: Razorpay-Rent] Payment entity missing from payload.');
                return NextResponse.json({ success: true });
            }

            console.log(`[Webhook: Razorpay-Rent] Processing ${event.event} for order: ${order.id}, payment: ${payment.id}`);

            // Check for wallet recharge
            if (order.notes?.type === 'whatsapp_recharge') {
                const ownerId = order.notes.ownerId;
                console.log(`[Webhook: Razorpay-Rent] Detected WhatsApp recharge for owner: ${ownerId}`);
                // Use payment.amount as fallback/primary as it's more reliable in captured events
                const amount = (payment.amount || order.amount || 0) / 100;
                const credits = Math.floor(amount / 1.5); 

                if (ownerId && !isNaN(credits) && credits > 0) {
                    const adminDb = await getAdminDb();
                    const rechargeRef = adminDb.collection('wallet_recharges').doc(payment.id);
                    
                    try {
                        await adminDb.runTransaction(async (transaction) => {
                            const rechargeDoc = await transaction.get(rechargeRef);
                            if (rechargeDoc.exists) {
                                console.log(`[Webhook: Razorpay-Rent] Recharge ${payment.id} already processed. Skipping.`);
                                return;
                            }

                            const ownerDocRef = adminDb.collection('users').doc(ownerId);
                            transaction.update(ownerDocRef, {
                                'subscription.whatsappCredits': FieldValue.increment(credits),
                                updatedAt: new Date().toISOString()
                            });

                            transaction.set(rechargeRef, {
                                paymentId: payment.id,
                                orderId: order.id,
                                ownerId,
                                amount,
                                credits,
                                method: payment.method,
                                status: 'captured',
                                processedAt: FieldValue.serverTimestamp()
                            });
                        });
                        console.log(`Successfully credited ${credits} messages to owner ${ownerId}'s wallet (from ₹${amount}). Payment ID: ${payment.id}`);
                    } catch (txError: any) {
                        console.error('[Webhook: Razorpay-Rent] Failed to process recharge transaction:', txError.message);
                        throw txError;
                    }
                }
                return NextResponse.json({ success: true, message: 'Recharge processed.' });
            }

            // Handle rent payment
            const { guestId, ownerId } = order.notes || {};
            const amountPaid = payment.amount / 100;
            console.log(`[Webhook: Razorpay-Rent] Rent Payment Details - Guest: ${guestId}, Owner: ${ownerId}, Amount: ₹${amountPaid}, PaymentID: ${payment.id}`);

            if (!guestId || !ownerId) {
                console.warn('[Webhook: Razorpay-Rent] Missing guestId or ownerId in metadata.');
                return NextResponse.json({ success: true, message: 'Webhook processed, but no action taken due to missing metadata.' });
            }

            const adminDb = await getAdminDb();
            const ownerDoc = await adminDb.collection('users').doc(ownerId).get();
            if (!ownerDoc.exists) {
                console.error(`Webhook handler: Owner with ID ${ownerId} not found.`);
                return NextResponse.json({ success: false, error: 'Owner not found.' }, { status: 404 });
            }
            const enterpriseDbId = ownerDoc.data()?.subscription?.enterpriseProject?.databaseId as string | undefined;
            const enterpriseProjectId = ownerDoc.data()?.subscription?.enterpriseProject?.projectId as string | undefined;
            const dataDb = await getAdminDb(enterpriseProjectId, enterpriseDbId);
            const guestDocRef = dataDb.collection('users_data').doc(ownerId).collection('guests').doc(guestId);

                const transactionResult = await dataDb.runTransaction(async (transaction): Promise<any> => {
                const guestDoc = await transaction.get(guestDocRef);
                if (!guestDoc.exists) {
                    console.error(`[Webhook: Razorpay-Rent] ERROR: Guest with ID ${guestId} not found in database.`);
                    return null;
                }

                const guest = guestDoc.data() as Guest;
                const owner = ownerDoc.data() as User;
                const primaryPayoutAccount = owner.subscription?.payoutMethods?.find(m => m.isPrimary && m.isActive);

                // --- 1. IDEMPOTENCY CHECK ---
                const existingPayment = guest.paymentHistory?.find(p => p.id === payment.id);
                if (existingPayment) {
                    const terminalStates = ['SETTLED', 'REFUNDED'];
                    if (existingPayment.payoutStatus && terminalStates.includes(existingPayment.payoutStatus)) {
                        console.log(`Payment ${payment.id} is in terminal state '${existingPayment.payoutStatus}'. Skipping.`);
                        return null;
                    }
                    console.log(`Payment ${payment.id} found with status '${existingPayment.payoutStatus}'. Resuming processing...`);
                    return { notificationData: { amountPaid, guestName: guest.name, guestId, ownerId }, guestUserId: guest.userId, guestData: guest, skipCredit: true };
                }

                // --- 2. DUPLICATE PAYMENT PROTECTION ---
                const sameMonthPayment = guest.paymentHistory?.find(p => p.forMonth === format(new Date(guest.dueDate), 'MMMM yyyy') && p.payoutStatus !== 'REFUNDED');
                if (sameMonthPayment) {
                    console.warn(`[Webhook: Razorpay-Rent] Duplicate payment detected for ${guest.name} for month ${sameMonthPayment.forMonth}. Triggering auto-refund.`);
                    return { notificationData: { amountPaid, guestName: guest.name, guestId, ownerId }, guestUserId: guest.userId, guestData: guest, triggerAutoRefund: true, refundReason: 'Duplicate payment for same month' };
                }

                const newPayment: Payment = {
                    id: payment.id,
                    date: new Date(payment.created_at * 1000).toISOString(),
                    amount: amountPaid,
                    method: 'in-app',
                    forMonth: format(new Date(guest.dueDate), 'MMMM yyyy'),
                    notes: `Paid via ${(payment.method || 'online').toLowerCase()}`,
                    payoutStatus: 'COMPLETED',
                    payoutMode: order.notes?.payoutMode || owner.subscription?.payoutMode || 'PAYOUT',
                    payoutTo: primaryPayoutAccount?.name || 'Linked Account',
                    // --- 3. DESTINATION SNAPSHOTTING ---
                    payoutSnapshot: {
                        mode: order.notes?.payoutMode || owner.subscription?.payoutMode || 'PAYOUT',
                        fund_account_id: primaryPayoutAccount?.razorpay_fund_account_id,
                        vpa: (primaryPayoutAccount as any)?.vpaAddress || (primaryPayoutAccount as any)?.vpa,
                        account_id: owner.subscription?.razorpay_account_id,
                        payout_type: primaryPayoutAccount?.type // 'upi' or 'bank_account'
                    }
                };

                const ledgerEntry = {
                    id: `credit-${payment.id}`,
                    date: newPayment.date,
                    type: 'credit' as const,
                    description: `Rent payment via ${payment.method}`,
                    amount: amountPaid
                };

                const updatedGuest = produce(guest, draft => {
                    draft.ledger.push(ledgerEntry);
                    if (!draft.paymentHistory) draft.paymentHistory = [];
                    draft.paymentHistory.push(newPayment);

                    const totalDebits = draft.ledger.filter(e => e.type === 'debit').reduce((sum, e) => sum + e.amount, 0);
                    const totalCredits = draft.ledger.filter(e => e.type === 'credit').reduce((sum, e) => sum + e.amount, 0);
                    const newBalance = totalDebits - totalCredits;

                    if (newBalance <= 0) {
                        draft.rentStatus = 'paid';
                        draft.dueDate = calculateFirstDueDate(new Date(draft.dueDate), draft.rentCycleUnit, draft.rentCycleValue, draft.billingAnchorDay).toISOString();
                    } else {
                        draft.rentStatus = 'partial';
                    }
                });

                transaction.set(guestDocRef, updatedGuest);
                console.log(`[Webhook: Razorpay-Rent] Ledger updated. New balance for guest ${guestId}: ₹${updatedGuest.balance}. Rent Status: ${updatedGuest.rentStatus}`);

                return {
                    notificationData: {
                        amountPaid,
                        guestName: guest.name,
                        guestId,
                        ownerId,
                    },
                    guestUserId: guest.userId,
                    guestData: updatedGuest, // Use updated data
                    skipCredit: false
                };
            });

            if (transactionResult?.notificationData) {
                const { notificationData, guestUserId, skipCredit } = transactionResult;
                
                if (!skipCredit) {
                    await createAndSendNotification({
                        ownerId: notificationData.ownerId,
                        notification: { type: 'rent-paid', title: 'Rent Received!', message: `You have received ₹${notificationData.amountPaid.toLocaleString('en-IN')} from ${notificationData.guestName}.`, link: `/dashboard/tenant-management/${notificationData.guestId}`, targetId: notificationData.ownerId }
                    });

                    if (guestUserId) {
                        await createAndSendNotification({
                            ownerId: notificationData.ownerId,
                            notification: { type: 'rent-receipt', title: 'Payment Successful', message: `Your payment of ₹${notificationData.amountPaid.toLocaleString('en-IN')} has been recorded.`, link: '/tenants/my-pg', targetId: guestUserId }
                        });
                    }
                }

                if (transactionResult.triggerAutoRefund) {
                    throw new Error(`AUTO_REFUND: ${transactionResult.refundReason}`);
                }

                // --- AUTOMATED PAYOUT TO OWNER (HYBRID MODEL) ---
                try {
                    const ownerDoc = await adminDb.collection('users').doc(notificationData.ownerId).get();
                    const owner = ownerDoc.data() as User;
                    // ALWAYS use the payout mode from the order notes to ensure consistency with what the tenant paid for
                    const payoutMode = order.notes?.payoutMode || owner.subscription?.payoutMode || 'PAYOUT';

                    if (payoutMode === 'ROUTE') {
                        console.log(`[Webhook: Razorpay-Rent] Owner ${notificationData.ownerId} is in ROUTE mode. Automated transfer handled by Razorpay. Skipping manual payout.`);
                        
                        // Update payment history to reflect ROUTE settlement
                        const guestData = transactionResult.guestData as Guest;
                        const paymentIndex = guestData.paymentHistory?.findIndex((p: Payment) => p.id === payment.id);
                        if (paymentIndex !== undefined && paymentIndex !== -1) {
                            const updatedPaymentHistory = [...(guestData.paymentHistory || [])];
                            updatedPaymentHistory[paymentIndex] = {
                                ...updatedPaymentHistory[paymentIndex],
                                payoutStatus: 'SETTLED',
                                payoutMode: 'ROUTE'
                            };
                            await guestDocRef.update({ paymentHistory: updatedPaymentHistory });
                        }
                        return; // Done for ROUTE mode
                    }

                    // --- PAYOUT MODE (Manual via RazorpayX) ---
                    const guestDataAfterTx = transactionResult.guestData as Guest;
                    const paymentRecord = guestDataAfterTx.paymentHistory?.find((p: Payment) => p.id === payment.id);
                    const snapshot = paymentRecord?.payoutSnapshot;

                    if (snapshot?.fund_account_id) {
                        const fundAccountId = snapshot.fund_account_id;
                        const commissionPercent = parseFloat(process.env.COMMISSION_PERCENT || "1.5");
                        const amountInPaise = Math.round(notificationData.amountPaid * 100);
                        const commissionInPaise = Math.round(amountInPaise * (commissionPercent / 100));
                        const payoutAmountPaise = amountInPaise - commissionInPaise;
                        
                        // Determine mode based on snapshotted type
                        const mode = snapshot.payout_type === 'upi' ? 'UPI' : 'IMPS';

                        console.log(`[Webhook: Razorpay-Rent] Initiating automated payout for owner ${notificationData.ownerId}. Mode: ${mode}, Amount: ₹${payoutAmountPaise / 100} (after ${commissionPercent}% commission)`);

                        const payoutResult = await executePayout({
                            fund_account_id: fundAccountId,
                            amountPaise: payoutAmountPaise,
                            idempotencyKey: payment.id,
                            purpose: 'payout',
                            mode: mode,
                            notes: {
                                guestId: notificationData.guestId,
                                guestName: notificationData.guestName,
                                paymentId: payment.id,
                                ownerId: notificationData.ownerId, // CRITICAL for webhook lookup
                                type: 'rent_payout'
                            }
                        });

                        console.log(`[Webhook: Razorpay-Rent] Payout initiated successfully. Payout ID: ${payoutResult.payout.id}`);
                        
                        // Update the guest's payment record with the payoutId and PENDING status
                        const guestData = transactionResult.guestData as Guest;
                        const paymentIndex = guestData.paymentHistory?.findIndex((p: Payment) => p.id === payment.id);
                        if (paymentIndex !== undefined && paymentIndex !== -1) {
                            const updatedPaymentHistory = [...(guestData.paymentHistory || [])];
                            updatedPaymentHistory[paymentIndex] = {
                                ...updatedPaymentHistory[paymentIndex],
                                payoutId: payoutResult.payout.id,
                                payoutStatus: 'PAYOUT_PENDING',
                            };
                            await guestDocRef.update({ paymentHistory: updatedPaymentHistory });
                        }
                    } else {
                        console.warn(`[Webhook: Razorpay-Rent] No primary fund account found for owner ${notificationData.ownerId}. Skipping automated payout.`);
                    }
                } catch (payoutError: any) {
                    const message = payoutError.message || "Unknown payout error";
                    console.error(`[Webhook: Razorpay-Rent] Error during automated payout attempt:`, message);
                    
                    try {
                        // Anti-Double-Loss Check: Maybe the payout actually succeeded but we got a timeout?
                        const existingPayout = await fetchPayoutByReference(payment.id);
                        if (existingPayout && (existingPayout.status === 'processed' || existingPayout.status === 'processing')) {
                            console.log(`[Webhook: Razorpay-Rent] Payout ${existingPayout.id} actually exists with status ${existingPayout.status}. Skipping auto-refund.`);
                            
                            // Update status to PAYOUT_PENDING or SETTLED based on what we found
                            const guestData = transactionResult.guestData as Guest;
                            const paymentIndex = guestData.paymentHistory?.findIndex((p: Payment) => p.id === payment.id);
                            if (paymentIndex !== undefined && paymentIndex !== -1) {
                                const updatedPaymentHistory = [...(guestData.paymentHistory || [])];
                                updatedPaymentHistory[paymentIndex] = {
                                    ...updatedPaymentHistory[paymentIndex],
                                    payoutId: existingPayout.id,
                                    payoutStatus: existingPayout.status === 'processed' ? 'SETTLED' : 'PAYOUT_PENDING',
                                };
                                await guestDocRef.update({ paymentHistory: updatedPaymentHistory });
                            }
                            return;
                        }

                        // If we reach here, no successful payout was found, safe to refund
                        // 1b. Initiate Refund via Razorpay SDK
                        console.log(`[Webhook: Razorpay-Rent] Initiating automatic refund for payment ${payment.id}...`);
                        await razorpay.payments.refund(payment.id, {
                            notes: {
                                reason: transactionResult.refundReason || "Auto-settlement to owner failed",
                                payoutError: message,
                                ownerId: notificationData.ownerId, // For refund webhook
                                guestId: notificationData.guestId,
                                type: 'rent_refund'
                            }
                        });

                        // 2. Update state to REFUND_PENDING and revert ledger
                        await dataDb.runTransaction(async (revertTx) => {
                            const latestGuestDoc = await revertTx.get(guestDocRef);
                            if (!latestGuestDoc.exists) return;
                            
                            const guestCurrent = latestGuestDoc.data() as Guest;
                            const updatedGuest = produce(guestCurrent, draft => {
                                // Add debit to net out the credit
                                draft.ledger.push({
                                    id: `revert-${payment.id}`,
                                    date: new Date().toISOString(),
                                    type: 'debit',
                                    description: `Revert: ${transactionResult.refundReason || 'Settlement failed'}`,
                                    amount: amountPaid
                                });
                                
                                // Update status to REFUND_PENDING
                                const pHistory = draft.paymentHistory?.find(p => p.id === payment.id);
                                if (pHistory) {
                                    pHistory.payoutStatus = 'REFUND_PENDING';
                                    pHistory.notes = `Refund Initiated: ${message || transactionResult.refundReason}`;
                                }
                                
                                // Recalculate balance and rent status
                                const totalDebits = draft.ledger.filter(e => e.type === 'debit').reduce((sum, e) => sum + e.amount, 0);
                                const totalCredits = draft.ledger.filter(e => e.type === 'credit').reduce((sum, e) => sum + e.amount, 0);
                                draft.balance = totalDebits - totalCredits;
                                
                                if (draft.balance > 0) {
                                    draft.rentStatus = draft.balance >= draft.rentAmount ? 'unpaid' : 'partial';
                                }
                            });

                            revertTx.set(guestDocRef, updatedGuest);
                        });

                        // 3. Notify Owner
                        await createAndSendNotification({
                            ownerId: notificationData.ownerId,
                            notification: { 
                                type: 'payout-failed', 
                                title: 'Payment Refunded', 
                                message: `A payment of ₹${amountPaid} from ${notificationData.guestName} was automatically refunded because we couldn't settle it to your account. Please check your settlement details.`, 
                                targetId: notificationData.ownerId 
                            }
                        });

                    } catch (refundOpError: any) {
                        const errorMsg = refundOpError.message || "Unknown error";
                        console.error(`[Webhook: Razorpay-Rent] CRITICAL: Automatic refund or ledger revert failed:`, errorMsg);
                        
                        const adminDb = await getAdminDb();
                        await adminDb.collection('payment_alerts').add({
                            type: 'AUTO_REFUND_FAILED',
                            paymentId: payment.id,
                            ownerId: notificationData.ownerId,
                            guestId: notificationData.guestId,
                            error: errorMsg,
                            timestamp: new Date().toISOString(),
                            severity: 'CRITICAL'
                        });
                    }
                }
            }

            console.log(`Successfully updated rent payment for guest ${guestId}.`);
        }

        // --- REFUND PROCESSED (Terminal State for Refunds) ---
        if (event.event === 'refund.processed') {
            const refund = event.payload.refund.entity;
            const paymentId = refund.payment_id;
            const { ownerId, guestId, type } = refund.notes || {};

            if (type !== 'rent_refund' || !ownerId || !guestId) {
                console.log(`[Webhook: Razorpay-Rent] Ignoring non-rent refund event: ${event.event}`);
                return NextResponse.json({ success: true });
            }

            console.log(`[Webhook: Razorpay-Rent] Processing refund for payment ${paymentId}. Status: SETTLED`);

            const adminDb = await getAdminDb();
            const ownerDoc = await adminDb.collection('users').doc(ownerId).get();
            if (ownerDoc.exists) {
                const enterpriseDbId = ownerDoc.data()?.subscription?.enterpriseProject?.databaseId as string | undefined;
                const enterpriseProjectId = ownerDoc.data()?.subscription?.enterpriseProject?.projectId as string | undefined;
                const dataDb = await getAdminDb(enterpriseProjectId, enterpriseDbId);
                const guestDocRef = dataDb.collection('users_data').doc(ownerId).collection('guests').doc(guestId);

                await dataDb.runTransaction(async (transaction) => {
                    const guestDoc = await transaction.get(guestDocRef);
                    if (!guestDoc.exists) return; 

                    const guest = guestDoc.data() as Guest;
                    const updatedHistory = produce(guest.paymentHistory || [], draft => {
                        const p = draft.find(prev => prev.id === paymentId);
                        if (p) p.payoutStatus = 'REFUNDED';
                    });

                    transaction.update(guestDocRef, { paymentHistory: updatedHistory });
                });

                // Notify Tenant (if we have userId)
                const guestData = (await guestDocRef.get()).data() as Guest;
                if (guestData.userId) {
                    await createAndSendNotification({
                        ownerId: ownerId,
                        notification: { 
                            type: 'refund-success', 
                            title: 'Refund Processed', 
                            message: `Your refund of ₹${refund.amount / 100} has been processed successfully.`, 
                            targetId: guestData.userId 
                        }
                    });
                }
            }
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ success: true, message: 'Unhandled event type.' });
    } catch (error: any) {
        console.error('Error processing Razorpay rent webhook:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
