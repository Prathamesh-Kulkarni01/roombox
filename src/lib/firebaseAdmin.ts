
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { getStorage } from 'firebase-admin/storage';

let app: App;

const serviceAccountKey = process.env.FIREBASE_ADMIN_SDK_CONFIG
  ? JSON.parse(process.env.FIREBASE_ADMIN_SDK_CONFIG)
  : undefined;

if (!getApps().length) {
  if (serviceAccountKey) {
    app = initializeApp({
      credential: cert(serviceAccountKey),
    });
  } else {
    console.warn("Firebase Admin SDK config not found, server-side features may not work.");
    // Initialize without credentials if none are provided, for environments where it's auto-configured.
    app = initializeApp();
  }
} else {
  app = getApps()[0];
}

export const adminDb = getFirestore(app);
export const adminMessaging = getMessaging(app);
export const adminStorage = getStorage(app);

export const adminApp = app;
