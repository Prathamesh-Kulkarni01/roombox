
import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebaseAdmin';
import { getUserIdFromRequest } from '@/lib/auth-server';
import { unauthorized, forbidden, success, badRequest } from '@/lib/api/apiError';

export async function POST(req: NextRequest) {
    const userId = await getUserIdFromRequest(req);
    if (!userId) return unauthorized();

    try {
        const { targetPgId, targetRole } = await req.json();
        if (!targetRole) return badRequest('Target role is required');

        const db = await getAdminDb();
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) return forbidden('User record not found');

        const userData = userDoc.data() || {};
        const auth = await getAdminAuth();

        let newClaims: any = { role: targetRole };

        if (targetRole === 'owner') {
            if (userData.role !== 'owner') return forbidden('Not authorized as owner');
            newClaims.ownerId = userId;
            // For owners, we might not need a specific pgId in claims if they manage all, 
            // but for UI consistency, we pick the target one.
            newClaims.pgId = targetPgId;
        } 
        else if (targetRole === 'tenant') {
            const tenancy = userData.activeTenancies?.find((t: any) => t.pgId === targetPgId);
            if (!tenancy) return forbidden('No tenant membership found for this property');
            
            newClaims.ownerId = tenancy.ownerId;
            newClaims.pgId = tenancy.pgId;
            newClaims.guestId = tenancy.guestId;
        }
        else if (['manager', 'cook', 'cleaner', 'security', 'staff', 'other'].includes(targetRole)) {
            const profile = userData.activeStaffProfiles?.find((p: any) => p.ownerId && (p.pgIds?.includes(targetPgId) || p.pgId === targetPgId));
            if (!profile) return forbidden('No staff profile found for this property');

            newClaims.ownerId = profile.ownerId;
            newClaims.pgId = targetPgId;
            newClaims.staffId = profile.staffId;
            // Staff permissions usually live on the staff record, but for consistency 
            // we'll set them in claims if they are synced to the user doc.
            if (userData.permissions) newClaims.permissions = userData.permissions;
        }
        else {
            return badRequest('Invalid role for context switching');
        }

        // Set the new claims
        await auth.setCustomUserClaims(userId, newClaims);

        // Update lastActiveContext for persistence
        await db.collection('users').doc(userId).update({
            lastActiveContext: {
                role: targetRole,
                pgId: targetPgId || null,
                ownerId: newClaims.ownerId
            },
            // Maintain top-level fields for legacy/default lookups
            role: targetRole,
            pgId: targetPgId || userData.pgId,
            ownerId: newClaims.ownerId || userData.ownerId,
            guestId: newClaims.guestId || null,
            staffId: newClaims.staffId || null
        });

        return success({ message: 'Context switched successfully', claims: newClaims });

    } catch (error: any) {
        console.error('[SwitchContext] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
