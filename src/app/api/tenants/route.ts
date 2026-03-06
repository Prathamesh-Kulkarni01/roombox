/**
 * /api/tenants - Shared API for tenant management
 * Used by both the Web App UI (via fetch) and the WhatsApp Bot
 * Supports BYODB via selectOwnerDataAdminDb
 */
import { NextRequest, NextResponse } from 'next/server';
import { selectOwnerDataAdminDb, getAdminDb } from '@/lib/firebaseAdmin';
import { TenantService } from '@/services/tenantService';

function badRequest(msg: string) {
    return NextResponse.json({ error: msg }, { status: 400 });
}

// GET /api/tenants?ownerId=xxx[&status=pending][&limit=10]
export async function GET(req: NextRequest) {
    const ownerId = req.nextUrl.searchParams.get('ownerId');
    const status = req.nextUrl.searchParams.get('status') || undefined;
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '20', 10);
    const summary = req.nextUrl.searchParams.get('summary') === 'true';

    if (!ownerId) return badRequest('ownerId is required');

    try {
        const db = await selectOwnerDataAdminDb(ownerId);

        if (summary) {
            const rentSummary = await TenantService.getMonthlyRentSummary(db, ownerId);
            return NextResponse.json({ success: true, summary: rentSummary });
        }

        const tenants = await TenantService.getActiveTenants(db, ownerId, limit, status);
        return NextResponse.json({ success: true, tenants });
    } catch (error: any) {
        console.error('GET /api/tenants error:', error);
        return NextResponse.json({ error: error.message || 'Failed to fetch tenants' }, { status: 500 });
    }
}

// POST /api/tenants — onboard a new tenant
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { ownerId, guestData } = body;

        if (!ownerId || !guestData) {
            return badRequest('ownerId and guestData are required');
        }

        const { name, email, phone, pgId, pgName, bedId, roomId, roomName, rentAmount, deposit, dueDate, joinDate, rentCycleUnit, rentCycleValue } = guestData;

        if (!name || !pgId || !rentAmount) {
            return badRequest('name, pgId, and rentAmount are required in guestData');
        }

        const db = await selectOwnerDataAdminDb(ownerId);
        const appDb = await getAdminDb();

        // Verify the PG exists
        const pgDoc = await db.collection('users_data').doc(ownerId).collection('pgs').doc(pgId).get();
        if (!pgDoc.exists) {
            return NextResponse.json({ error: 'Property not found' }, { status: 404 });
        }
        const pgData = pgDoc.data()!;

        const guestId = `g-${Date.now()}`;
        const newGuest = {
            id: guestId,
            ownerId,
            name,
            email: email || '',
            phone: phone || '',
            pgId,
            pgName: pgName || pgData.name,
            bedId: bedId || '',
            roomId: roomId || '',
            roomName: roomName || '',
            rentAmount: Number(rentAmount),
            deposit: Number(deposit || 0),
            balance: 0,
            paidAmount: 0,
            dueDate: dueDate || new Date().toISOString(),
            joinDate: joinDate || new Date().toISOString(),
            rentStatus: 'pending',
            paymentStatus: 'pending',
            isVacated: false,
            kycStatus: 'not_submitted',
            documents: [],
            rentCycleUnit: rentCycleUnit || 'months',
            rentCycleValue: rentCycleValue || 1,
            createdAt: Date.now(),
        };

        const batch = db.batch();

        // Save guest
        const guestRef = db.collection('users_data').doc(ownerId).collection('guests').doc(guestId);
        batch.set(guestRef, newGuest);

        // Update PG occupancy
        const pgRef = db.collection('users_data').doc(ownerId).collection('pgs').doc(pgId);
        batch.update(pgRef, { occupancy: (pgData.occupancy || 0) + 1 });

        await batch.commit();

        // Check if user with this email exists in the main db and create invite
        if (email && appDb) {
            try {
                const userSnap = await appDb.collection('users').where('email', '==', email).limit(1).get();
                if (!userSnap.empty) {
                    // Link existing user to this guest
                    await appDb.doc(`users/${userSnap.docs[0].id}`).update({
                        guestId,
                        pgId,
                        ownerId,
                    });
                } else {
                    // Create invite for new user
                    await appDb.doc(`invites/${email}`).set({
                        email,
                        ownerId,
                        role: 'tenant',
                        details: newGuest,
                        createdAt: Date.now(),
                    });
                }
            } catch (userLinkErr) {
                console.warn('Could not link user or create invite:', userLinkErr);
            }
        }

        return NextResponse.json({ success: true, guest: newGuest }, { status: 201 });
    } catch (error: any) {
        console.error('POST /api/tenants error:', error);
        return NextResponse.json({ error: error.message || 'Failed to onboard tenant' }, { status: 500 });
    }
}
