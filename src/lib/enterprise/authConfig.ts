import { google } from 'googleapis';
import { getAdminDb } from '@/lib/firebaseAdmin';

/**
 * Synchronizes the owner's PG subdomains to their Custom Enterprise Database Authorized Domains list.
 * This ensures that when new properties are created, the associated subdomains are instantly allowed 
 * by Firebase Auth on their custom project.
 * 
 * @param ownerId The main system UID of the owner.
 */
export async function syncEnterpriseAuthorizedDomains(ownerId: string) {
    try {
        const adminDb = await getAdminDb();
        const ownerSnap = await adminDb.collection('users').doc(ownerId).get();
        if (!ownerSnap.exists) return;
        
        const ownerData = ownerSnap.data();
        const projectId = ownerData?.subscription?.enterpriseProject?.projectId?.trim();
        
        // If the user does not have a custom project ID configured, exit early.
        if (!projectId) return;

        console.log(`[Enterprise Auth Sync] Syncing subdomains for owner ${ownerId} to project ${projectId}`);

        const clientEmailEnv = process.env.FIREBASE_CLIENT_EMAIL;
        const privateKeyEnv = process.env.FIREBASE_PRIVATE_KEY;
        const legacyConfigEnv = process.env.FIREBASE_ADMIN_SDK_CONFIG;

        let credentials: any = undefined;
        if (clientEmailEnv && privateKeyEnv) {
            credentials = {
                type: 'service_account',
                client_email: clientEmailEnv,
                private_key: privateKeyEnv.replace(/\\n/g, '\n').replace(/"/g, ''),
                project_id: process.env.FIREBASE_PROJECT_ID
            };
        } else if (legacyConfigEnv) {
            try {
                credentials = JSON.parse(legacyConfigEnv);
            } catch {}
        } else {
            try {
                const fs = require('fs');
                const path = require('path');
                const saPath = path.resolve(process.cwd(), 'service-account.json');
                if (fs.existsSync(saPath)) {
                    credentials = JSON.parse(fs.readFileSync(saPath, 'utf8'));
                }
            } catch {}
        }

        if (!credentials) {
            console.warn('[Enterprise Auth Sync] No central service account credentials available.');
            return;
        }

        // Generate a raw JWT token and inject it into global headers
        const jwtClient = new google.auth.JWT({
            email: credentials.client_email,
            key: credentials.private_key,
            scopes: [
                'https://www.googleapis.com/auth/cloud-platform',
                'https://www.googleapis.com/auth/datastore',
                'https://www.googleapis.com/auth/firebase'
            ]
        });

        await jwtClient.authorize();
        const token = jwtClient.credentials.access_token;
        if (token) {
            google.options({
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
        }

        // Fetch subdomains via sites collection (has ownerId field)
        const sitesSnap = await adminDb.collection('sites').where('ownerId', '==', ownerId).get();
        const subdomains = sitesSnap.docs.map(doc => doc.data().subdomain).filter(Boolean);
        
        const authorizedDomains = [
            'localhost', 
            'rentsutra.in',
            'dev.rentsutra.in',
            'staging.rentsutra.in'
        ];
        
        subdomains.forEach(sub => {
            authorizedDomains.push(`${sub}.rentsutra.in`);
            authorizedDomains.push(`${sub}.dev.rentsutra.in`);
            authorizedDomains.push(`${sub}.staging.rentsutra.in`);
        });

        const customDomain = ownerData?.subscription?.enterpriseProject?.customDomain;
        if (customDomain) {
            authorizedDomains.push(customDomain);
        }

        const uniqueDomains = Array.from(new Set(authorizedDomains));
        console.log('[Enterprise Auth Sync] Authorized Domains to Sync:', uniqueDomains);

        const identity = google.identitytoolkit({ version: 'v2' });
        await identity.projects.updateConfig({
            name: `projects/${projectId}/config`,
            updateMask: 'authorizedDomains',
            requestBody: {
                authorizedDomains: uniqueDomains
            }
        });

        console.log(`[Enterprise Auth Sync] Successfully synced authorized domains for ${projectId}`);
    } catch (err: any) {
        if (err.status === 404 || err.code === 404 || err.message?.includes('CONFIGURATION_NOT_FOUND')) {
            console.warn('[Enterprise Auth Sync] Identity Toolkit configuration not found. Project likely missing Auth initialization.');
        } else {
            console.error('[Enterprise Auth Sync] Failed to sync authorized domains:', err.message || err);
        }
    }
}
