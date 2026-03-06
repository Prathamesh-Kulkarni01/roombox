/**
 * /api/rent - Shared API for rent tracking and payment operations
 * Used by both the Web App UI (via fetch) and the WhatsApp Bot
 * Supports BYODB via selectOwnerDataAdminDb
 */
import { NextRequest, NextResponse } from 'next/server';
import { selectOwnerDataAdminDb } from '@/lib/firebaseAdmin';
import { TenantService } from '@/services/tenantService';

function badRequest(msg: string) {
    return NextResponse.json({ error: msg }, { status: 400 });
}

// GET /api/rent?ownerId=xxx — get monthly rent summary
// GET /api/rent?ownerId=xxx&guestId=yyy — get rent history for a specific tenant
export async function GET(req: NextRequest) {
    const ownerId = req.nextUrl.searchParams.get('ownerId');
    const guestId = req.nextUrl.searchParams.get('guestId');

    if (!ownerId) return badRequest('ownerId is required');

    try {
        const db = await selectOwnerDataAdminDb(ownerId);

        if (guestId) {
            // Return rent details and ledger for a specific guest
            const guestDoc = await db.collection('users_data').doc(ownerId).collection('guests').doc(guestId).get();
            if (!guestDoc.exists) {
                return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
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
        console.error('GET /api/rent error:', error);
        return NextResponse.json({ error: error.message || 'Failed to fetch rent data' }, { status: 500 });
    }
}

// POST /api/rent/record-payment — record a payment for a tenant
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { ownerId, guestId, amount, paymentMode, notes } = body;

        if (!ownerId || !guestId || !amount) {
            return badRequest('ownerId, guestId, and amount are required');
        }

        const db = await selectOwnerDataAdminDb(ownerId);

        const guestRef = db.collection('users_data').doc(ownerId).collection('guests').doc(guestId);
        const guestDoc = await guestRef.get();

        if (!guestDoc.exists) {
            return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
        }

        const guestData = guestDoc.data()!;
        const paymentAmount = Number(amount);
        const newPaidAmount = (guestData.paidAmount || 0) + paymentAmount;
        const newBalance = Math.max(0, (guestData.balance || guestData.rentAmount || 0) - paymentAmount);

        const paymentId = `pay-${Date.now()}`;
        const ledgerEntry = {
            id: paymentId,
            guestId,
            ownerId,
            pgId: guestData.pgId,
            type: 'payment',
            amount: paymentAmount,
            paymentMode: paymentMode || 'cash',
            notes: notes || '',
            date: new Date().toISOString(),
            createdAt: Date.now(),
        };

        const batch = db.batch();

        // Update guest payment status
        const newStatus = newBalance <= 0 ? 'paid' : 'partial';
        batch.update(guestRef, {
            paidAmount: newPaidAmount,
            balance: newBalance,
            paymentStatus: newStatus,
            rentStatus: newStatus,
            lastPaymentDate: new Date().toISOString(),
        });

        // Add ledger entry
        const ledgerRef = db.collection('users_data').doc(ownerId).collection('ledger').doc(paymentId);
        batch.set(ledgerRef, ledgerEntry);

        await batch.commit();

        return NextResponse.json({ success: true, ledgerEntry, newBalance, newStatus });
    } catch (error: any) {
        console.error('POST /api/rent error:', error);
        return NextResponse.json({ error: error.message || 'Failed to record payment' }, { status: 500 });
    }
}
