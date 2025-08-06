
'use server';

import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { getStorage } from 'firebase-admin/storage';

let app: App;

const getServiceAccount = () => {
    const key = process.env.FIREBASE_ADMIN_SDK_CONFIG;
    if (!key) {
        console.warn("FIREBASE_ADMIN_SDK_CONFIG environment variable not found.");
        return undefined;
    }
    try {
        return JSON.parse(key);
    } catch (e) {
        console.error("Failed to parse FIREBASE_ADMIN_SDK_CONFIG:", e);
        return undefined;
    }
};

if (!getApps().length) {
    const serviceAccount = getServiceAccount();
    if (serviceAccount) {
        app = initializeApp({
            credential: cert(serviceAccount),
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        });
    } else {
        console.error("Firebase Admin SDK could not be initialized. Service account key is missing or invalid.");
    }
} else {
    app = getApps()[0];
}

const adminDb = app ? getFirestore(app) : null;
const adminMessaging = app ? getMessaging(app) : null;
const adminStorage = app ? getStorage(app) : null;

// The exclamation marks assert that these services are available.
// The initialization logic above should ensure this is the case.
// If it's not, an error at this point is better than a downstream crash.
export { adminDb, adminMessaging, adminStorage, app as adminApp };
