
'use server';

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { reconcileAllGuests } from '@/lib/actions/reconciliationActions';
import { createAndSendNotification } from '@/lib/actions/notificationActions';
import type { Guest } from '@/lib/types';
import { getReminderForGuest } from '@/lib/reminder-logic';
import { sendWhatsAppMessage } from '@/lib/whatsapp/send-message';


export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization');
        const secret = process.env.CRON_SECRET;

        if (process.env.NODE_ENV === 'production' && (!secret || authHeader !== `Bearer ${secret}`)) {
            return new Response('Unauthorized', { status: 401 });
        }

        // --- Step 1: Reconcile all rents first to ensure guest statuses are up-to-date ---
        const reconciliationResult = await reconcileAllGuests();
        if (!reconciliationResult.success) {
            console.warn('Rent reconciliation part of the reminder job may have failed for some tenants.');
        }

        // --- Step 2: Fetch updated guest data and send reminders ---
        const adminDb = await getAdminDb();
        const usersSnapshot = await adminDb.collection('users').where('role', '==', 'owner').get();

        let totalRemindersSent = 0;
        const now = new Date();

        for (const userDoc of usersSnapshot.docs) {
            const ownerId = userDoc.id;
            const enterpriseDbId = (userDoc.data()?.subscription?.enterpriseProject?.databaseId) as string | undefined;
            const enterpriseProjectId = (userDoc.data()?.subscription?.enterpriseProject?.projectId) as string | undefined;
            const dataDb = await getAdminDb(enterpriseProjectId, enterpriseDbId);

            // Optimization: Only fetch guests whose rent is due within the next 3 days (max lead time for reminders)
            const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
            let guestsSnapshot;

            try {
                // Fetch non-vacated guests who might need a reminder soon (requires composite index)
                guestsSnapshot = await dataDb.collection('users_data').doc(ownerId).collection('guests')
                    .where('isVacated', '==', false)
                    .where('dueDate', '<=', threeDaysLater.toISOString())
                    .get();
            } catch (error: any) {
                if (error.code === 9 || error.message?.includes('FAILED_PRECONDITION')) {
                    console.warn(`[Reminders] Index missing for optimized query. Falling back to full sweep for owner ${ownerId}.`);
                    // Fallback to full sweep
                    guestsSnapshot = await dataDb.collection('users_data').doc(ownerId).collection('guests')
                        .where('isVacated', '==', false)
                        .get();
                } else {
                    throw error;
                }
            }

            if (guestsSnapshot.empty) {
                continue;
            }

            // Filter for guests with a userId OR a phone number (for WhatsApp bots)
            const guestsWithAccountsOrPhones = guestsSnapshot.docs
                .map(doc => ({ ref: doc.ref, data: doc.data() as Guest }))
                .filter(item => !!item.data.userId || !!item.data.phone);

            // BATCHING: Process 10 guests at a time to prevent timeout and respect rate limits
            const CHUNK_SIZE = 10;
            const nowString = now.toISOString();

            for (let i = 0; i < guestsWithAccountsOrPhones.length; i += CHUNK_SIZE) {
                const chunk = guestsWithAccountsOrPhones.slice(i, i + CHUNK_SIZE);

                const batchPromises = chunk.map(async ({ ref, data: guest }) => {
                    // Use the centralized reminder logic
                    const reminderInfo = getReminderForGuest(guest, now);

                    if (!reminderInfo.shouldSend || !reminderInfo.type) return false;

                    // IDEMPOTENCY: Check if we already sent this exact reminder type very recently (within 15 days for a monthly cycle)
                    if (guest.lastReminderType === reminderInfo.type && guest.lastReminderSentAt) {
                        const diffMs = now.getTime() - new Date(guest.lastReminderSentAt).getTime();
                        const diffDays = diffMs / (1000 * 60 * 60 * 24);
                        if (diffDays < 15) {
                            console.log(`[Idempotency] Skipping duplicate ${reminderInfo.type} reminder for guest: ${guest.id}`);
                            return false;
                        }
                    }

                    let messageSent = false;

                    // 1. Send In-App Notification if they have a web account
                    if (guest.userId) {
                        try {
                            await createAndSendNotification({
                                ownerId: ownerId,
                                notification: {
                                    type: 'rent-reminder',
                                    title: reminderInfo.title,
                                    message: reminderInfo.body,
                                    link: '/tenants/my-pg',
                                    targetId: guest.userId,
                                }
                            });
                            messageSent = true;
                        } catch (e) {
                            console.error(`Failed to send in-app notification to ${guest.userId}`);
                        }
                    }

                    // 2. Send WhatsApp Notification Template if they have a phone number
                    if (guest.phone) {
                        try {
                            let formattedPhone = guest.phone.replace(/\D/g, '');
                            if (formattedPhone.length === 10) {
                                formattedPhone = '91' + formattedPhone;
                            }

                            const { sendWhatsAppTemplate } = await import('@/lib/whatsapp/send-message');

                            const appUrl = (process.env.APP_URL || 'https://roombox.in');
                            const payUrl = `${appUrl}/pay/${guest.id}`;
                            const dueDateObj = new Date(guest.dueDate);
                            const monthLabel = dueDateObj.toLocaleDateString('en-IN', { month: 'long' });
                            const dateLabel = dueDateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

                            await sendWhatsAppTemplate(formattedPhone, 'new_rent_due_reminder', 'en_US', [
                                {
                                    type: 'body',
                                    parameters: [
                                        { type: 'text', text: guest.name }, // {{1}}
                                        { type: 'text', text: monthLabel }, // {{2}}
                                        { type: 'text', text: dateLabel }, // {{3}}
                                        { type: 'text', text: String(guest.rentAmount) }, // {{4}}
                                        { type: 'text', text: guest.pgName || 'Our Property' }, // {{5}}
                                        { type: 'text', text: payUrl }, // {{6}} - Payment Link in Body
                                        { type: 'text', text: String(guest.balance || guest.rentAmount) } // {{7}} - Balance in Body
                                    ]
                                }
                            ], ownerId, guest.id);
                            messageSent = true;
                        } catch (e) {
                            console.error(`Failed to send WhatsApp template to ${guest.phone}`, e);
                        }
                    }

                    // Update Guest Document for Idempotency
                    if (messageSent) {
                        try {
                            await ref.update({
                                lastReminderSentAt: nowString,
                                lastReminderType: reminderInfo.type
                            });
                            return true;
                        } catch (err) {
                            console.error(`Failed to update idempotency keys for guest ${guest.id}:`, err);
                        }
                    }

                    return false;
                });

                // Wait for the chunk to process
                const results = await Promise.all(batchPromises);
                totalRemindersSent += results.filter(sent => sent).length;

                // Rate limiting delay between chunks
                if (i + CHUNK_SIZE < guestsWithAccountsOrPhones.length) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
        }

        const message = `Reconciliation complete. Successfully sent ${totalRemindersSent} unique rent reminders.`;
        console.log(message);
        return NextResponse.json({ success: true, message });

    } catch (error: any) {
        console.error('Error in send-rent-reminders cron job:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
