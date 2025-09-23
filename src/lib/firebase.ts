

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

// Function to get a dynamic firestore instance for enterprise clients
export const getDynamicDb = (databaseId: string) => {
    if (!app) return null;
    if (dynamicDbInstances[databaseId]) {
        return dynamicDbInstances[databaseId];
    }
    const newDbInstance = initializeFirestore(app, {}, databaseId);
    dynamicDbInstances[databaseId] = newDbInstance;
    return newDbInstance;
}

export { db, auth, app, firebaseConfig };
