
'use server'

import { getAdminDb, selectOwnerDataAdminDb } from '@/lib/firebaseAdmin';
import type { Notification, User, Guest } from '@/lib/types';
import { sendPushToUser } from '../notifications';
import { doc, getDoc, updateDoc, increment, collection, writeBatch } from 'firebase/firestore';
import axios from 'axios';

interface CreateAndSendNotificationParams {
    ownerId: string;
    notification: Omit<Notification, 'id' | 'date' | 'isRead'>;
}

type WhatsAppStatus = 'sent' | 'failed' | 'skipped';

const WHATSAPP_MESSAGE_COST = 1.5;

/**
 * Sends a WhatsApp message using the Facebook Graph API.
 * @param to The 10-digit phone number of the recipient.
 * @param message The text message to send.
 */
async function sendWhatsAppMessage(to: string, message: string) {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

    if (!phoneNumberId || !accessToken) {
        console.error("WhatsApp credentials (Phone Number ID or Access Token) are missing.");
        throw new Error("WhatsApp credentials not configured.");
    }

    const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;

    const payload = {
        messaging_product: "whatsapp",
        to: `91${to}`, // Prepending country code for India
        type: "text",
        text: {
            body: message
        }
    };

    try {
        await axios.post(url, payload, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });
        console.log(`WhatsApp message sent to 91${to}`);
    } catch (error: any) {
        console.error("Error sending WhatsApp message via Facebook Graph API:", error.response?.data || error.message);
        throw new Error(error.response?.data?.error?.message || 'Failed to send WhatsApp message.');
    }
}

export async function createAndSendNotification({ ownerId, notification }: CreateAndSendNotificationParams): Promise<{ whatsAppStatus: WhatsAppStatus }> {
    if (!ownerId || !notification || !notification.targetId) {
        console.error('createAndSendNotification: ownerId, notification, and targetId are required.');
        return { whatsAppStatus: 'skipped' };
    }
    
    const adminDb = await getAdminDb();
    const ownerDocRef = adminDb.collection('users').doc(ownerId);
    
    let targetPhoneNumber: string | undefined;
    let targetFcmToken: string | undefined;
    let whatsAppStatus: WhatsAppStatus = 'skipped';
    
    const [ownerDoc, targetUserDoc] = await Promise.all([
        ownerDocRef.get(),
        adminDb.collection('users').doc(notification.targetId).get()
    ]);
    
    if (!ownerDoc.exists) {
        console.error('Owner not found.');
        return { whatsAppStatus: 'skipped' };
    }
    const owner = ownerDoc.data() as User;

    if (targetUserDoc.exists) {
        const targetUser = targetUserDoc.data() as User;
        targetPhoneNumber = targetUser.phone;
        targetFcmToken = targetUser.fcmToken;
    } else {
        const dataDb = await selectOwnerDataAdminDb(ownerId);
        const guestDocRef = dataDb.collection('users_data').doc(ownerId).collection('guests').doc(notification.targetId);
        const guestDoc = await guestDocRef.get();
        if (guestDoc.exists) {
            targetPhoneNumber = (guestDoc.data() as Guest).phone;
        }
    }

    // Send WhatsApp if enabled, credits are available, and we have a phone number.
    if (owner.subscription?.premiumFeatures?.whatsapp?.enabled && targetPhoneNumber) {
        if ((owner.subscription.whatsappCredits || 0) >= WHATSAPP_MESSAGE_COST) {
            try {
                await sendWhatsAppMessage(targetPhoneNumber, `${notification.title}\n\n${notification.message}`);
                await ownerDocRef.update({
                    'subscription.whatsappCredits': increment(-WHATSAPP_MESSAGE_COST)
                });
                whatsAppStatus = 'sent';
            } catch (e: any) {
                console.error(`Failed to send WhatsApp to ${targetPhoneNumber}:`, e.message);
                whatsAppStatus = 'failed';
            }
        } else {
            console.warn(`WhatsApp notification for ${owner.name} skipped due to insufficient credits.`);
            whatsAppStatus = 'skipped';
        }
    }
    
    // Always send Push Notification if FCM token exists.
    if (targetFcmToken) {
        try {
            await sendPushToUser({
                userId: notification.targetId,
                title: notification.title,
                body: notification.message,
                link: notification.link || '/dashboard'
            });
        } catch (e: any) {
            console.error(`Failed to send Push Notification to ${notification.targetId}:`, e.message);
        }
    }

    // Always save the notification to Firestore for the owner's record.
    const newNotification: Notification = {
        id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        ...notification,
        date: new Date().toISOString(),
        isRead: false,
    };
    
    const ownerDataDb = await selectOwnerDataAdminDb(ownerId);
    const notificationDocRef = ownerDataDb.collection('users_data').doc(ownerId).collection('notifications').doc(newNotification.id);
    await notificationDocRef.set(newNotification);

    return { whatsAppStatus };
}
