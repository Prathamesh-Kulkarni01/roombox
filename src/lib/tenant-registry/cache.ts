import type { TenantMetadata } from './types';

interface CacheEntry {
    data: TenantMetadata;
    expiresAt: number;
}

const CACHE_TTL_MS = 1000 * 60 * 5; // 5 minutes
const tenantCache = new Map<string, CacheEntry>();

export function getCachedTenant(ownerId: string): TenantMetadata | null {
    const entry = tenantCache.get(ownerId);
    if (!entry) return null;
    
    if (Date.now() > entry.expiresAt) {
        tenantCache.delete(ownerId);
        return null;
    }
    
    return entry.data;
}

export function cacheTenant(tenant: TenantMetadata): void {
    tenantCache.set(tenant.ownerId, {
        data: tenant,
        expiresAt: Date.now() + CACHE_TTL_MS
    });
}

export function invalidateTenantCache(ownerId: string): void {
    tenantCache.delete(ownerId);
}
