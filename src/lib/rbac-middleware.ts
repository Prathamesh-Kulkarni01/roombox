/**
 * rbac-middleware.ts — Server-side RBAC enforcement for API routes.
 * 
 * Usage in API route handlers:
 * 
 *   const result = await enforcePermission(req, 'guests', 'add');
 *   if (!result.authorized) return result.response;
 *   const { ownerId, userId, role } = result;
 *   // ... proceed with business logic
 */
import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedOwnerId } from './auth-server';
import { unauthorized, forbidden } from './api/apiError';
import { logAccessDenied } from './rbac-audit';

interface AuthorizedResult {
    authorized: true;
    ownerId: string;
    userId: string;
    name?: string;
    role: string;
    permissions?: string[];
    pgIds?: string[];
    plan?: { id: string; status: string };
}

interface DeniedResult {
    authorized: false;
    response: NextResponse;
}

export type EnforcePermissionResult = AuthorizedResult | DeniedResult;

/**
 * Validates that the calling user has the required permission for the given feature + action.
 * 
 * - Owners and admins bypass all permission checks.
 * - Staff and tenant users must have "feature:action" in their permissions array.
 * - Denied attempts are logged to the `rbac_audit_logs` collection.
 * 
 * @param req - The incoming Next.js request
 * @param feature - The feature/module key (e.g., 'guests', 'complaints', 'finances')
 * @param action - The action key (e.g., 'view', 'add', 'edit', 'delete')
 * @param routeLabel - Optional label for audit logging (e.g., 'POST /api/guests')
 */
export async function enforcePermission(
    req: NextRequest,
    feature: string,
    action: string,
    routeLabel?: string,
    isSensitive: boolean = false
): Promise<EnforcePermissionResult> {
    const authResult = await getVerifiedOwnerId(req);
    const { ownerId, userId, name, role, permissions, plan, error, guestId } = authResult;

    if (!ownerId || !userId) {
        return { authorized: false, response: unauthorized(error) };
    }

    // --- SCOPE & PERMISSION RESOLUTION ---
    
    // 1. Super-roles (Owner/Admin) have implicit "All" permissions but still get scoped
    const isSuperRole = role === 'owner' || role === 'admin';
    const requiredPerm = `${feature}:${action}`;
    const hasPermission = isSuperRole || (Array.isArray(permissions) && permissions.includes(requiredPerm));

    if (!hasPermission) {
        // Log the denied access attempt
        const route = routeLabel || `${req.method} ${req.nextUrl.pathname}`;
        logAccessDenied({
            staffId: userId,
            ownerId,
            module: feature,
            action,
            route,
            userPermissions: permissions || [],
        });

        return {
            authorized: false,
            response: forbidden(`Access denied: missing permission '${feature}:${action}'`),
        };
    }

    // 2. Hybrid Runtime Validation for Sensitive Actions
    // If the route is marked as sensitive, we bypass the JWT claims and check Firestore directly.
    if (isSensitive && role !== 'owner') {
        const db = await (import('./firebaseAdmin').then(m => m.getAdminDb()));
        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();
        const userData = userDoc.data();

        if (!userDoc.exists || !userData || userData.status === 'suspended') {
            return { authorized: false, response: forbidden('Account suspended or access revoked. Please re-login.') };
        }

        // Verify PG scope in real-time
        if (userData.pgIds && Array.isArray(userData.pgIds)) {
            const requestedPgId = req.nextUrl.searchParams.get('pgId');
            if (requestedPgId && !userData.pgIds.includes(requestedPgId)) {
                return { authorized: false, response: forbidden('Horizontal data leak blocked: Real-time PG check failed.') };
            }
        }
    }

    // 2. Data Scope Enforcement (PG Isolation)
    // For Owners/Admins, scope is Global. For Staff, it's assigned PGs.
    // We pass this through so Route Handlers can filter their DB queries.
    return {
        authorized: true,
        ownerId,
        userId,
        name,
        role: role!,
        permissions,
        pgIds: authResult.pgIds,
        plan,
    };
}

/**
 * Convenience wrapper for routes where the action type is determined from the request body.
 */
export async function enforcePermissionForStaff(
    userId: string,
    ownerId: string,
    role: string,
    permissions: string[] | undefined,
    feature: string,
    action: string,
    routeLabel: string
): Promise<{ authorized: true } | { authorized: false; response: NextResponse }> {
    const isSuperRole = role === 'owner' || role === 'admin';
    const requiredPerm = `${feature}:${action}`;
    const hasPermission = isSuperRole || (Array.isArray(permissions) && permissions.includes(requiredPerm));

    if (!hasPermission) {
        logAccessDenied({
            staffId: userId,
            ownerId,
            module: feature,
            action,
            route: routeLabel,
            userPermissions: permissions || [],
        });

        return {
            authorized: false,
            response: forbidden(`Access denied: missing permission '${feature}:${action}'`),
        };
    }

    return { authorized: true };
}
