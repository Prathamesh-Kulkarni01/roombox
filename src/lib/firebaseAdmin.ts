import './purgeEmulators';

import { initializeApp, getApps, cert, App, AppOptions } from 'firebase-admin/app';
import { getFirestore, Firestore, DocumentReference, DocumentSnapshot, FieldPath } from 'firebase-admin/firestore';
import { getMessaging, Messaging } from 'firebase-admin/messaging';
import { getStorage, Storage } from 'firebase-admin/storage';
import { getAuth, Auth } from 'firebase-admin/auth';
import { decryptTokens } from './encryption';
import { EnterpriseDbUnavailableError } from './errors/enterprise-db';

export { EnterpriseDbUnavailableError } from './errors/enterprise-db';

/**
 * Adapter that mocks a Firebase Transaction using a standard WriteBatch.
 * This is used strictly as a workaround for BYODB (Bring-Your-Own-Database) Enterprise tenants 
 * using OAuth credentials, because GCP Datastore rejects native server-SDK transactions 
 * with PERMISSION_DENIED unless a Service Account is used.
 */
class OAuthTransactionAdapter {
  private batch: FirebaseFirestore.WriteBatch;
  
  constructor(private db: FirebaseFirestore.Firestore) {
      this.batch = db.batch();
  }

  async get(documentRef: DocumentReference): Promise<DocumentSnapshot> {
      return await documentRef.get();
  }

  async getAll(...documentRefs: DocumentReference[]): Promise<DocumentSnapshot[]> {
      if (documentRefs.length === 0) return [];
      return await Promise.all(documentRefs.map(ref => ref.get()));
  }

  set(documentRef: DocumentReference, data: any, options?: any): this {
      if (options) {
          this.batch.set(documentRef, data, options);
      } else {
          this.batch.set(documentRef, data);
      }
      return this;
  }

  update(documentRef: DocumentReference, data: any): this;
  update(documentRef: DocumentReference, field: string | FieldPath, value: any, ...moreFieldsOrValues: any[]): this;
  update(documentRef: DocumentReference, dataOrField: any, ...rest: any[]): this {
      if (typeof dataOrField === 'string' || dataOrField instanceof FieldPath) {
           this.batch.update(documentRef, dataOrField, rest[0], ...rest.slice(1));
      } else {
           this.batch.update(documentRef, dataOrField);
      }
      return this;
  }

  delete(documentRef: DocumentReference): this {
      this.batch.delete(documentRef);
      return this;
  }

  async commit(): Promise<void> {
      await this.batch.commit();
  }
}

import { LRUCache } from './lru-cache';
const adminApps = new LRUCache<string, App>(50);

import { getEnv } from './env';

