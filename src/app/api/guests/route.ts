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
import { TenantService } from '@/services/tenantService';
import { selectOwnerDataAdminDb, getAdminDb } from '@/lib/firebaseAdmin';
import { badRequest, notFound, serverError, unauthorized } from '@/lib/api/apiError';
import { getVerifiedOwnerId } from '@/lib/auth-server';

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const AddGuestSchema = z.object({
    ownerId: z.string().optional(),
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
    rentCycleUnit: z.enum(['minutes', 'hours', 'days', 'weeks', 'months']).optional(),
    rentCycleValue: z.coerce.number().positive().optional(),
});

const PatchSchema = z.discriminatedUnion('action', [
    // General field update
    z.object({
        action: z.literal('update'),
        ownerId: z.string().optional(),
        guestId: z.string(),
        updates: z.record(z.unknown()).refine(
            (u) => !('dueDate' in u && (u.dueDate === null || u.dueDate === undefined)) &&
                !('moveInDate' in u && (u.moveInDate === null || u.moveInDate === undefined)),
            { message: 'dueDate and moveInDate cannot be null or undefined' }
        )
    }),
    // Initiate exit
    z.object({ action: z.literal('initiate-exit'), ownerId: z.string().optional(), guestId: z.string(), noticePeriodDays: z.number().optional() }),
    // Vacate
    z.object({ action: z.literal('vacate'), ownerId: z.string().optional(), guestId: z.string(), sendWhatsApp: z.boolean().optional() }),
    // KYC status update
    z.object({ action: z.literal('kyc-status'), ownerId: z.string().optional(), guestId: z.string(), status: z.enum(['verified', 'rejected']), reason: z.string().optional() }),
    // KYC documents submit
    z.object({ action: z.literal('kyc-submit'), ownerId: z.string().optional(), guestId: z.string(), documents: z.array(z.record(z.unknown())) }),
    // Reset KYC
    z.object({ action: z.literal('kyc-reset'), ownerId: z.string().optional(), guestId: z.string() }),
    // Add charge
    z.object({ action: z.literal('add-charge'), ownerId: z.string().optional(), guestId: z.string(), description: z.string(), amount: z.coerce.number().positive() }),
    // Remove charge
    z.object({ action: z.literal('remove-charge'), ownerId: z.string().optional(), guestId: z.string(), chargeId: z.string() }),
    // Shared room charge
    z.object({ action: z.literal('shared-charge'), ownerId: z.string().optional(), roomId: z.string(), description: z.string(), amount: z.coerce.number().positive() }),
    // Record payment + reconcile
    z.object({ 
        action: z.literal('record-payment'), 
        ownerId: z.string().optional(), 
        guest: z.record(z.unknown()), 
        amount: z.coerce.number().nonnegative(), 
        amountType: z.enum(['numeric', 'symbolic']).optional(),
        symbolicValue: z.string().optional(),
        method: z.enum(['cash', 'upi', 'in-app']) 
    }),
    // Transfer guest to new bed
    z.object({
        action: z.literal('transfer'),
        ownerId: z.string().optional(),
        guestId: z.string(),
        newPgId: z.string(),
        newBedId: z.string(),
        newRoomId: z.string(),
        newRoomName: z.string(),
        newRentAmount: z.coerce.number().optional(),
        newDepositAmount: z.coerce.number().optional(),
        shouldProrate: z.boolean().optional(),
        prorationAmount: z.coerce.number().optional(),
    }),
]);

// ─── Handlers ─────────────────────────────────────────────────────────────────

