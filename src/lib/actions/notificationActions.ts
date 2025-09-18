
'use server'

import { getAdminDb } from '@/lib/firebaseAdmin';
import type { Notification } from '@/lib/types';
import { doc, setDoc } from 'firebase/firestore';
import { sendNotification } from '@/ai/flows/send-notification-flow';

interface CreateAndSendNotificationParams {
    ownerId: string;
    notification: Omit<Notification, 'id' | 'date' | 'isRead'>;
}

/**
 * Creates and saves a notification to Firestore, and then sends it as a push notification.
 * This is the primary function to use for all user-facing notifications.
 * @param ownerId The ID of the property owner to associate the notification with.
 * @param notification The notification content. Must include a `targetId` (the user to send to).
 */
export async function createAndSendNotification({ ownerId, notification }: CreateAndSendNotificationParams) {
    if (!ownerId || !notification || !notification.targetId) {
        console.error('createAndSendNotification: ownerId, notification, and targetId are required.');
        return;
    }
    
    const newNotification: Notification = {
        id: `notif-${Date.now()}`,
        ...notification,
        date: new Date().toISOString(),
        isRead: false,
    };
    
    try {
        const adminDb = await getAdminDb();
        const docRef = doc(adminDb, 'users_data', ownerId, 'notifications', newNotification.id);
        
        // Save to Firestore first
        await setDoc(docRef, newNotification);

        // Then send the push notification
        await sendNotification({
            userId: newNotification.targetId!,
            title: newNotification.title,
            body: newNotification.message,
            link: newNotification.link || '/dashboard'
        });

    } catch (error) {
        console.error("Failed to create and send notification:", error);
    }
}
