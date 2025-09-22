

'use server'

import { getAdminDb } from '@/lib/firebaseAdmin';
import type { Notification, User } from '@/lib/types';
import { sendPushToUser } from '../notifications';

interface CreateAndSendNotificationParams {
    ownerId: string;
    notification: Omit<Notification, 'id' | 'date' | 'isRead'>;
}

/**
 * Creates and saves a notification to Firestore, and then sends it as a push notification.
 * This is the primary function to use for all user-facing notifications.
 * @param ownerId The ID of the property owner associated with this event. Notifications are stored under the owner's data.
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
        
        // All notifications (for owners and tenants) are stored in the owner's data collection.
        // The client-side listeners are configured to look here.
        const docRef = adminDb.collection('users_data').doc(ownerId).collection('notifications').doc(newNotification.id);
        
        await docRef.set(newNotification);

        // Fetch user to get FCM token
        const userDocRef = adminDb.collection('users').doc(newNotification.targetId);
        const userDoc = await userDocRef.get();

        if (userDoc.exists) {
            const user = userDoc.data() as User;
            if (user.fcmToken) {
                 await sendPushToUser({
                    userId: newNotification.targetId,
                    title: newNotification.title,
                    body: newNotification.message,
                    link: newNotification.link || '/dashboard'
                });
            } else {
                console.warn(`User ${newNotification.targetId} does not have an FCM token. Skipping push notification.`);
            }
        } else {
             console.warn(`User ${newNotification.targetId} not found. Skipping push notification.`);
        }

    } catch (error) {
        console.error("Failed to create and send notification:", error);
    }
}