// GET /api/guests?[pgId=xxx][&vacated=false][&limit=200]
export async function GET(req: NextRequest) {
    const { ownerId, error } = await getVerifiedOwnerId(req);
    if (!ownerId) return unauthorized(error);

    try {
        const pgId = req.nextUrl.searchParams.get('pgId') || undefined;
        const vacated = req.nextUrl.searchParams.get('vacated');
        const limit = parseInt(req.nextUrl.searchParams.get('limit') || '200', 10);

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
    const ownerResult = await getVerifiedOwnerId(req);
    const { ownerId, error } = ownerResult;
    if (!ownerId) return unauthorized(error);

    try {
        const body = await req.json();
        const parsed = AddGuestSchema.safeParse(body);
        if (!parsed.success) {
            return badRequest(parsed.error.issues.map(i => i.message).join('; '));
        }

        const { ownerId: _unused, ...guestInput } = parsed.data;
        const db = await selectOwnerDataAdminDb(ownerId);
        const appDb = await getAdminDb(); // for user/invite linking

        const { guest: newGuest, magicLink } = await TenantService.onboardTenant(db, appDb, { ...guestInput, ownerId, planId: ownerResult.plan?.id });

        return NextResponse.json({ success: true, guest: newGuest, magicLink }, { status: 201 });
    } catch (error) {
        return serverError(error, 'POST /api/guests');
    }
}

// PATCH /api/guests — action-based mutations
export async function PATCH(req: NextRequest) {
    const { ownerId, error } = await getVerifiedOwnerId(req);
    if (!ownerId) return unauthorized(error);

    try {
        const body = await req.json();
        const parsed = PatchSchema.safeParse(body);
        if (!parsed.success) {
            return badRequest(parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; '));
        }

        const data = parsed.data;
        const db = await selectOwnerDataAdminDb(ownerId);

        switch (data.action) {
            case 'update': {
                await TenantService.updateTenant(db, ownerId, data.guestId, data.updates as any);
                const ref = db.collection('users_data').doc(ownerId).collection('guests').doc(data.guestId);
                const updated = await ref.get();
                return NextResponse.json({ success: true, guest: { id: updated.id, ...updated.data() } });
            }

            case 'initiate-exit': {
                const result = await TenantService.initiateTenantExit(db, ownerId, data.guestId, data.noticePeriodDays);
                return NextResponse.json({ success: true, ...result });
            }

            case 'vacate': {
                const appDb = await getAdminDb();
                const result = await TenantService.vacateTenant(db, ownerId, data.guestId, appDb || undefined, data.sendWhatsApp);
                return NextResponse.json({ success: true, ...result });
            }

            case 'kyc-status': {
                await TenantService.updateKycStatus(db, ownerId, data.guestId, data.status, data.reason);
                return NextResponse.json({ success: true, guestId: data.guestId, kycStatus: data.status });
            }

            case 'kyc-submit': {
                await TenantService.submitKycDocuments(db, ownerId, data.guestId, data.documents as any);
                return NextResponse.json({ success: true, guestId: data.guestId, kycStatus: 'pending' });
            }

            case 'kyc-reset': {
                await TenantService.resetKyc(db, ownerId, data.guestId);
                return NextResponse.json({ success: true, guestId: data.guestId, kycStatus: 'not-started' });
            }

            case 'add-charge': {
                const charge = await TenantService.addCharge(db, ownerId, data.guestId, {
                    description: data.description,
                    amount: data.amount,
                });
                return NextResponse.json({ success: true, charge });
            }

            case 'remove-charge': {
                await TenantService.removeCharge(db, ownerId, data.guestId, data.chargeId);
                return NextResponse.json({ success: true, guestId: data.guestId, chargeId: data.chargeId });
            }

            case 'shared-charge': {
                const result = await TenantService.addSharedRoomCharge(db, ownerId, data.roomId, {
                    description: data.description,
                    amount: data.amount,
                });
                return NextResponse.json({ success: true, ...result });
            }

            case 'record-payment': {
                const { guest } = await TenantService.recordPayment(db, {
                    ownerId,
                    guest: data.guest as any,
                    amount: data.amount,
                    amountType: data.amountType,
                    symbolicValue: data.symbolicValue,
                    paymentMode: data.method,
                });
                return NextResponse.json({ success: true, guest });
            }

            case 'transfer': {
                await TenantService.transferGuest(db, ownerId, data.guestId, {
                    newPgId: data.newPgId,
                    newBedId: data.newBedId,
                    newRoomId: data.newRoomId,
                    newRoomName: data.newRoomName,
                    newRentAmount: data.newRentAmount,
                    newDepositAmount: data.newDepositAmount,
                    shouldProrate: data.shouldProrate,
                    prorationAmount: data.prorationAmount
                });
                const updated = await db.collection('users_data').doc(ownerId).collection('guests').doc(data.guestId).get();
                return NextResponse.json({ success: true, guest: { id: updated.id, ...updated.data() } });
            }

            default:
                return badRequest('Unknown action');
        }
    } catch (error) {
        return serverError(error, 'PATCH /api/guests');
    }
}

// DELETE /api/guests — permanent delete
export async function DELETE(req: NextRequest) {
    const { ownerId, error } = await getVerifiedOwnerId(req);
    if (!ownerId) return unauthorized(error);

    try {
        const body = await req.json();
        const { guestId } = body;
        if (!guestId) return badRequest('guestId is required');

        const db = await selectOwnerDataAdminDb(ownerId);
        await db.collection('users_data').doc(ownerId).collection('guests').doc(guestId).delete();

        return NextResponse.json({ success: true, guestId });
    } catch (error) {
        return serverError(error, 'DELETE /api/guests');
    }
}
