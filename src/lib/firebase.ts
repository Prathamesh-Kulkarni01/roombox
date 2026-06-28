import { initializeApp, getApps, getApp, type FirebaseOptions, type FirebaseApp } from 'firebase/app';
import { getFirestore, initializeFirestore, connectFirestoreEmulator, type Firestore } from 'firebase/firestore';
import { getAuth, connectAuthEmulator, type Auth } from 'firebase/auth';

const firebaseConfig: FirebaseOptions = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

export const isEmulator = () => {
    const isTestProject = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID === 'roombox-test';
    const useEmulatorFlag = process.env.NEXT_PUBLIC_USE_EMULATOR === 'true';
    return (isTestProject || useEmulatorFlag) && (!!process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST || !!process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST);
}

// Function to check if the Firebase config keys have been set
export const isFirebaseConfigured = () => {
    // In development/test, we might use dummy values
    const isDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const hasConfig = !!firebaseConfig.projectId && firebaseConfig.projectId !== "your-project-id" && firebaseConfig.apiKey !== "AIzaSyDummyKey_1234567890";
    return (hasConfig || isDev);
}

// Initialize Firebase
const app = (() => {
    if (!isFirebaseConfigured()) return null;
    const existing = getApps().find(a => a.name === '[DEFAULT]');
    if (existing) return existing;
    try {
        return initializeApp(firebaseConfig);
    } catch (e) {
        try {
            return getApp('[DEFAULT]');
        } catch {
            return null;
        }
    }
})();

// Initialize default firestore instance
const db = app ? (() => {
    try {
        return initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
    } catch (e) {
        return getFirestore(app);
    }
})() : null;
const auth = app ? getAuth(app) : null;

// Connect to emulators if host variables are set and we are in emulator mode
if (typeof window !== 'undefined' && isEmulator()) {
    if (db && process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST) {
        const [host, port] = process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST.split(':');
        connectFirestoreEmulator(db, host, parseInt(port));
        console.log(`[Firebase] Connected to Firestore Emulator: ${host}:${port}`);
    }
    if (auth && process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST) {
        connectAuthEmulator(auth, `http://${process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST}`);
        console.log(`[Firebase] Connected to Auth Emulator: ${process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST}`);
    }
}

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
    if (!normalized) {
        try {
            return initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
        } catch {
            return getFirestore(app);
        }
    }
    try {
        return initializeFirestore(app, { experimentalAutoDetectLongPolling: true }, normalized);
    } catch {
        return getFirestore(app, normalized);
    }
}

// Generic selector for owner data DB on the client
export function selectOwnerDataDb(currentUser: any) {
    const enterprise = currentUser?.subscription?.enterpriseProject;
    if (enterprise?.clientConfig) {
        return getOwnerClientDb(enterprise.clientConfig as OwnerClientConfig, enterprise.databaseId)
            || (enterprise?.databaseId ? getDynamicDb(enterprise.databaseId) : db);
    }
    if (enterprise?.databaseId) {
        return getDynamicDb(enterprise.databaseId);
    }
    return db;
}

// Global active tenant state for non-React code (e.g. Redux apiSlice)
let activeAuth: Auth | null = auth;
let activeDb: Firestore | null = db;

export function setActiveTenantContext(tenantAuth: Auth | null, tenantDb: Firestore | null) {
    activeAuth = tenantAuth;
    activeDb = tenantDb;
}

export function getActiveAuth() { return activeAuth; }
export function getActiveDb() { return activeDb; }

export { db, auth, app, firebaseConfig };
