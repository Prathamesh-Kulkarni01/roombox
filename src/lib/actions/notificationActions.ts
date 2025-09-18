
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
        
        const targetUserId = notification.targetId;

        // Fetch the target user to determine their role and owner.
        const targetUserDoc = await adminDb.collection('users').doc(targetUserId).get();
        if (!targetUserDoc.exists()) {
             console.warn(`Notification target user with ID ${targetUserId} not found.`);
             return;
        }
        const targetUser = targetUserDoc.data() as User;
        
        // Determine the correct Firestore path for the notification document.
        // A user's notifications are always stored under their respective owner's data collection,
        // unless they are the owner themselves.
        const collectionOwnerId = targetUser.role === 'owner' ? targetUser.id : targetUser.ownerId;
        
        if (!collectionOwnerId) {
            console.error(`Could not determine owner collection for user ${targetUserId}.`);
            return;
        }
        
        const docRef = adminDb.collection('users_data').doc(collectionOwnerId).collection('notifications').doc(newNotification.id);
        
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
