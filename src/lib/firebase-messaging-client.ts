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

function sanitizeVapidKey(raw: string): string {
	// Trim whitespace and remove surrounding quotes if present
	let v = (raw || '').trim();
	if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith('\'') && v.endsWith('\''))) {
		v = v.slice(1, -1);
	}
	// Remove any embedded whitespace/newlines
	v = v.replace(/\s+/g, '');
	return v;
}

function isLikelyValidVapidKey(v: string): boolean {
	// Web Push public keys are base64url (~87-90 chars), using A–Z a–z 0–9 _ - and typically start with 'B'
	return !!v && /^[A-Za-z0-9_-]+$/.test(v) && v.length >= 80 && v.length <= 200 && v[0] === 'B';
}

export const initializeFirebaseMessaging = async (userId?: string) => {
    if (!isFirebaseConfigured() || typeof window === 'undefined' || !userId) {
        return;
    }

    try {
		if (!app) {
			console.error('[FCM] Firebase app not initialized.');
			return;
		}
        const messaging = getMessaging(app);

        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
			const rawVapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
			const vapidKey = sanitizeVapidKey(rawVapidKey || '');
			if (!isLikelyValidVapidKey(vapidKey)) {
				console.error('[FCM] Invalid VAPID key format. Ensure it is the Web Push Public key (starts with B), one line, no quotes. Length:', vapidKey.length);
                return;
            }
			console.log('[FCM] Using VAPID prefix:', vapidKey.substring(0, 8));
			try {
            const fcmToken = await getToken(messaging, { vapidKey });
            if (fcmToken) {
					console.log('[FCM] Token acquired (prefix):', fcmToken.substring(0, 12));
                await saveTokenToFirestore(userId, fcmToken);
            } else {
                console.log('No registration token available. Request permission to generate one.');
				}
			} catch (tokenErr) {
				console.error('[FCM] getToken failed:', tokenErr);
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
