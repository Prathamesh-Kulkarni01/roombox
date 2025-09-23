

'use server';

import { initializeApp, getApps, cert, App, AppOptions } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getMessaging, Messaging } from 'firebase-admin/messaging';
import { getStorage, Storage } from 'firebase-admin/storage';
import { getAuth, Auth } from 'firebase-admin/auth';

const adminApps: Map<string, App> = new Map();

function initializeAdminApp(projectId?: string): App {
  const appName = projectId || 'default';
  if (adminApps.has(appName)) {
    return adminApps.get(appName)!;
  }
  
  // If no projectId is given and default exists, return it
  if (!projectId && getApps().length > 0) {
    const defaultApp = getApps()[0];
    adminApps.set('default', defaultApp);
    return defaultApp;
  }

  const serviceAccountKey = process.env.FIREBASE_ADMIN_SDK_CONFIG;
  if (!serviceAccountKey) {
    throw new Error('FIREBASE_ADMIN_SDK_CONFIG is not set.');
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountKey);
    const appOptions: AppOptions = {
      credential: cert(serviceAccount),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    };
    if (projectId) {
      appOptions.projectId = projectId;
    }
    const app = initializeApp(appOptions, appName);
    adminApps.set(appName, app);
    return app;
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error);
    throw new Error('Failed to initialize Firebase Admin SDK. Check your service account key.');
  }
};

function getAdminApp(projectId?: string): App {
    return initializeAdminApp(projectId);
}

export async function getAdminDb(projectId?: string): Promise<Firestore> {
  return getFirestore(getAdminApp(projectId));
}

export async function getAdminMessaging(projectId?: string): Promise<Messaging> {
  return getMessaging(getAdminApp(projectId));
}

export async function getAdminStorage(projectId?: string): Promise<Storage> {
    return getStorage(getAdminApp(projectId));
}

export async function getAdminAuth(projectId?: string): Promise<Auth> {
    return getAuth(getAdminApp(projectId));
}
