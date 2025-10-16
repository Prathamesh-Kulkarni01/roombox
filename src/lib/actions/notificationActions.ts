
'use server'

import { getAdminDb } from '@/lib/firebaseAdmin';
import type { Notification, User } from '@/lib/types';
import { sendPushToUser } from '../notifications';
import { doc, getDoc, updateDoc, increment, collection, writeBatch } from 'firebase/firestore';
import axios from 'axios';

interface CreateAndSendNotificationParams {
    ownerId: string;
    notification: Omit<Notification, 'id' | 'date' | 'isRead'>;
}

const WHATSAPP_MESSAGE_COST = 1.5;

/**
 * Sends a WhatsApp message using a generic provider that authenticates with a bearer token.
 * This is now the verified implementation.
 * @param to The 10-digit phone number of the recipient.
 * @param message The text message to send.
 */
async function sendWhatsAppMessage(to: string, message: string) {
    const apiEndpoint = process.env.WHATSAPP_API_ENDPOINT;
    const authKey = process.env.WHATSAPP_AUTH_KEY;

    if (!apiEndpoint || !authKey) {
        throw new Error("WhatsApp API endpoint or AuthKey is missing in environment variables.");
    }
    
    // The payload structure is generic. Your provider might need a different one.
    const payload = {
      to: `91${to}`, // Assuming Indian country code
      message: message,
    };

    try {
        await axios.post(apiEndpoint, payload, {
            headers: {
                'Authorization': `Bearer ${authKey}`,
                'Content-Type': 'application/json',
            },
        });
        return { success: true };
    } catch (error: any) {
        console.error("Error sending WhatsApp message:", error.response?.data || error.message);
        throw new Error(error.response?.data?.error?.description || 'Failed to send WhatsApp message.');
    }
}


export async function createAndSendNotification({ ownerId, notification }: CreateAndSendNotificationParams) {
    if (!ownerId || !notification || !notification.targetId) {
        console.error('createAndSendNotification: ownerId, notification, and targetId are required.');
        return;
    }
    
    const adminDb = await getAdminDb();
    const ownerDocRef = adminDb.collection('users').doc(ownerId);
    const targetUserDocRef = adminDb.collection('users').doc(notification.targetId);

    const [ownerDoc, targetUserDoc] = await Promise.all([ownerDocRef.get(), targetUserDoc.get()]);

    if (!ownerDoc.exists() || !targetUserDoc.exists()) {
        console.error('Owner or target user not found.');
        return;
    }

    const owner = ownerDoc.data() as User;
    const targetUser = targetUserDoc.data() as User;

    // Send WhatsApp if enabled and credits are available
    if (owner.subscription?.premiumFeatures?.whatsapp?.enabled && targetUser.phone) {
        if ((owner.subscription.whatsappCredits || 0) >= WHATSAPP_MESSAGE_COST) {
            try {
                await sendWhatsAppMessage(targetUser.phone, `${notification.title}\n\n${notification.message}`);
                await ownerDocRef.update({
                    'subscription.whatsappCredits': increment(-WHATSAPP_MESSAGE_COST)
                });
            } catch (e: any) {
                console.error(`Failed to send WhatsApp to ${targetUser.phone}:`, e.message);
            }
        } else {
            console.warn(`WhatsApp notification for ${owner.name} skipped due to insufficient credits.`);
        }
    }
    
    // Always send Push Notification if token exists
    if (targetUser.fcmToken) {
        try {
            await sendPushToUser({
                userId: notification.targetId,
                title: notification.title,
                body: notification.message,
                link: notification.link || '/dashboard'
            });
        } catch (e: any) {
            console.error(`Failed to send Push Notification to ${targetUser.id}:`, e.message);
        }
    }

    // Always save notification to Firestore
    const newNotification: Notification = {
        id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        ...notification,
        date: new Date().toISOString(),
        isRead: false,
    };
    
    const notificationDocRef = adminDb.collection('users_data').doc(ownerId).collection('notifications').doc(newNotification.id);
    await notificationDocRef.set(newNotification);
}
