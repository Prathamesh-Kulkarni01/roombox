

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { format, addMonths, setDate, lastDayOfMonth } from 'date-fns';
import type { Guest, Payment, User } from '@/lib/types';
import { produce } from 'immer';
import { createAndSendNotification } from '@/lib/actions/notificationActions';
import { calculateFirstDueDate } from '@/lib/utils';
import { FieldValue } from 'firebase-admin/firestore';


const WEBHOOK_SECRET = process.env.RAZORPAY_RENT_WEBHOOK_SECRET;

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

                if (guest.paymentHistory?.some(p => p.id === payment.id)) {
                    console.log(`Payment ${payment.id} already processed for guest ${guestId}. Skipping.`);
                    return null;
                }

                const newPayment: Payment = {
                    id: payment.id,
                    date: new Date(payment.created_at * 1000).toISOString(),
                    amount: amountPaid,
                    method: 'in-app',
                    forMonth: format(new Date(guest.dueDate), 'MMMM yyyy'),
                    notes: `Paid via ${(payment.method || 'online').toLowerCase()}`,
                    payoutId: order.id,
                    payoutStatus: 'processed',
                    payoutTo: primaryPayoutAccount?.name || 'Linked Account',
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
                console.log(`[Webhook: Razorpay-Rent] Transaction successful. New balance for guest ${guestId}: ₹${updatedGuest.balance}`);

                return {
                    notificationData: {
                        amountPaid,
                        guestName: guest.name,
                        guestId,
                        ownerId,
                    },
                    guestUserId: guest.userId
                };
            });

            if (transactionResult?.notificationData) {
                const { notificationData, guestUserId } = transactionResult;
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

            console.log(`Successfully updated rent payment for guest ${guestId}.`);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error processing Razorpay rent webhook:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
