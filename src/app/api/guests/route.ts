/**
 * /api/guests — Full guest CRUD + lifecycle management
 *
 * Backed by GuestService (Firebase Admin SDK).
 * Shared between: Web UI (via RTK Query), WhatsApp bot.
 *
 * POST   /api/guests          — add a new guest
 * GET    /api/guests          — list guests
 * PATCH  /api/guests          — action-based mutations (vacate, charge, kyc, etc.)
 * DELETE /api/guests          — remove a guest record (permanent, use vacate instead)
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { GuestService } from '@/services/guestService';
import { selectOwnerDataAdminDb, getAdminDb } from '@/lib/firebaseAdmin';
import { badRequest, notFound, serverError } from '@/lib/api/apiError';

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const AddGuestSchema = z.object({
    ownerId: z.string().min(1, 'ownerId is required'),
    name: z.string().min(1, 'name is required'),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().optional(),
    pgId: z.string().min(1, 'pgId is required'),
    pgName: z.string().optional(),
    bedId: z.string().optional(),
    roomId: z.string().optional(),
    roomName: z.string().optional(),
    rentAmount: z.coerce.number().positive('rentAmount must be positive'),
    deposit: z.coerce.number().nonnegative().optional(),
    joinDate: z.string().datetime({ offset: true }).optional().or(z.string().optional()),
    dueDate: z.string().optional(),
    rentCycleUnit: z.enum(['days', 'weeks', 'months']).optional(),
    rentCycleValue: z.coerce.number().positive().optional(),
});

const PatchSchema = z.discriminatedUnion('action', [
    // General field update
    z.object({ action: z.literal('update'), ownerId: z.string(), guestId: z.string(), updates: z.record(z.unknown()) }),
    // Initiate exit
    z.object({ action: z.literal('initiate-exit'), ownerId: z.string(), guestId: z.string(), noticePeriodDays: z.number().optional() }),
    // Vacate
    z.object({ action: z.literal('vacate'), ownerId: z.string(), guestId: z.string() }),
    // KYC status update
    z.object({ action: z.literal('kyc-status'), ownerId: z.string(), guestId: z.string(), status: z.enum(['verified', 'rejected']), reason: z.string().optional() }),
    // KYC documents submit
    z.object({ action: z.literal('kyc-submit'), ownerId: z.string(), guestId: z.string(), documents: z.array(z.record(z.unknown())) }),
    // Reset KYC
    z.object({ action: z.literal('kyc-reset'), ownerId: z.string(), guestId: z.string() }),
    // Add charge
    z.object({ action: z.literal('add-charge'), ownerId: z.string(), guestId: z.string(), description: z.string(), amount: z.coerce.number().positive() }),
    // Remove charge
    z.object({ action: z.literal('remove-charge'), ownerId: z.string(), guestId: z.string(), chargeId: z.string() }),
    // Shared room charge
    z.object({ action: z.literal('shared-charge'), ownerId: z.string(), roomId: z.string(), description: z.string(), amount: z.coerce.number().positive() }),
    // Record payment + reconcile
    z.object({ action: z.literal('record-payment'), ownerId: z.string(), guest: z.record(z.unknown()), amount: z.coerce.number().positive(), method: z.enum(['cash', 'upi', 'in-app']) }),
]);

// ─── Handlers ─────────────────────────────────────────────────────────────────

// GET /api/guests?ownerId=xxx[&pgId=xxx][&vacated=false][&limit=200]
export async function GET(req: NextRequest) {
    try {
        const ownerId = req.nextUrl.searchParams.get('ownerId');
        const pgId = req.nextUrl.searchParams.get('pgId') || undefined;
        const vacated = req.nextUrl.searchParams.get('vacated');
        const limit = parseInt(req.nextUrl.searchParams.get('limit') || '200', 10);

        if (!ownerId) return badRequest('ownerId is required');

        const db = await selectOwnerDataAdminDb(ownerId);
        let query = db.collection('users_data').doc(ownerId).collection('guests')
            .limit(limit) as FirebaseFirestore.Query;

        if (pgId) query = query.where('pgId', '==', pgId);
        if (vacated !== 'true') query = query.where('isVacated', '==', false);

        const snapshot = await query.get();
        const guests = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

        return NextResponse.json({ success: true, guests });
    } catch (error) {
        return serverError(error, 'GET /api/guests');
    }
}

// POST /api/guests — add a new guest
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const parsed = AddGuestSchema.safeParse(body);
        if (!parsed.success) {
            return badRequest(parsed.error.issues.map(i => i.message).join('; '));
        }

        const { ownerId, ...guestInput } = parsed.data;
        const db = await selectOwnerDataAdminDb(ownerId);
        const appDb = await getAdminDb(); // for user/invite linking

        const newGuest = await GuestService.addGuest(db, ownerId, { ...guestInput, ownerId }, appDb || undefined);

        return NextResponse.json({ success: true, guest: newGuest }, { status: 201 });
    } catch (error) {
        return serverError(error, 'POST /api/guests');
    }
}

// PATCH /api/guests — action-based mutations
export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const parsed = PatchSchema.safeParse(body);
        if (!parsed.success) {
            return badRequest(parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; '));
        }

        const data = parsed.data;
        const db = await selectOwnerDataAdminDb(data.ownerId);

        switch (data.action) {
            case 'update': {
                const ref = db.collection('users_data').doc(data.ownerId).collection('guests').doc(data.guestId);
                await ref.set(data.updates, { merge: true });
                const updated = await ref.get();
                return NextResponse.json({ success: true, guest: { id: updated.id, ...updated.data() } });
            }

            case 'initiate-exit': {
                const result = await GuestService.initiateGuestExit(db, data.ownerId, data.guestId, data.noticePeriodDays);
                return NextResponse.json({ success: true, ...result });
            }

            case 'vacate': {
                const appDb = await getAdminDb();
                const result = await GuestService.vacateGuest(db, data.ownerId, data.guestId, appDb || undefined);
                return NextResponse.json({ success: true, ...result });
            }

            case 'kyc-status': {
                await GuestService.updateKycStatus(db, data.ownerId, data.guestId, data.status, data.reason);
                return NextResponse.json({ success: true, guestId: data.guestId, kycStatus: data.status });
            }

            case 'kyc-submit': {
                await GuestService.submitKycDocuments(db, data.ownerId, data.guestId, data.documents as any);
                return NextResponse.json({ success: true, guestId: data.guestId, kycStatus: 'pending' });
            }

            case 'kyc-reset': {
                await GuestService.resetKyc(db, data.ownerId, data.guestId);
                return NextResponse.json({ success: true, guestId: data.guestId, kycStatus: 'not-started' });
            }

            case 'add-charge': {
                const charge = await GuestService.addCharge(db, data.ownerId, data.guestId, {
                    description: data.description,
                    amount: data.amount,
                });
                return NextResponse.json({ success: true, charge });
            }

            case 'remove-charge': {
                await GuestService.removeCharge(db, data.ownerId, data.guestId, data.chargeId);
                return NextResponse.json({ success: true, guestId: data.guestId, chargeId: data.chargeId });
            }

            case 'shared-charge': {
                const result = await GuestService.addSharedRoomCharge(db, data.ownerId, data.roomId, {
                    description: data.description,
                    amount: data.amount,
                });
                return NextResponse.json({ success: true, ...result });
            }

            case 'record-payment': {
                const reconciledGuest = await GuestService.recordPayment(db, data.ownerId, {
                    guest: data.guest as any,
                    amount: data.amount,
                    method: data.method,
                });
                return NextResponse.json({ success: true, guest: reconciledGuest });
            }

            default:
                return badRequest('Unknown action');
        }
    } catch (error) {
        return serverError(error, 'PATCH /api/guests');
    }
}

// DELETE /api/guests — permanent delete (not vacate — use PATCH action=vacate instead)
export async function DELETE(req: NextRequest) {
    try {
        const body = await req.json();
        const { ownerId, guestId } = body;
        if (!ownerId || !guestId) return badRequest('ownerId and guestId are required');

        const db = await selectOwnerDataAdminDb(ownerId);
        await db.collection('users_data').doc(ownerId).collection('guests').doc(guestId).delete();

        return NextResponse.json({ success: true, guestId });
    } catch (error) {
        return serverError(error, 'DELETE /api/guests');
    }
}
