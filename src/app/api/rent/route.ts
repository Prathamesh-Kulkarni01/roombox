/**
 * /api/rent - Shared API for rent tracking and payment operations
 * Used by both the Web App UI (via fetch) and the WhatsApp Bot
 * Supports BYODB via selectOwnerDataAdminDb
 */
import { NextRequest, NextResponse } from 'next/server';
import { selectOwnerDataAdminDb } from '@/lib/firebaseAdmin';
import { TenantService } from '@/services/tenantService';
import { getVerifiedOwnerId } from '@/lib/auth-server';
import { badRequest, notFound, serverError, unauthorized } from '@/lib/api/apiError';

// GET /api/rent?[guestId=yyy] — get monthly rent summary or history for a specific tenant
export async function GET(req: NextRequest) {
    const { ownerId, error } = await getVerifiedOwnerId(req);
    if (!ownerId) return unauthorized(error);

    try {
        const guestId = req.nextUrl.searchParams.get('guestId');

        const db = await selectOwnerDataAdminDb(ownerId);

        if (guestId) {
            // Return rent details and ledger for a specific guest
            const guestDoc = await db.collection('users_data').doc(ownerId).collection('guests').doc(guestId).get();
            if (!guestDoc.exists) {
                return notFound('Tenant not found');
            }
            const guest = { id: guestDoc.id, ...guestDoc.data() };

            // Fetch ledger entries
            const ledgerSnap = await db.collection('users_data').doc(ownerId).collection('ledger')
                .where('guestId', '==', guestId)
                .orderBy('date', 'desc')
                .limit(12)
                .get();

            const ledger = ledgerSnap.docs.map(d => ({ id: d.id, ...d.data() }));

            return NextResponse.json({ success: true, guest, ledger });
        }

        // Return overall monthly rent summary
        const summary = await TenantService.getMonthlyRentSummary(db, ownerId);

        // Also return pending tenants
        const pendingTenants = await TenantService.getActiveTenants(db, ownerId, 20, 'pending');

        return NextResponse.json({ success: true, summary, pendingTenants });
    } catch (error: any) {
        return serverError(error, 'GET /api/rent');
    }
}

// POST /api/rent/record-payment — record a payment for a tenant
export async function POST(req: NextRequest) {
    const { ownerId, error } = await getVerifiedOwnerId(req);
    if (!ownerId) return unauthorized(error);

    try {
        const body = await req.json();
        const { guestId, amount, paymentMode, notes } = body;

        if (!guestId || !amount) {
            return badRequest('guestId and amount are required');
        }

        const db = await selectOwnerDataAdminDb(ownerId);
        const { ledgerEntry, newBalance, newStatus } = await TenantService.recordPayment(db, {
            ownerId, guestId, amount, paymentMode, notes
        });

        return NextResponse.json({ success: true, ledgerEntry, newBalance, newStatus });
    } catch (error: any) {
        return serverError(error, 'POST /api/rent');
    }
}
