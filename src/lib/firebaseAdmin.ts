
'use server';

import { initializeApp, getApps, cert, App, AppOptions } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getMessaging, Messaging } from 'firebase-admin/messaging';
import { getStorage, Storage } from 'firebase-admin/storage';
import { getAuth, Auth } from 'firebase-admin/auth';

const adminApps: Map<string, App> = new Map();

function initializeAdminApp(projectId?: string, databaseId?: string): App {
  const appName = databaseId || projectId || 'default';

  // Reuse cached instance if available
  if (adminApps.has(appName)) {
    return adminApps.get(appName)!;
  }

  // Reuse already initialized app with the same name
  const existingByName = getApps().find(a => a.name === appName || (!projectId && !databaseId && a.name === '[DEFAULT]'));
  if (existingByName) {
    adminApps.set(appName, existingByName);
    return existingByName;
  }
  
  // If no project/db specified, and a default app exists, reuse it
  if (!projectId && !databaseId && getApps().length > 0) {
    const defaultApp = getApps().find(app => app.name === '[DEFAULT]') || getApps()[0];
    if (defaultApp) {
      adminApps.set(appName, defaultApp);
      return defaultApp;
    }
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
    if (projectId) appOptions.projectId = projectId;
    // Note: Admin SDK currently binds default database to the app; named databases can be handled at Firestore client level if needed.

    const app = initializeApp(appOptions, appName);
    adminApps.set(appName, app);
    return app;
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error);
    throw new Error('Failed to initialize Firebase Admin SDK. Check your service account key.');
  }
};

function getAdminApp(projectId?: string, databaseId?: string): App {
    return initializeAdminApp(projectId, databaseId);
}

export async function getAdminDb(projectId?: string, databaseId?: string): Promise<Firestore> {
  // databaseId is currently unused by firebase-admin initialize; future support can be added here
  return getFirestore(getAdminApp(projectId, databaseId));
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

// Generic selector: fetch owner user doc from App DB and return their data DB
export async function selectOwnerDataAdminDb(ownerId: string): Promise<Firestore> {
    const appDb = await getAdminDb();
    const ownerDoc = await appDb.collection('users').doc(ownerId).get();
    const enterpriseDbId = ownerDoc.data()?.subscription?.enterpriseProject?.databaseId as string | undefined;
    const enterpriseProjectId = ownerDoc.data()?.subscription?.enterpriseProject?.projectId as string | undefined;
    return getAdminDb(enterpriseProjectId, enterpriseDbId);
}
