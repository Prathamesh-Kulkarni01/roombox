
'use server';

import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getMessaging, Messaging } from 'firebase-admin/messaging';
import { getStorage, Storage } from 'firebase-admin/storage';

let app: App | null = null;

function initializeAdminApp(): App {
    if (getApps().length > 0) {
        app = getApps()[0];
        return app;
    }
    
    const serviceAccount = getServiceAccount();
    if (serviceAccount) {
        app = initializeApp({
            credential: cert(serviceAccount),
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        });
        return app;
    }
    
    throw new Error("Firebase Admin SDK could not be initialized. Service account key is missing or invalid.");
}

const getServiceAccount = () => {
    const key = process.env.FIREBASE_ADMIN_SDK_CONFIG;
    if (!key) {
        console.warn("FIREBASE_ADMIN_SDK_CONFIG environment variable not found.");
        return undefined;
    }
    try {
        if (typeof key === 'object') return key;
        return JSON.parse(key);
    } catch (e) {
        console.error("Failed to parse FIREBASE_ADMIN_SDK_CONFIG:", e);
        return undefined;
    }
};

function getAdminApp(): App {
    if (!app) {
        app = initializeAdminApp();
    }
    return app;
}

export async function getAdminDb(): Promise<Firestore> {
    return getFirestore(getAdminApp());
}

export async function getAdminMessaging(): Promise<Messaging> {
    return getMessaging(getAdminApp());
}

export async function getAdminStorage(): Promise<Storage> {
    return getStorage(getAdminApp());
}

export { getAdminApp as adminApp };