function initializeAdminApp(projectId?: string, databaseId?: string): App {
  const appName = databaseId || projectId || '[DEFAULT]';

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
    const isEmulator = (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST) && 
                       (fbProjectId === 'roombox-test' || process.env.NEXT_PUBLIC_USE_EMULATOR === 'true');

    if (isEmulator) {
      // Use dummy credentials for local emulator
      appOptions.projectId = fbProjectId || 'roombox-test';
    } else {
      // CRITICAL: Delete emulator variables to prevent gRPC library from hijacking live cloud connections
      delete process.env.FIRESTORE_EMULATOR_HOST;
      delete process.env.FIREBASE_AUTH_EMULATOR_HOST;

      if (fbPrivateKey && fbClientEmail && fbProjectId) {
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
    }
    if (projectId) {
      appOptions.projectId = projectId;
    } else {
      appOptions.projectId = fbProjectId || 'roombox-f7bff'; // Default fallback
    }
    // Note: Admin SDK currently binds default database to the app; named databases can be handled at Firestore client level if needed.

    console.log(`[FirebaseAdmin] Initializing "${appName}" for project "${appOptions.projectId}" (Emulator: ${!!isEmulator})`);
    const app = initializeApp(appOptions, appName);
    const db = getFirestore(app);
    db.settings({ ignoreUndefinedProperties: true });
    adminApps.set(appName, app);
    return app;
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error);
    if (error instanceof Error) {
      console.error(error.stack);
    }
    throw error; // Rethrow original error for better debugging
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

const customFirestoreInstances = new LRUCache<string, Firestore>(50);

/**
 * Generic selector: fetch owner user doc from App DB and return their data DB.
 * 
 * MULTI-TENANCY & PHYSICAL DATABASE SHARDING (ENTERPRISE ENFORCEMENT):
 * - For normal users, this returns the default Firestore database.
 * - For Enterprise clients (e.g., 50+ buildings), their database is physically isolated
 *   on a separate Firebase Project or Database instance.
 * - This function intercepts all data queries and dynamically connects to their specific shard.
 */
export async function selectOwnerDataAdminDb(ownerId: string): Promise<Firestore> {
  const appDb = await getAdminDb();
  const ownerDoc = await appDb.collection('users').doc(ownerId).get();
  const ownerData = ownerDoc.data();
  const enterpriseProject = ownerData?.subscription?.enterpriseProject;
  
  if (!enterpriseProject) {
      return getAdminDb();
  }
  
  const enterpriseDbId = enterpriseProject.databaseId as string | undefined;
  const enterpriseProjectId = enterpriseProject.projectId as string | undefined;
  const oauthTokens = enterpriseProject.oauthTokens;
  const serviceAccountJson = enterpriseProject.serviceAccountJson;

  if (enterpriseProjectId && (serviceAccountJson || oauthTokens)) {
    const cacheKey = `${ownerId}:${enterpriseProjectId}:${enterpriseDbId || '(default)'}`;
    if (customFirestoreInstances.has(cacheKey)) {
      return customFirestoreInstances.get(cacheKey)!;
    }

    console.log(`[FirebaseAdmin] Initializing custom Firestore for owner ${ownerId} (project: ${enterpriseProjectId})`);
    try {
      if (serviceAccountJson) {
        // NATIVE SERVICE ACCOUNT INITIALIZATION (Preferred V2 Approach)
        console.log(`[FirebaseAdmin] Using native Service Account for ${ownerId}`);
        const { Firestore: GCFirestore } = require('@google-cloud/firestore');
        const credentials = typeof serviceAccountJson === 'string' 
            ? JSON.parse(serviceAccountJson) 
            : serviceAccountJson;
            
        const firestore: Firestore = new GCFirestore({
            projectId: enterpriseProjectId,
            databaseId: enterpriseDbId && enterpriseDbId !== '(default)' ? enterpriseDbId : undefined,
            credentials,
        });
        
        firestore.settings({ ignoreUndefinedProperties: true });
        customFirestoreInstances.set(cacheKey, firestore);
        return firestore;
      } 
      else if (oauthTokens) {
        // OAUTH FALLBACK (Legacy)
        console.warn(`[FirebaseAdmin] Using legacy OAuth fallback for ${ownerId}`);
        const { google } = require('googleapis');
        const oauth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET
        );
        oauth2Client.setCredentials(decryptTokens(oauthTokens));

        if (typeof oauth2Client.getUniverseDomain !== 'function') oauth2Client.getUniverseDomain = async () => 'googleapis.com';
        if (typeof oauth2Client.getProjectId !== 'function') oauth2Client.getProjectId = async () => enterpriseProjectId;
        if (typeof oauth2Client.getClient !== 'function') oauth2Client.getClient = async () => oauth2Client;

        const { Firestore: GCFirestore } = require('@google-cloud/firestore');
        const firestore: Firestore = new GCFirestore({
          projectId: enterpriseProjectId,
          databaseId: enterpriseDbId && enterpriseDbId !== '(default)' ? enterpriseDbId : undefined,
          authClient: oauth2Client,
        });

        firestore.settings({ ignoreUndefinedProperties: true });
        
        firestore.runTransaction = async <T>(updateFunction: (transaction: FirebaseFirestore.Transaction) => Promise<T>, transactionOptions?: any): Promise<T> => {
            const mockTx = new OAuthTransactionAdapter(firestore);
            const result = await updateFunction(mockTx as any);
            await mockTx.commit();
            return result;
        };

        customFirestoreInstances.set(cacheKey, firestore);
        return firestore;
      }
    } catch (error) {
      console.error(`[FirebaseAdmin] Failed to initialize custom Firestore for owner ${ownerId}:`, error);
      throw new EnterpriseDbUnavailableError(ownerId, error);
    }
  }

  return getAdminDb(enterpriseProjectId, enterpriseDbId);
}




// Export auth instance for convenience
export const auth = getAuth(initializeAdminApp());
