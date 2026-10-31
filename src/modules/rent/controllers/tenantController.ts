import { NextRequest, NextResponse } from 'next/server';
import { resolveTenant } from '@/platform/auth/server/tenant-resolver';
import { selectOwnerDataAdminDb } from '@/lib/firebaseAdmin';
import { TenantService } from '@/services/tenantService';
import { enforcePermission, enforcePermissionForStaff } from '@/lib/rbac-middleware';
import { badRequest, serverError } from '@/lib/api/apiError';

export class RentTenantController {
  static async listTenants(req: NextRequest) {
    const result = await enforcePermission(req, 'guests', 'view', 'GET /api/tenants');
    if (!result.authorized) return result.response;
    const { ownerId } = result;

    try {
      const status = req.nextUrl.searchParams.get('status') || undefined;
      const limit = parseInt(req.nextUrl.searchParams.get('limit') || '20', 10);
      const summary = req.nextUrl.searchParams.get('summary') === 'true';

      const db = await selectOwnerDataAdminDb(ownerId);

      if (summary) {
        const rentSummary = await TenantService.getMonthlyRentSummary(db, ownerId, result.pgIds);
        return NextResponse.json({ success: true, summary: rentSummary });
      }

      const tenants = await TenantService.getActiveTenants(db, ownerId, limit, status, result.pgIds);
      return NextResponse.json({ success: true, tenants });
    } catch (error: any) {
      return serverError(error, 'GET /api/tenants');
    }
  }

  static async createTenant(req: NextRequest) {
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
      const { db: appDb } = await resolveTenant(req);

      const { guest: newGuest, magicLink } = await TenantService.onboardTenant(db, appDb, {
        ...guestData,
        ownerId,
        planId: result.plan?.id,
      });

      return NextResponse.json({ success: true, guest: newGuest, magicLink }, { status: 201 });
    } catch (error: any) {
      return serverError(error, 'POST /api/tenants');
    }
  }

  static async updateTenant(req: NextRequest) {
    const authResult = await enforcePermission(req, 'guests', 'view', 'PATCH /api/tenants');
    if (!authResult.authorized) return authResult.response;
    const { ownerId, userId, name, role, permissions } = authResult;

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

        await TenantService.vacateTenant(db, ownerId, guestId, { userId, name: name || 'Staff' });
        return NextResponse.json({ success: true, message: 'Tenant vacated' });
      }

      if (operation === 'update') {
        const permResult = await enforcePermissionForStaff(userId, ownerId, role, permissions, 'guests', 'edit', 'PATCH /api/tenants (update)');
        if (!permResult.authorized) return permResult.response;

        const { updates } = body;
        if (!updates) return badRequest('updates are required for update operation');
        await TenantService.updateTenant(db, ownerId, guestId, updates, { userId, name: name || 'Staff' });
        return NextResponse.json({ success: true, message: 'Tenant updated' });
      }

      return badRequest('Invalid operation');
    } catch (error: any) {
      return serverError(error, 'PATCH /api/tenants');
    }
  }
}
