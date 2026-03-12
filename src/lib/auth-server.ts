
import { NextRequest } from 'next/server';
import { headers } from 'next/headers';
import { auth } from './firebaseAdmin';
import { PlanName, SubscriptionStatus } from './types';

export async function getUserIdFromRequest(req?: NextRequest): Promise<string | null> {
    try {
        let authHeader: string | null = null;
        if (req) {
            authHeader = req.headers.get('Authorization');
        } else {
            const headerList = await headers();
            authHeader = headerList.get('Authorization');
        }

        if (!authHeader?.startsWith('Bearer ')) {
            // Fallback to checking for a cookie if needed, but the user specifically mentioned auth token
            return null;
        }

        const token = authHeader.split('Bearer ')[1];

        // --- PREVENT NOISY FIREBASE ADMIN SDK ERRORS ---

        // 1. Check if it's the CRON_SECRET (used by internal scripts)
        if (process.env.CRON_SECRET && token === process.env.CRON_SECRET) {
            // Internal cron jobs handle their own secret verification in their routes.
            // We return null here to avoid passing a non-JWT secret to verifyIdToken().
            return null;
        }

        // 2. Basic JWT format validation (Firebase ID tokens are JWTs: header.payload.signature)
        if (token.split('.').length !== 3) {
            // Not a valid JWT, skip verifyIdToken to avoid "Decoding Firebase ID token failed" error
            return null;
        }

        const decodedToken = await auth.verifyIdToken(token);
        return decodedToken.uid;
    } catch (error) {
        console.error('[AuthServer] Error verifying token:', error);
        return null;
    }
}


import { getAdminDb } from './firebaseAdmin';

/**
 * Derives the effective ownerId from the request's auth token and returns user details.
 * For Owners: returns their own UID as ownerId.
 * For Staff/Tenants: returns their associated ownerId.
 */
export async function getVerifiedOwnerId(req?: NextRequest): Promise<{
    ownerId: string | null,
    userId?: string,
    role?: string,
    guestId?: string,
    plan?: { id: PlanName; status: SubscriptionStatus },
    error: string | null
}> {
    const userId = await getUserIdFromRequest(req);
    if (!userId) return { ownerId: null, error: 'Unauthorized: Invalid or missing token' };

    try {
        const db = await getAdminDb();
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) return { ownerId: null, error: 'Unauthorized: User record not found' };

        const userData = userDoc.data();
        if (!userData) return { ownerId: null, error: 'Unauthorized: User data not found' };

        // Detail common user info
        const result = {
            userId,
            role: userData.role,
            guestId: userData.guestId,
            error: null as string | null
        };

        // If user is owner, the effective ownerId is their own ID
        if (userData.role === 'owner') {
            return {
                ...result,
                ownerId: userId,
                plan: userData.subscription?.planId ? {
                    id: userData.subscription.planId,
                    status: userData.subscription.status
                } : { id: 'free', status: 'active' } // Default to free if no subscription info
            };
        }

        // If user is staff or tenant, use their assigned ownerId
        if (userData.role === 'staff' || userData.role === 'tenant') {
            if (userData.ownerId) {
                // For staff/tenants, we need to fetch the owner's plan too for enforcement
                const ownerDoc = await db.collection('users').doc(userData.ownerId).get();
                const ownerData = ownerDoc.data();
                return {
                    ...result,
                    ownerId: userData.ownerId,
                    plan: ownerData?.subscription?.planId ? {
                        id: ownerData.subscription.planId,
                        status: ownerData.subscription.status
                    } : { id: 'free', status: 'active' }
                };
            }
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
export async function getVerifiedOwnerIdFromHeaders() {
    return getVerifiedOwnerId();
}
