
import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
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

const auth = app ? getAuth(app) : null;

// The client-side app should no longer interact with Firestore directly
const db = null;

export { db, auth, app, firebaseConfig };
