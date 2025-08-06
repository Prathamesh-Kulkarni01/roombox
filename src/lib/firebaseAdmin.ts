
'use server';

import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getMessaging, Messaging } from 'firebase-admin/messaging';
import { getStorage, Storage } from 'firebase-admin/storage';

let adminApp: App | null = null;

function initializeAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const serviceAccountKey = process.env.FIREBASE_ADMIN_SDK_CONFIG;
  if (!serviceAccountKey) {
    throw new Error('FIREBASE_ADMIN_SDK_CONFIG is not set.');
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountKey);
    return initializeApp({
      credential: cert(serviceAccount),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error);
    throw new Error('Failed to initialize Firebase Admin SDK. Check your service account key.');
  }
};

function getAdminApp(): App {
    if(!adminApp) {
        adminApp = initializeAdminApp();
    }
    return adminApp;
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
