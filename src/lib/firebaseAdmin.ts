
'use server';

import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { getStorage } from 'firebase-admin/storage';

let app: App | null = null;

const getServiceAccount = () => {
    const key = process.env.FIREBASE_ADMIN_SDK_CONFIG;
    if (!key) {
        console.warn("FIREBASE_ADMIN_SDK_CONFIG environment variable not found.");
        return undefined;
    }
    try {
        // Attempt to parse the key. If it's already an object (e.g., in some environments), use it directly.
        if (typeof key === 'object') return key;
        return JSON.parse(key);
    } catch (e) {
        console.error("Failed to parse FIREBASE_ADMIN_SDK_CONFIG:", e);
        return undefined;
    }
};

function initializeAdminApp() {
    if (getApps().length > 0) {
        return getApps()[0];
    }
    
    const serviceAccount = getServiceAccount();
    if (serviceAccount) {
        return initializeApp({
            credential: cert(serviceAccount),
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        });
    }
    
    console.error("Firebase Admin SDK could not be initialized. Service account key is missing or invalid.");
    return null;
}

app = initializeAdminApp();

function getAdminDb() {
    if (!app) throw new Error("Firebase Admin SDK is not initialized.");
    return getFirestore(app);
}

function getAdminMessaging() {
    if (!app) throw new Error("Firebase Admin SDK is not initialized.");
    return getMessaging(app);
}

function getAdminStorage() {
    if (!app) throw new Error("Firebase Admin SDK is not initialized.");
    return getStorage(app);
}

// Export functions instead of objects to comply with 'use server' constraints.
const adminDb = getAdminDb();
const adminMessaging = getAdminMessaging();
const adminStorage = getAdminStorage();

export { adminDb, adminMessaging, adminStorage, app as adminApp };
