/**
 * /api/rent - Shared API for rent tracking and payment operations
 * Used by both the Web App UI (via fetch) and the WhatsApp Bot
 * Supports BYODB via selectOwnerDataAdminDb
 */
import { NextRequest, NextResponse } from 'next/server';
import { selectOwnerDataAdminDb } from '@/lib/firebaseAdmin';
import { TenantService } from '@/services/tenantService';
import { getVerifiedOwnerId } from '@/lib/auth-server';
import { badRequest, forbidden, notFound, serverError, unauthorized } from '@/lib/api/apiError';
import { enforcePermission } from '@/lib/rbac-middleware';

// GET /api/rent?[guestId=yyy] — get monthly rent summary or history for a specific tenant
export async function GET(req: NextRequest) {
    const result = await enforcePermission(req, 'finances', 'view', 'GET /api/rent');
    if (!result.authorized) return result.response;
    const { ownerId } = result;

    try {
        const guestId = req.nextUrl.searchParams.get('guestId');

        const db = await selectOwnerDataAdminDb(ownerId);

        if (guestId) {
            // Return rent details and ledger for a specific guest
            const guestDoc = await db.collection('users_data').doc(ownerId).collection('guests').doc(guestId).get();
            if (!guestDoc.exists) {
                return notFound('Tenant not found');
            }
            const guestData = guestDoc.data();
            
            // SECURITY: Verify the staff member has access to the PG this guest belongs to
            if (result.pgIds && result.pgIds.length > 0 && guestData?.pgId) {
                if (!result.pgIds.includes(guestData.pgId)) {
                    return forbidden('Access denied: You do not have permission to view data for this property');
                }
            }

            const guest = { id: guestDoc.id, ...guestData };
            
            // Fetch ledger entries
            const ledgerSnap = await db.collection('users_data').doc(ownerId).collection('ledger')
                .where('guestId', '==', guestId)
                .orderBy('date', 'desc')
                .limit(12)
                .get();

            const ledger = ledgerSnap.docs.map(d => ({ id: d.id, ...d.data() }));

            return NextResponse.json({ success: true, guest, ledger });
        }

        // Return overall monthly rent summary (filtered by PG scope)
        const summary = await TenantService.getMonthlyRentSummary(db, ownerId, result.pgIds);

        // Also return pending tenants (filtered by PG scope)
        const pendingTenants = await TenantService.getActiveTenants(db, ownerId, 20, 'pending', result.pgIds);

        return NextResponse.json({ success: true, summary, pendingTenants });
    } catch (error: any) {
        return serverError(error, 'GET /api/rent');
    }
}

// POST /api/rent/record-payment — record a payment for a tenant
export async function POST(req: NextRequest) {
    const result = await enforcePermission(req, 'finances', 'add', 'POST /api/rent', true);
    if (!result.authorized) return result.response;
    const { ownerId } = result;

    try {
        const body = await req.json();
        const { guestId, amount, paymentMode, notes } = body;

        if (!guestId || !amount) {
            return badRequest('guestId and amount are required');
        }

        const db = await selectOwnerDataAdminDb(ownerId);
        const { ledgerEntry, newBalance, newStatus } = await TenantService.recordPayment(db, {
            ownerId, guestId, amount, paymentMode, notes,
            performer: { userId: result.userId, name: result.name || 'System', role: result.role }
        });

        return NextResponse.json({ success: true, ledgerEntry, newBalance, newStatus });
    } catch (error: any) {
        return serverError(error, 'POST /api/rent');
    }
}
