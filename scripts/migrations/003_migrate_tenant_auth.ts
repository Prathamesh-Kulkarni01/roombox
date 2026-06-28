/**
 * 003_migrate_tenant_auth.ts
 * 
 * Migration script to move users from the Central RentSutra Firebase Auth
 * to their respective Tenant Firebase Auth projects.
 * 
 * RUN THIS ONLY DURING MAINTENANCE WINDOW.
 * 
 * WARNING: Password hashes cannot be seamlessly exported from Firebase Auth 
 * without Google Cloud Identity Platform hash keys. Users logging in with 
 * passwords will need to reset their passwords upon their first login in 
 * the new TENANT authMode. Phone/OTP users will migrate seamlessly.
 */

import * as admin from 'firebase-admin';
import { getAdminDb } from '../../src/lib/firebaseAdmin';
import { decryptTokens } from '../../src/lib/encryption';
import { getEnv } from '../../src/lib/env';

export async function runMigration(ownerId: string) {
    const defaultDb = await getAdminDb();
    
    // 1. Fetch Owner's enterprise configuration
    const ownerDoc = await defaultDb.collection('users').doc(ownerId).get();
    const ownerData = ownerDoc.data();
    
    if (!ownerData?.subscription?.enterpriseProject?.oauthTokens) {
        console.error(`Owner ${ownerId} does not have enterprise project credentials.`);
        return;
    }
    
    const { projectId, oauthTokens } = ownerData.subscription.enterpriseProject;
    const tokens = decryptTokens(oauthTokens);
    
    // 2. Initialize Tenant Admin App
    const appName = `migration-tenant-${ownerId}`;
    const refreshTokenCredential = {
        client_id: getEnv('GOOGLE_CLIENT_ID')!,
        client_secret: getEnv('GOOGLE_CLIENT_SECRET')!,
        refresh_token: tokens.refresh_token,
        type: "authorized_user"
    };
    
    const tenantApp = admin.initializeApp({
        credential: admin.credential.refreshToken(refreshTokenCredential),
        projectId: projectId,
    }, appName);
    
    const tenantAuth = admin.auth(tenantApp);
    const centralAuth = admin.auth();
    
    console.log(`Starting Auth Migration for Owner: ${ownerId}`);
    
    let nextPageToken: string | undefined;
    let migratedCount = 0;
    
    do {
        const listUsersResult = await centralAuth.listUsers(1000, nextPageToken);
        nextPageToken = listUsersResult.pageToken;
        
        for (const userRecord of listUsersResult.users) {
            const claims = userRecord.customClaims || {};
            
            // Check if this user belongs to the target owner
            if (claims.ownerId === ownerId || claims.tenantId === ownerId) {
                console.log(`Migrating user ${userRecord.uid} (${userRecord.phoneNumber || userRecord.email})`);
                
                try {
                    // Import user to Tenant Auth WITHOUT password hashes
                    await tenantAuth.importUsers([{
                        uid: userRecord.uid,
                        email: userRecord.email,
                        phoneNumber: userRecord.phoneNumber,
                        displayName: userRecord.displayName,
                        customClaims: claims
                    }]);
                    
                    migratedCount++;
                } catch (err) {
                    console.error(`Failed to migrate user ${userRecord.uid}:`, err);
                }
            }
        }
    } while (nextPageToken);
    
    // 3. Toggle authMode to 'TENANT' for this owner
    await ownerDoc.ref.update({
        authMode: 'TENANT',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // 4. Log Migration Execution
    await defaultDb.collection('system_migrations').doc(`003_migrate_tenant_auth_${ownerId}`).set({
        name: `003_migrate_tenant_auth`,
        ownerId: ownerId,
        migratedUsersCount: migratedCount,
        executedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`Migration Complete for ${ownerId}. Migrated ${migratedCount} users.`);
    console.log(`authMode switched to TENANT. Next logins for this PG will hit the tenant's isolated Auth pool directly.`);
}
