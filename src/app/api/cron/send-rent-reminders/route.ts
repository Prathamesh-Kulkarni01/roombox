
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

            // Fetch all non-vacated guests for the owner
            const guestsSnapshot = await dataDb.collection('users_data').doc(ownerId).collection('guests')
                .where('isVacated', '==', false)
                .get();

            if (guestsSnapshot.empty) {
                continue;
            }

            // Filter for guests with a userId OR a phone number (for WhatsApp bots)
            const guestsWithAccountsOrPhones = guestsSnapshot.docs
                .map(doc => doc.data() as Guest)
                .filter(guest => !!guest.userId || !!guest.phone);

            for (const guest of guestsWithAccountsOrPhones) {

                // Use the centralized reminder logic
                const reminderInfo = getReminderForGuest(guest, now);

                if (reminderInfo.shouldSend) {

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
                        } catch (e) {
                            console.error(`Failed to send in-app notification to ${guest.userId}`);
                        }
                    }

                    // 2. Send WhatsApp Notification if they have a phone number (RentSutra Automation Pillar)
                    if (guest.phone) {
                        try {
                            // Ensure phone is formatted correctly (e.g., removing +, adding country code if needed)
                            let formattedPhone = guest.phone.replace(/\\D/g, '');
                            if (formattedPhone.length === 10) {
                                formattedPhone = '91' + formattedPhone; // Assuming India for RentSutra
                            }
                            await sendWhatsAppMessage(formattedPhone, reminderInfo.body);
                        } catch (e) {
                            console.error(`Failed to send WhatsApp message to ${guest.phone}`);
                        }
                    }

                    totalRemindersSent++;
                }
            }
        }

        const message = `Reconciliation complete. Sent ${totalRemindersSent} rent reminders.`;
        console.log(message);
        return NextResponse.json({ success: true, message });

    } catch (error: any) {
        console.error('Error in send-rent-reminders cron job:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
