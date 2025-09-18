
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
 * @param ownerId The ID of the property owner associated with this event.
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
        
        // Notifications for everyone (owners and tenants) are stored in the owner's data collection.
        // The client-side listener for tenants is already configured to look here.
        const docRef = adminDb.collection('users_data').doc(ownerId).collection('notifications').doc(newNotification.id);
        
        // Save to Firestore first
        await docRef.set(newNotification);

        // Then send the push notification using the API route helper
        await sendPushToUser({
            userId: newNotification.targetId,
            title: newNotification.title,
            body: newNotification.message,
            link: newNotification.link || '/dashboard'
        });

    } catch (error) {
        console.error("Failed to create and send notification:", error);
    }
}
