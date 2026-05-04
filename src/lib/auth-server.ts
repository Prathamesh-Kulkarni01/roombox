
import { NextRequest } from 'next/server';
import { headers } from 'next/headers';
import { auth } from './firebaseAdmin';
import { PlanName, SubscriptionStatus } from './types';

export async function getUserIdFromRequest(req?: NextRequest, explicitToken?: string): Promise<string | null> {
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

        if (!token) {
            console.warn('[AuthServer] No token found in request headers');
            return null;
        }

        console.log(`[AuthServer] Processing token (len: ${token.length}): ${token.substring(0, 10)}...`);

        if (token === 'undefined' || token === 'null') {
            console.warn(`[AuthServer] Received literal string "${token}" as token`);
            return null;
        }

        // --- PREVENT NOISY FIREBASE ADMIN SDK ERRORS ---

        // 1. Check if it's the CRON_SECRET (used by internal scripts)
        if (process.env.CRON_SECRET && token === process.env.CRON_SECRET) {
            // Internal cron jobs handle their own secret verification in their routes.
            // We return null here to avoid passing a non-JWT secret to verifyIdToken().
            return null;
        }

        // 2. Basic JWT format validation (Firebase ID tokens are JWTs: header.payload.signature)
        if (token.split('.').length !== 3) {
            console.warn('[AuthServer] Token is not a valid 3-part JWT');
            return null;
        }

        const decodedToken = await auth.verifyIdToken(token);
        return decodedToken.uid;
    } catch (error: any) {
        console.error('[AuthServer] Error verifying token:', error.message || error);
        return null;
    }
}


import { getAdminDb } from './firebaseAdmin';

/**
 * Derives the effective ownerId from the request's auth token and returns user details.
 * For Owners: returns their own UID as ownerId.
 * For Staff/Tenants: returns their associated ownerId.
 */
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
        const db = await getAdminDb();
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            console.warn(`[AuthServer] User record not found in Firestore for UID: ${userId}`);
            return { ownerId: null, error: 'Unauthorized: User record not found' };
        }

        const userData = userDoc.data();
        if (!userData) return { ownerId: null, error: 'Unauthorized: User data not found' };

        // Detail common user info
        const status = userData.status || 'active';
        if (status === 'suspended' || status === 'rejected') {
            console.warn(`[AuthServer] Access blocked for ${status} user: ${userId}`);
            return { ownerId: null, error: `Forbidden: Account ${status}. Please contact support.` };
        }

        const result = {
            userId,
            name: userData.name || userData.email || 'Unknown User',
            email: userData.email,
            role: userData.role,
            status: status,
            guestId: userData.guestId,
            error: null as string | null
        };

        // If user is owner, the effective ownerId is their own ID
        if (userData.role === 'owner') {
            return {
                ...result,
                ownerId: userId,
                permissions: userData.permissions || ['all'], // Owners have implicit 'all'
                pgIds: userData.pgIds || [], // Owners have access to all PGs
                plan: userData.subscription?.planId ? {
                    id: userData.subscription.planId,
                    status: userData.subscription.status
                } : { id: 'trial', status: 'active' } // Default to trial if no subscription info
            };
        }

        // If user is staff or tenant, use their assigned ownerId
        if (userData.ownerId && userData.role !== 'owner') {
            // For staff/tenants, we need to fetch the owner's plan too for enforcement
            const ownerDoc = await db.collection('users').doc(userData.ownerId).get();
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

/**
 * Server Action version of getVerifiedOwnerId.
 */
export async function getVerifiedOwnerIdFromHeaders(token?: string) {
    return getVerifiedOwnerId(undefined, token);
}
