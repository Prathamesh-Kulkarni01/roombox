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
    role: string;
    permissions?: string[];
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
    routeLabel?: string
): Promise<EnforcePermissionResult> {
    const authResult = await getVerifiedOwnerId(req);
    const { ownerId, userId, role, permissions, plan, error } = authResult;

    if (!ownerId || !userId) {
        return { authorized: false, response: unauthorized(error) };
    }

    // Owners and admins bypass all permission checks
    if (role === 'owner' || role === 'admin') {
        return {
            authorized: true,
            ownerId,
            userId,
            role,
            permissions,
            plan,
        };
    }

    // For staff/tenant users, check granular permissions
    const requiredPerm = `${feature}:${action}`;
    const hasPermission = Array.isArray(permissions) && permissions.includes(requiredPerm);

    if (!hasPermission) {
        // Log the denied access attempt (non-blocking)
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

    return {
        authorized: true,
        ownerId,
        userId,
        role: role!,
        permissions,
        plan,
    };
}

/**
 * Convenience wrapper for routes where the action type is determined from the request body.
 * Call getVerifiedOwnerId first, then this after parsing the action discriminator.
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
    // Owners and admins bypass
    if (role === 'owner' || role === 'admin') {
        return { authorized: true };
    }

    const requiredPerm = `${feature}:${action}`;
    const hasPermission = Array.isArray(permissions) && permissions.includes(requiredPerm);

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
