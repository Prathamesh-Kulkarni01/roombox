

import { initializeApp, getApps, getApp, type FirebaseOptions, type FirebaseApp } from 'firebase/app';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Function to check if the Firebase config keys have been set
export const isFirebaseConfigured = () => {
    return !!firebaseConfig.projectId && firebaseConfig.projectId !== "your-project-id";
}

// Initialize Firebase
const app = isFirebaseConfigured() && !getApps().length ? initializeApp(firebaseConfig) : (getApps().length > 0 ? getApp() : null);

// Initialize default firestore instance
const db = app ? getFirestore(app) : null;
const auth = app ? getAuth(app) : null;

const dynamicDbInstances: { [key: string]: any } = {};

// Normalize DB id to either undefined (use default) or the exact named database
function normalizeDatabaseId(databaseId?: string | null): string | undefined {
    const trimmed = (databaseId || '').trim();
    if (!trimmed) return undefined; // default
    const lower = trimmed.toLowerCase();
    if (lower === 'default' || trimmed === '(default)') return undefined; // default
    return trimmed;
}

// Function to get a dynamic firestore instance for enterprise clients
export const getDynamicDb = (databaseId: string) => {
    if (!app) return null;
    const normalized = normalizeDatabaseId(databaseId);
    if (!normalized) return getFirestore(app);
    if (dynamicDbInstances[normalized]) {
        return dynamicDbInstances[normalized];
    }
    const newDbInstance = initializeFirestore(app, { experimentalAutoDetectLongPolling: true }, normalized);
    dynamicDbInstances[normalized] = newDbInstance;
    return newDbInstance;
}

// Per-owner client app cache
const ownerApps: Record<string, FirebaseApp> = {};

export type OwnerClientConfig = {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket?: string;
    messagingSenderId?: string;
    appId?: string;
    measurementId?: string;
};

export function getOwnerClientApp(config: OwnerClientConfig): FirebaseApp | null {
    try {
        const name = `owner-${config.projectId}`;
        if (ownerApps[name]) return ownerApps[name];
        const existing = getApps().find(a => a.name === name);
        if (existing) {
            ownerApps[name] = existing as FirebaseApp;
            return existing as FirebaseApp;
        }
        const app = initializeApp(config as FirebaseOptions, name);
        ownerApps[name] = app;
        return app;
    } catch {
        return null;
    }
}

export function getOwnerClientDb(config: OwnerClientConfig, databaseId?: string) {
    const app = getOwnerClientApp(config);
    if (!app) return null;
    const normalized = normalizeDatabaseId(databaseId);
    if (!normalized) return getFirestore(app);
    return initializeFirestore(app, { experimentalAutoDetectLongPolling: true }, normalized);
}

export { db, auth, app, firebaseConfig };
