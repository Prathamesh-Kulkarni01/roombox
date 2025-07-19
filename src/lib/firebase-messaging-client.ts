import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { app, db, isFirebaseConfigured } from './firebase';
import { doc, setDoc } from 'firebase/firestore';

const saveTokenToFirestore = async (userId: string, token: string) => {
    if (!db) return;
    try {
        const userDocRef = doc(db, 'users', userId);
        await setDoc(userDocRef, { fcmToken: token }, { merge: true });
    } catch (error) {
        console.error("Error saving FCM token to Firestore:", error);
    }
};

export const initializeFirebaseMessaging = async (userId?: string) => {
    if (!isFirebaseConfigured() || typeof window === 'undefined' || !userId) {
        return;
    }

    try {
        const messaging = getMessaging(app);

        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
            if (!vapidKey) {
                console.error("Firebase VAPID key not found. Please add NEXT_PUBLIC_FIREBASE_VAPID_KEY to your .env file.");
                return;
            }
            
            const fcmToken = await getToken(messaging, { vapidKey });

            if (fcmToken) {
                await saveTokenToFirestore(userId, fcmToken);
            } else {
                console.log('No registration token available. Request permission to generate one.');
            }
        } else {
            console.log('Permission to receive notifications was denied.');
        }

        onMessage(messaging, (payload) => {
            console.log('Foreground message received. ', payload);
            new Notification(payload.notification?.title || 'New Message', {
                body: payload.notification?.body,
                icon: '/apple-touch-icon.png'
            });
        });

    } catch (error) {
        console.error('An error occurred while initializing Firebase Messaging.', error);
    }
};
