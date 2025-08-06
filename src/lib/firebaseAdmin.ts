
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { getStorage } from 'firebase-admin/storage';

let app: App;

const getServiceAccount = () => {
    const key = process.env.FIREBASE_ADMIN_SDK_CONFIG;
    if (!key) return undefined;
    try {
        return JSON.parse(key);
    } catch (e) {
        console.error("Failed to parse FIREBASE_ADMIN_SDK_CONFIG:", e);
        return undefined;
    }
}

const serviceAccountKey = getServiceAccount();

const firebaseAdminConfig = {
    credential: serviceAccountKey ? cert(serviceAccountKey) : undefined,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
};

if (!getApps().length) {
  if (serviceAccountKey) {
    app = initializeApp(firebaseAdminConfig);
  } else {
    console.warn("Firebase Admin SDK config not found, server-side features may not work as expected.");
    // Attempt to initialize without credentials for environments where it's auto-configured (like some Firebase hosting environments)
    try {
        app = initializeApp();
    } catch (e) {
        console.error("Failed to initialize Firebase Admin app. Server-side functionality will be limited.");
        // @ts-ignore
        app = undefined;
    }
  }
} else {
  app = getApps()[0];
}

const getDb = () => {
    if (!app) {
        console.error("Firebase Admin App is not initialized. Firestore is unavailable.");
        return null;
    }
    return getFirestore(app);
}

const getMessagingInstance = () => {
    if (!app) {
        console.error("Firebase Admin App is not initialized. Messaging is unavailable.");
        return null;
    }
    return getMessaging(app);
}

const getStorageInstance = () => {
     if (!app) {
        console.error("Firebase Admin App is not initialized. Storage is unavailable.");
        return null;
    }
    return getStorage(app);
}


// Use functions to ensure app is initialized before accessing services
export const adminDb = getDb()!;
export const adminMessaging = getMessagingInstance()!;
export const adminStorage = getStorageInstance()!;

export const adminApp = app;
