
'use server'

import { getAdminDb, selectOwnerDataAdminDb } from '@/lib/firebaseAdmin';
import type { Notification, User, Guest } from '@/lib/types';
import { sendPushToUser } from '../notifications';
import { sendWhatsAppMessage as sendWA, sendWhatsAppTemplate } from '../whatsapp/send-message';
import { doc, getDoc, updateDoc, increment, collection, writeBatch } from 'firebase/firestore';
import axios from 'axios';

interface CreateAndSendNotificationParams {
    ownerId: string;
    notification: Omit<Notification, 'id' | 'date' | 'isRead' | 'link'> & { link?: string };
    whatsappConfig?: {
        templateId?: string;
        headerValues?: any[];
        bodyValues?: any[];
        buttonValues?: any[];
        languageCode?: string;
    };
}

const SETTINGS_MAP: Record<string, string> = {
    'rent-paid': 'payment-confirmation-owner',
    'rent-receipt': 'payment-confirmation-tenant',
    'new-complaint-confirmation': 'complaint-update', // Confirmation is effectively a status update log
    // Add other aliases here as needed
};

type WhatsAppStatus = 'sent' | 'failed' | 'skipped';


export async function createAndSendNotification({ ownerId, notification, whatsappConfig }: CreateAndSendNotificationParams): Promise<{ whatsAppStatus: WhatsAppStatus }> {
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
                
                let result;
                if (whatsappConfig?.templateId) {
                    // Use WhatsApp Template
                    result = await sendWhatsAppTemplate(
                        fullPhone,
                        whatsappConfig.templateId,
                        ownerId,
                        whatsappConfig.languageCode || 'en_US',
                        whatsappConfig.headerValues || [],
                        whatsappConfig.bodyValues || [],
                        whatsappConfig.buttonValues || [],
                        targetId
                    );

                    // If template failed, fallback to text message
                    if (!result.success) {
                        console.warn(`[createAndSendNotification] Template ${whatsappConfig.templateId} failed, falling back to text message. Error:`, result.error);
                        result = await sendWA(
                            fullPhone,
                            `${notification.title}\n\n${notification.message}`,
                            ownerId,
                            targetId
                        );
                    }
                } else {
                    // Use Plain Text Message
                    result = await sendWA(
                        fullPhone,
                        `${notification.title}\n\n${notification.message}`,
                        ownerId,
                        targetId
                    );
                }

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

export async function sendMassPaymentReminders({ ownerId, guests }: { ownerId: string, guests: { id: string, name: string, phone?: string, userId?: string | null, balance: number, symbolicBalance?: string | null, amountType?: string, roomName: string }[] }) {
    if (!ownerId || !guests.length) return { success: false, error: 'Owner ID and guests are required' };

    try {
        const adminDb = await getAdminDb();
        const ownerDoc = await adminDb.collection('users').doc(ownerId).get();
        if (!ownerDoc.exists) return { success: false, error: 'Owner not found' };
        
        const owner = ownerDoc.data() as User;
        const results = { whatsapp: 0, push: 0, total: guests.length };

        // Process in small batches or sequentially to avoid hitting limits or overwhelming the server
        for (const guest of guests) {
            const title = 'Rent Payment Reminder';
            const amountStr = guest.amountType === 'symbolic' ? guest.symbolicBalance : `₹${guest.balance.toLocaleString('en-IN')}`;
            const message = `Hi ${guest.name}, your rent of ${amountStr} for room ${guest.roomName} is pending. Please pay at your earliest convenience.`;
            
            // 1. WhatsApp
            if (owner.subscription?.premiumFeatures?.whatsapp?.enabled && guest.phone) {
                let fullPhone = guest.phone.replace(/\D/g, '');
                if (fullPhone.length === 10) fullPhone = '91' + fullPhone;
                
                const waResult = await sendWA(fullPhone, message, ownerId, guest.id);
                if (waResult.success) results.whatsapp++;
            }

            // 2. FCM Push
            let targetFcmToken: string | undefined;
            if (guest.userId) {
                const userDoc = await adminDb.collection('users').doc(guest.userId).get();
                if (userDoc.exists) {
                    targetFcmToken = (userDoc.data() as User).fcmToken ?? undefined;
                }
            }

            if (targetFcmToken) {
                const pushResult = await sendPushToUser({
                    userId: guest.userId!,
                    title,
                    body: message,
                    link: '/dashboard'
                });
                if (pushResult.ok) results.push++;
            }

            // 3. Save Notification for Owner
            const notifId = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
            await adminDb.collection('users_data').doc(ownerId).collection('notifications').doc(notifId).set({
                id: notifId,
                type: 'rent-reminder',
                title,
                message,
                date: new Date().toISOString(),
                isRead: false,
                targetId: guest.id
            });
        }

        return { success: true, results };
    } catch (error: any) {
        console.error('[sendMassPaymentReminders] Error:', error.message);
        return { success: false, error: error.message };
    }
}
