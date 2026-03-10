
'use server'

import { getAdminDb, selectOwnerDataAdminDb } from '@/lib/firebaseAdmin';
import type { Notification, User, Guest } from '@/lib/types';
import { sendPushToUser } from '../notifications';
import { sendWhatsAppMessage as sendWA } from '../whatsapp/send-message';
import { doc, getDoc, updateDoc, increment, collection, writeBatch } from 'firebase/firestore';
import axios from 'axios';

interface CreateAndSendNotificationParams {
    ownerId: string;
    notification: Omit<Notification, 'id' | 'date' | 'isRead'>;
}

const SETTINGS_MAP: Record<string, string> = {
    'rent-paid': 'payment-confirmation-owner',
    'rent-receipt': 'payment-confirmation-tenant',
    'new-complaint-confirmation': 'complaint-update', // Confirmation is effectively a status update log
    // Add other aliases here as needed
};

type WhatsAppStatus = 'sent' | 'failed' | 'skipped';


export async function createAndSendNotification({ ownerId, notification }: CreateAndSendNotificationParams): Promise<{ whatsAppStatus: WhatsAppStatus }> {
    if (!ownerId || !notification || !notification.targetId) {
        console.error('createAndSendNotification: ownerId, notification, and targetId are required.');
        return { whatsAppStatus: 'skipped' };
    }

    // @ts-ignore
    const targetId: string = notification.targetId;

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
        targetPhoneNumber = targetUser.phone ?? undefined;
        targetFcmToken = targetUser.fcmToken ?? undefined;
    } else {
        const dataDb = await selectOwnerDataAdminDb(ownerId);
        const guestDocRef = dataDb.collection('users_data').doc(ownerId).collection('guests').doc(notification.targetId);
        const guestDoc = await guestDocRef.get();
        if (guestDoc.exists) {
            targetPhoneNumber = (guestDoc.data() as Guest).phone;
        }
    }

    // Send WhatsApp if enabled and we have a phone number.
    if (owner.subscription?.premiumFeatures?.whatsapp?.enabled && targetPhoneNumber) {
        try {
            // Check if user has enabled this specific notification
            const settingsKey = SETTINGS_MAP[notification.type] || notification.type;
            const settings = owner.subscription?.whatsappSettings?.[settingsKey];

            // Determine if target is tenant or owner
            const isOwner = notification.targetId === ownerId;
            const isEnabled = isOwner ? settings?.owner : settings?.tenant;

            // If settings exist, follow them. If they don't exist, default to true for backward compat
            if (settings && isEnabled === false) {
                console.log(`[createAndSendNotification] WhatsApp skipped: ${settingsKey} disabled for ${isOwner ? 'owner' : 'tenant'}`);
                whatsAppStatus = 'skipped';
            } else {
                // Centralized billing & logging handled here
                // Ensure digits only for WhatsApp
                let fullPhone = targetPhoneNumber.replace(/\D/g, '');
                if (fullPhone.length === 10) fullPhone = '91' + fullPhone;
                const result = await sendWA(
                    fullPhone,
                    `${notification.title}\n\n${notification.message}`,
                    ownerId,
                    targetId
                );

                if (result.success) {
                    whatsAppStatus = 'sent';
                } else {
                    // @ts-ignore
                    console.error(`WhatsApp send failed:`, result.error);
                    // @ts-ignore
                    whatsAppStatus = result.error === 'Insufficient credits' ? 'skipped' : 'failed';
                }
            }
        } catch (e: any) {
            console.error(`Failed to send WhatsApp to ${targetPhoneNumber}:`, e.message);
            whatsAppStatus = 'failed';
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
