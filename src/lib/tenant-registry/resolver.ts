import { getAdminDb } from '../firebaseAdmin';
import { getOwnerIdFromSubdomain } from '../actions/siteActions';
import type { TenantMetadata } from './types';
import { cacheTenant, getCachedTenant } from './cache';

export async function resolveTenantByOwnerId(ownerId: string): Promise<TenantMetadata | null> {
    const cached = getCachedTenant(ownerId);
    if (cached) return cached;

    const defaultDb = await getAdminDb();
    const ownerDoc = await defaultDb.collection('users').doc(ownerId).get();
    
    if (!ownerDoc.exists) return null;
    
    const data = ownerDoc.data();
    
    const tenantMetadata: TenantMetadata = {
        ownerId,
        subdomain: data?.pgSlug || null,
        authMode: data?.authMode || 'CENTRAL', // Default to CENTRAL for backward compatibility
        status: data?.status || 'active',
        firebaseConfig: data?.subscription?.enterpriseProject?.clientConfig || null,
        plan: data?.subscription?.planId || 'trial',
        branding: data?.branding || null,
        features: data?.features || {},
        oauthTokens: data?.subscription?.enterpriseProject?.oauthTokens
    };

    cacheTenant(tenantMetadata);
    return tenantMetadata;
}

export async function resolveTenantBySubdomain(subdomain: string): Promise<TenantMetadata | null> {
    const ownerId = await getOwnerIdFromSubdomain(subdomain);
    if (!ownerId) return null;
    return resolveTenantByOwnerId(ownerId);
}
