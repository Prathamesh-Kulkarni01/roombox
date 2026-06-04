import { getAdminDb } from './firebaseAdmin';
import type { PWAConfig } from './types';

const PWA_COLLECTION = 'pwa_configs';

export async function savePWAConfig(ownerId: string, config: PWAConfig) {
    try {
        const adminDb = await getAdminDb();
        await adminDb.collection(PWA_COLLECTION).doc(ownerId).set({
            ...config,
            updatedAt: new Date().toISOString(),
            ownerId
        }, { merge: true });
        return true;
    } catch (error) {
        console.error('Error saving PWA config:', error);
        throw new Error('Failed to save PWA configuration');
    }
}

export async function getPWAConfigByOwnerId(ownerId: string): Promise<PWAConfig | null> {
    try {
        const adminDb = await getAdminDb();
        const docSnap = await adminDb.collection(PWA_COLLECTION).doc(ownerId).get();
        
        if (docSnap.exists) {
            return docSnap.data() as PWAConfig;
        }
        return null;
    } catch (error) {
        console.error('Error getting PWA config:', error);
        return null;
    }
}

export async function getPWAConfigBySubdomain(subdomain: string): Promise<PWAConfig | null> {
    try {
        const adminDb = await getAdminDb();
        const querySnapshot = await adminDb.collection(PWA_COLLECTION)
            .where('subdomain', '==', subdomain)
            .limit(1)
            .get();
            
        if (!querySnapshot.empty) {
            return querySnapshot.docs[0].data() as PWAConfig;
        }
        return null;
    } catch (error) {
        console.error('Error getting PWA config by subdomain:', error);
        return null;
    }
}

export async function getOwnerForTenant(tenantId: string): Promise<string | null> {
    try {
        const adminDb = await getAdminDb();
        const tenantDoc = await adminDb.collection('tenants').doc(tenantId).get();
        if (tenantDoc.exists) {
            return tenantDoc.data()?.ownerId || null;
        }
        return null;
    } catch (error) {
        console.error('Error getting owner for tenant:', error);
        return null;
    }
}