import { NextRequest, NextResponse } from 'next/server';
import { selectOwnerDataAdminDb, getAdminDb } from '@/lib/firebaseAdmin';
import { TenantService } from '@/services/tenantService';
import { enforcePermission, enforcePermissionForStaff } from '@/lib/rbac-middleware';
import { badRequest, serverError } from '@/lib/api/apiError';

// GET /api/tenants?[status=pending][&limit=10]
export async function GET(req: NextRequest) {
    const result = await enforcePermission(req, 'guests', 'view', 'GET /api/tenants');
    if (!result.authorized) return result.response;
    const { ownerId } = result;

    try {
        const status = req.nextUrl.searchParams.get('status') || undefined;
        const limit = parseInt(req.nextUrl.searchParams.get('limit') || '20', 10);
        const summary = req.nextUrl.searchParams.get('summary') === 'true';

        const db = await selectOwnerDataAdminDb(ownerId);

        if (summary) {
            const rentSummary = await TenantService.getMonthlyRentSummary(db, ownerId);
            return NextResponse.json({ success: true, summary: rentSummary });
        }

        const tenants = await TenantService.getActiveTenants(db, ownerId, limit, status);
        return NextResponse.json({ success: true, tenants });
    } catch (error: any) {
        return serverError(error, 'GET /api/tenants');
    }
}

// POST /api/tenants — onboard a new tenant
export async function POST(req: NextRequest) {
    const result = await enforcePermission(req, 'guests', 'add', 'POST /api/tenants');
    if (!result.authorized) return result.response;
    const { ownerId } = result;

    try {
        const body = await req.json();
        const { guestData } = body;

        if (!guestData) {
            return badRequest('guestData is required');
        }

        const db = await selectOwnerDataAdminDb(ownerId);
        const appDb = await getAdminDb();

        const { guest: newGuest, magicLink } = await TenantService.onboardTenant(db, appDb, {
            ...guestData,
            ownerId,
            planId: result.plan?.id
        });

        return NextResponse.json({ success: true, guest: newGuest, magicLink }, { status: 201 });
    } catch (error: any) {
        return serverError(error, 'POST /api/tenants');
    }
}

// PATCH /api/tenants — update or perform actions on a tenant
export async function PATCH(req: NextRequest) {
    const authResult = await enforcePermission(req, 'guests', 'view', 'PATCH /api/tenants'); // Base check
    if (!authResult.authorized) return authResult.response;
    const { ownerId, userId, role, permissions } = authResult;

    try {
        const body = await req.json();
        const { guestId, operation } = body;

        if (!guestId) {
            return badRequest('guestId is required');
        }

        const db = await selectOwnerDataAdminDb(ownerId);

        if (operation === 'vacate') {
            const permResult = await enforcePermissionForStaff(userId, ownerId, role, permissions, 'guests', 'delete', 'PATCH /api/tenants (vacate)');
            if (!permResult.authorized) return permResult.response;
            
            await TenantService.vacateTenant(db, ownerId, guestId);
            return NextResponse.json({ success: true, message: 'Tenant vacated' });
        }

        if (operation === 'update') {
            const permResult = await enforcePermissionForStaff(userId, ownerId, role, permissions, 'guests', 'edit', 'PATCH /api/tenants (update)');
            if (!permResult.authorized) return permResult.response;

            const { updates } = body;
            if (!updates) return badRequest('updates are required for update operation');
            await TenantService.updateTenant(db, ownerId, guestId, updates);
            return NextResponse.json({ success: true, message: 'Tenant updated' });
        }

        return badRequest('Invalid operation');
    } catch (error: any) {
        return serverError(error, 'PATCH /api/tenants');
    }
}
