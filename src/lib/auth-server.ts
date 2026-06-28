import { NextRequest } from 'next/server';
import { headers } from 'next/headers';
import { getAdminDb, auth as centralAuth } from './firebaseAdmin';
import { resolveTenant } from './tenantResolver';
import { PlanName, SubscriptionStatus } from './types';
import { resolveTenantBySubdomain, resolveTenantByOwnerId } from './tenant-registry';

export async function getUserIdFromRequest(req: NextRequest | null, explicitToken?: string): Promise<string | null> {
    try {
        let token: string | null = explicitToken || null;
        if (!token) {
            let authHeader: string | null = null;
            if (req) {
                authHeader = req.headers.get('Authorization');
            } else {
                const headerList = await headers();
                authHeader = headerList.get('Authorization');
            }
            if (authHeader && authHeader.startsWith('Bearer ')) {
                token = authHeader.substring(7);
            }
        }

        if (!token) {
            console.error('[AuthServer] No token found in request headers');
            return null;
        }

        if (token === 'undefined' || token === 'null') {
            return null;
        }

        if (process.env.CRON_SECRET && token === process.env.CRON_SECRET) {
            return null;
        }

        if (token.split('.').length !== 3) {
            console.error('[AuthServer] Invalid token format');
            return null;
        }

        // Dynamically get the correct Admin Auth based on the current tenant context
        const { auth: activeAdminAuth } = await resolveTenant(req as any);
        
        try {
            // First, try verifying using the resolved Admin Auth (Tenant Auth if enterprise)
            const decodedToken = await activeAdminAuth.verifyIdToken(token);
            console.log('[AuthServer] Token verified successfully by activeAdminAuth for UID:', decodedToken.uid);
            return decodedToken.uid;
        } catch (tenantAuthError: any) {
            // If the token was not minted by the Tenant Auth, it might be an Owner 
            // logged into the Central Auth (Owners always use Central Auth).
            if (activeAdminAuth !== centralAuth) {
                console.log('[AuthServer] activeAdminAuth failed to verify token, falling back to centralAuth...', tenantAuthError.message);
                try {
                    const decodedToken = await centralAuth.verifyIdToken(token);
                    console.log('[AuthServer] Token verified successfully by centralAuth for UID:', decodedToken.uid);
                    return decodedToken.uid;
                } catch (centralAuthError: any) {
                    console.error('[AuthServer] Error verifying token against Central Auth:', centralAuthError.message);
                    return null;
                }
            }
            console.error('[AuthServer] Error verifying token:', tenantAuthError.message);
            return null;
        }
    } catch (error: any) {
        console.error('[AuthServer] Error in getUserIdFromRequest:', error.message || error);
        return null;
    }
}

async function getTokenClaims(req?: NextRequest, explicitToken?: string): Promise<Record<string, any> | null> {
    try {
        let token: string | null = explicitToken || null;

        if (!token) {
            let authHeader: string | null = null;
            if (req) {
                authHeader = req.headers.get('Authorization');
            } else {
                const headerList = await headers();
                authHeader = headerList.get('Authorization');
            }
            if (authHeader?.startsWith('Bearer ')) {
                token = authHeader.split('Bearer ')[1].trim();
            }
        }

        if (!token || token === 'undefined' || token === 'null') return null;
        if (token.split('.').length !== 3) return null;

        const { auth: activeAdminAuth } = await resolveTenant(req as any);
        try {
            const decoded = await activeAdminAuth.verifyIdToken(token);
            return decoded as Record<string, any>;
        } catch {
            if (activeAdminAuth !== centralAuth) {
                try {
                    const decoded = await centralAuth.verifyIdToken(token);
                    return decoded as Record<string, any>;
                } catch {
                    return null;
                }
            }
            return null;
        }
    } catch {
        return null;
    }
}

export async function getVerifiedOwnerId(req?: NextRequest, token?: string): Promise<{
    ownerId: string | null,
    userId?: string,
    name?: string,
    role?: string,
    guestId?: string,
    permissions?: string[],
    pgIds?: string[],
    plan?: { id: PlanName; status: SubscriptionStatus },
    status?: string,
    email?: string,
    error: string | null
}> {
    const userId = await getUserIdFromRequest(req, token);
    if (!userId) return { ownerId: null, error: 'Unauthorized: Invalid or missing token' };

    try {
        // Look up the user in the Tenant Database (which defaults to Central DB if not enterprise)
        const { db: activeDb, tenantId } = await resolveTenant(req as any);
        let userDoc = await activeDb.collection('users').doc(userId).get();
        let isTenantDb = activeDb !== await getAdminDb();

        if (!userDoc.exists && isTenantDb) {
             // Fallback to central DB just in case it's an owner logging into their own tenant subdomain
             const centralDb = await getAdminDb();
             userDoc = await centralDb.collection('users').doc(userId).get();
        }

        if (!userDoc.exists) {
            console.warn(`[AuthServer] User record not found for UID: ${userId}.`);
            // Without a custom token to carry claims, we rely on the Firestore document existing.
            // If we are fully native, the user MUST have a record in the active database.
            return { ownerId: null, error: 'Unauthorized: User record not found' };
        }

        const userData = userDoc.data();
        if (!userData) return { ownerId: null, error: 'Unauthorized: User data not found' };

        const status = userData.status || 'active';
        if (status === 'suspended' || status === 'rejected') {
            return { ownerId: null, error: `Forbidden: Account ${status}. Please contact support.` };
        }

        const result = {
            userId,
            name: userData.name || userData.email || userData.phone || 'Unknown User',
            email: userData.email,
            role: userData.role,
            status: status,
            guestId: userData.guestId,
            error: null as string | null
        };

        // If user is owner
        if (userData.role === 'owner') {
            return {
                ...result,
                ownerId: userId,
                permissions: userData.permissions || ['all'],
                pgIds: userData.pgIds || [],
                plan: userData.subscription?.planId ? {
                    id: userData.subscription.planId,
                    status: userData.subscription.status
                } : { id: 'trial', status: 'active' }
            };
        }

        // If user is staff or tenant
        if (userData.ownerId && userData.role !== 'owner') {
            // BOUNDARY ENFORCEMENT: Ensure the user belongs to the subdomain they are accessing
            if (tenantId && userData.ownerId !== tenantId) {
                console.warn(`[AuthServer] Boundary Enforcement Failed: User ${userId} (ownerId: ${userData.ownerId}) attempted to access tenant ${tenantId}`);
                return { ownerId: null, error: `Forbidden: You do not have access to this tenant's workspace.` };
            }

            // For staff/tenants, fetch the owner's plan from Central DB
            const centralDb = await getAdminDb();
            const ownerDoc = await centralDb.collection('users').doc(userData.ownerId).get();
            const ownerData = ownerDoc.data();
            
            return {
                ...result,
                ownerId: userData.ownerId,
                permissions: userData.permissions || [],
                pgIds: userData.pgIds || (userData.pgId ? [userData.pgId] : []),
                plan: ownerData?.subscription?.planId ? {
                    id: ownerData.subscription.planId,
                    status: ownerData.subscription.status
                } : { id: 'trial', status: 'active' }
            };
        }

        return { ownerId: null, error: 'Forbidden: No owner context associated with this user' };
    } catch (error) {
        console.error('[AuthServer] Error fetching user data:', error);
        return { ownerId: null, error: 'Internal Server Error during auth verification' };
    }
}

export async function getVerifiedOwnerIdFromHeaders(token?: string) {
    return getVerifiedOwnerId(undefined, token);
}
