
import { NextRequest } from 'next/server';
import { auth } from './firebaseAdmin';

export async function getUserIdFromRequest(req: NextRequest): Promise<string | null> {
    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            // Fallback to checking for a cookie if needed, but the user specifically mentioned auth token
            return null;
        }

        const token = authHeader.split('Bearer ')[1];
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
export async function getVerifiedOwnerId(req: NextRequest): Promise<{
    ownerId: string | null,
    userId?: string,
    role?: string,
    guestId?: string,
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
        if (userData.role === 'owner') return { ...result, ownerId: userId };

        // If user is staff or tenant, use their assigned ownerId
        if (userData.role === 'staff' || userData.role === 'tenant') {
            if (userData.ownerId) return { ...result, ownerId: userData.ownerId };
        }

        return { ownerId: null, error: 'Forbidden: No owner context associated with this user' };
    } catch (error) {
        console.error('[AuthServer] Error fetching user data:', error);
        return { ownerId: null, error: 'Internal Server Error during auth verification' };
    }
}
