

import { initializeApp, getApps, cert, App, AppOptions } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getMessaging, Messaging } from 'firebase-admin/messaging';
import { getStorage, Storage } from 'firebase-admin/storage';
import { getAuth, Auth } from 'firebase-admin/auth';

const adminApps: Map<string, App> = new Map();

import { getEnv } from './env';

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

  const fbProjectId = getEnv('FIREBASE_PROJECT_ID');
  const fbClientEmail = getEnv('FIREBASE_CLIENT_EMAIL');
  const fbPrivateKey = getEnv('FIREBASE_PRIVATE_KEY');
  const legacyConfig = getEnv('FIREBASE_ADMIN_SDK_CONFIG', undefined, true);

  const hasIndividualVars = fbPrivateKey && fbClientEmail && fbProjectId;
  if (!hasIndividualVars && !legacyConfig) {
    console.warn('[Firebase] Missing FIREBASE_ADMIN_SDK_CONFIG and individual variables.');
  }

  let appOptions: AppOptions = {
    storageBucket: getEnv('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'),
  };

  try {
    const isEmulator = process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST;

    if (isEmulator) {
      // Use dummy credentials for local emulator
      appOptions.projectId = fbProjectId || 'roombox-test';
    } else if (fbPrivateKey && fbClientEmail && fbProjectId) {
      // Use individual environment variables (Netlify 4KB limit workaround)
      appOptions.credential = cert({
        projectId: fbProjectId,
        clientEmail: fbClientEmail,
        // Replace escaped newlines if they exist (\n) and handle the literal value
        privateKey: fbPrivateKey.replace(/\\n/g, '\n').replace(/"/g, ''),
      });
    } else if (legacyConfig) {
      // Fallback to the full JSON string if provided
      const serviceAccount = JSON.parse(legacyConfig);
      appOptions.credential = cert(serviceAccount);
    } else {
      throw new Error('Missing Firebase Admin credentials. Please set FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL, and FIREBASE_PROJECT_ID.');
    }
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

// Export auth instance for convenience
export const auth = getAuth(initializeAdminApp());
