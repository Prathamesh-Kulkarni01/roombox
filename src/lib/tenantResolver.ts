import { NextRequest } from 'next/server';
import { getAdminDb, getAdminAuth, selectOwnerDataAdminDb } from './firebaseAdmin';
import { getOwnerIdFromSubdomain } from './actions/siteActions';
import type { Firestore } from 'firebase-admin/firestore';
import type { Auth } from 'firebase-admin/auth';
import { App } from 'firebase-admin/app';
import * as admin from 'firebase-admin';
import { decryptTokens } from './encryption';

import { LRUCache } from './lru-cache';

export interface TenantContext {
    db: Firestore;
    auth: Auth;
    isEnterprise: boolean;
    tenantId?: string; // ownerId
    projectId?: string;
    databaseId?: string;
}

const enterpriseApps = new LRUCache<string, App>(50);

/**
 * Ensures a dedicated Firebase App exists for the enterprise tenant, 
 * returning its Auth instance.
 */
async function getEnterpriseAuth(ownerId: string, enterpriseProject: any): Promise<Auth | null> {
    const { projectId, oauthTokens, serviceAccountJson } = enterpriseProject;
    
    if (!projectId || (!oauthTokens && !serviceAccountJson)) return null;
    
    const appName = `enterprise-${ownerId}`;
    
    if (enterpriseApps.has(appName)) {
        return admin.auth(enterpriseApps.get(appName)!);
    }
    
    const existing = admin.apps.find(a => a?.name === appName);
    if (existing) {
        enterpriseApps.set(appName, existing);
        return admin.auth(existing);
    }

    try {
        let credential;
        
        if (serviceAccountJson) {
            console.log(`[TenantResolver] Initializing custom App & Auth for owner ${ownerId} (project: ${projectId}) with Service Account`);
            const serviceAccount = typeof serviceAccountJson === 'string' 
                ? JSON.parse(serviceAccountJson) 
                : serviceAccountJson;
            credential = admin.credential.cert(serviceAccount);
        } else if (oauthTokens) {
            console.log(`[TenantResolver] Initializing custom App & Auth for owner ${ownerId} (project: ${projectId}) with OAuth`);
            const tokens = decryptTokens(oauthTokens);
            const refreshTokenCredential = {
                client_id: process.env.GOOGLE_CLIENT_ID!,
                client_secret: process.env.GOOGLE_CLIENT_SECRET!,
                refresh_token: tokens.refresh_token,
                type: "authorized_user"
            };
            credential = admin.credential.refreshToken(refreshTokenCredential);
        }
        
        const app = admin.initializeApp({
            credential,
            projectId: projectId,
        }, appName);
        
        enterpriseApps.set(appName, app);
        return admin.auth(app);
    } catch (e) {
        console.error(`[TenantResolver] Failed to initialize custom Auth for owner ${ownerId}:`, e);
        return null; // Fallback to something else or throw
    }
}

export async function resolveTenant(req: NextRequest | Request, overrideTenantId?: string): Promise<TenantContext> {
    // 1. Identify Tenant
    let tenantId: string | null = overrideTenantId || null;
    
    // Check custom header
    if (!tenantId) {
        tenantId = req.headers.get('x-tenant-id');
    }
    
    if (!tenantId) {
        // Fallback to checking host/subdomain
        const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
        if (host) {
            const hostname = host.split(':')[0];
            const baseDomain = process.env.NEXT_PUBLIC_APP_URL ? new URL(process.env.NEXT_PUBLIC_APP_URL).hostname : 'rentsutra.in';
            
            if (hostname !== baseDomain && hostname.endsWith(`.${baseDomain}`)) {
                const subdomain = hostname.replace(`.${baseDomain}`, '');
                // Resolve subdomain to ownerId
                tenantId = await getOwnerIdFromSubdomain(subdomain);
            }
        }
    }

    // 2. Fetch Default DB & Auth
    const defaultDb = await getAdminDb();
    const defaultAuth = await getAdminAuth();

    if (!tenantId) {
        return {
            db: defaultDb,
            auth: defaultAuth,
            isEnterprise: false
        };
    }

    // 3. Resolve Enterprise Context
    // selectOwnerDataAdminDb caches the custom Firestore connection, so it's safe to call here.
    const customDb = await selectOwnerDataAdminDb(tenantId);
    
    // Check if it's actually an enterprise user by seeing if customDb is different from defaultDb.
    // However, it's safer to fetch the user doc directly, or rely on selectOwnerDataAdminDb's logic.
    const ownerDoc = await defaultDb.collection('users').doc(tenantId).get();
    const ownerData = ownerDoc.data();
    const enterpriseProject = ownerData?.subscription?.enterpriseProject;
    
    if (enterpriseProject?.projectId && (enterpriseProject?.serviceAccountJson || enterpriseProject?.oauthTokens)) {
        const customAuth = await getEnterpriseAuth(tenantId, enterpriseProject);
        
        return {
            db: customDb,
            auth: customAuth || defaultAuth, // Fallback to default Auth if init fails
            isEnterprise: true,
            tenantId: tenantId,
            projectId: enterpriseProject.projectId,
            databaseId: enterpriseProject.databaseId || '(default)'
        };
    }

    // Not an enterprise user, but we know the tenantId
    return {
        db: customDb, // this will just be defaultDb if not enterprise
        auth: defaultAuth,
        isEnterprise: false,
        tenantId: tenantId
    };
}
