import { db } from './firebase';
import { collection, doc, setDoc, getDoc, query, where, getDocs } from 'firebase/firestore';
import type { PWAConfig } from './types';

const PWA_COLLECTION = 'pwa_configs';

export async function savePWAConfig(ownerId: string, config: PWAConfig) {
    try {
        await setDoc(doc(db, PWA_COLLECTION, ownerId), {
            ...config,
            updatedAt: new Date().toISOString(),
            ownerId
        });
        return true;
    } catch (error) {
        console.error('Error saving PWA config:', error);
        throw new Error('Failed to save PWA configuration');
    }
}

export async function getPWAConfigByOwnerId(ownerId: string): Promise<PWAConfig | null> {
    try {
        const docRef = doc(db, PWA_COLLECTION, ownerId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
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
        const q = query(
            collection(db, PWA_COLLECTION),
            where('subdomain', '==', subdomain)
        );
        
        const querySnapshot = await getDocs(q);
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
        // Query the tenants collection to get the owner ID
        const tenantDoc = await getDoc(doc(db, 'tenants', tenantId));
        if (tenantDoc.exists()) {
            return tenantDoc.data().ownerId || null;
        }
        return null;
    } catch (error) {
        console.error('Error getting owner for tenant:', error);
        return null;
    }
}