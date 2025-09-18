
'use server'

import { getAdminDb } from '@/lib/firebaseAdmin';
import type { Notification } from '@/lib/types';
import { doc, setDoc } from 'firebase/firestore';

interface CreateNotificationParams {
    ownerId: string;
    notification: Omit<Notification, 'id' | 'date' | 'isRead'>;
}

/**
 * Creates and saves a notification to Firestore. This is a server-side action
 * intended to be called from other server components or API routes.
 */
export async function createNotification({ ownerId, notification }: CreateNotificationParams) {
    if (!ownerId || !notification) {
        console.error('createNotification: ownerId and notification data are required.');
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
        await setDoc(docRef, newNotification);
    } catch (error) {
        console.error("Failed to create notification on server:", error);
    }
}
