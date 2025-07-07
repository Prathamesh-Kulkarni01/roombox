import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { app, isFirebaseConfigured } from './firebase';

export const initializeFirebaseMessaging = async () => {
    if (!isFirebaseConfigured() || typeof window === 'undefined') {
        return;
    }

    try {
        const messaging = getMessaging(app);

        // Request permission and get token
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
            if (!vapidKey) {
                console.error("Firebase VAPID key not found in environment variables. Please add NEXT_PUBLIC_FIREBASE_VAPID_KEY to your .env file.");
                return;
            }
            
            const fcmToken = await getToken(messaging, { vapidKey });

            if (fcmToken) {
                console.log('FCM Token:', fcmToken);
                // In a real app, you would send this token to your server
                // and store it to send targeted notifications to this device.
                // e.g., saveTokenToFirestore(fcmToken);
            } else {
                console.log('No registration token available. Request permission to generate one.');
            }
        } else {
            console.log('Permission to receive notifications was denied.');
        }

        // Handle foreground messages
        onMessage(messaging, (payload) => {
            console.log('Foreground message received. ', payload);
            // You can show a custom in-app notification here
            // using a toast or other UI element, as the browser won't show the system notification
            // when the app is in the foreground.
             new Notification(payload.notification?.title || 'New Message', {
                body: payload.notification?.body,
                icon: '/apple-touch-icon.png'
            });
        });

    } catch (error) {
        console.error('An error occurred while initializing Firebase Messaging.', error);
    }
};
