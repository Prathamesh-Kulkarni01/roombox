'use server';

import { selectOwnerDataAdminDb } from '@/lib/firebaseAdmin';
import { createAndSendNotification } from '@/lib/actions/notificationActions';
import type { Guest } from '@/lib/types';
import { getReminderForGuest } from '@/lib/reminder-logic';
import { sendWhatsAppTemplate } from '@/lib/whatsapp/send-message';
import { getBrandedAppUrl } from '@/lib/actions/siteActions';

export async function sendRemindersForOwner(ownerId: string, now?: Date): Promise<{ success: boolean; sentCount: number; errorCount: number }> {
    const dataDb = await selectOwnerDataAdminDb(ownerId);
    const currentDate = now || new Date();
    let totalRemindersSent = 0;
    let totalErrors = 0;

    // Fetch branded app url for the owner
    const ownerAppUrl = await getBrandedAppUrl(ownerId);

    // Optimization: Only fetch guests whose rent is due within the next 3 days
    const threeDaysLater = new Date(currentDate.getTime() + 3 * 24 * 60 * 60 * 1000);
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
            console.error(`[Reminders] Failed to fetch guests for owner ${ownerId}`, error);
            return { success: false, sentCount: 0, errorCount: 1 };
        }
    }

    if (guestsSnapshot.empty) {
        return { success: true, sentCount: 0, errorCount: 0 };
    }

    // Filter for guests with a userId OR a phone number (for WhatsApp bots)
    const guestsWithAccountsOrPhones = guestsSnapshot.docs
        .map(doc => ({ ref: doc.ref, data: doc.data() as Guest }))
        .filter(item => !!item.data.userId || !!item.data.phone);

    // BATCHING: Process 10 guests at a time to prevent timeout and respect rate limits
    const CHUNK_SIZE = 10;
    const nowString = currentDate.toISOString();

    for (let i = 0; i < guestsWithAccountsOrPhones.length; i += CHUNK_SIZE) {
        const chunk = guestsWithAccountsOrPhones.slice(i, i + CHUNK_SIZE);

        const batchPromises = chunk.map(async ({ ref, data: guest }) => {
            // Use the centralized reminder logic
            const reminderInfo = getReminderForGuest(guest, currentDate);

            if (!reminderInfo.shouldSend || !reminderInfo.type) return false;

            // IDEMPOTENCY: Check if we already sent this exact reminder type very recently.
            if (guest.lastReminderType === reminderInfo.type && guest.lastReminderSentAt) {
                const diffMs = currentDate.getTime() - new Date(guest.lastReminderSentAt).getTime();
                const diffHours = diffMs / (1000 * 60 * 60);

                // Define threshold in hours for each cycle unit
                const thresholdHours: Record<string, number> = {
                    'minutes': 0.008, // ~30 seconds
                    'hours': 0.5,    // 30 minutes
                    'days': 6,       // 6 hours
                    'weeks': 48,     // 2 days
                    'months': 360    // 15 days
                };

                const currentThreshold = thresholdHours[guest.rentCycleUnit] || 360;

                if (diffHours < currentThreshold) {
                    console.log(`[Idempotency] Skipping duplicate ${reminderInfo.type} reminder for guest: ${guest.id} (sent ${Math.round(diffHours * 10) / 10}h ago, threshold ${currentThreshold}h)`);
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

                    const payUrl = `${ownerAppUrl}/pay/${guest.id}`;
                    const dueDateObj = new Date(guest.dueDate);
                    const monthLabel = dueDateObj.toLocaleDateString('en-IN', { month: 'long' });
                    const dateLabel = dueDateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

                    await sendWhatsAppTemplate(formattedPhone, 'new_rent_due_reminder_utility', 'en_US', [
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
        const chunkSent = results.filter(sent => sent).length;
        totalRemindersSent += chunkSent;
        totalErrors += results.length - chunkSent;

        // Rate limiting delay between chunks
        if (i + CHUNK_SIZE < guestsWithAccountsOrPhones.length) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    console.log(`[Reminders] Owner ${ownerId}: Sent ${totalRemindersSent} reminders. Failed: ${totalErrors}.`);
    return { success: true, sentCount: totalRemindersSent, errorCount: totalErrors };
}
