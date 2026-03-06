/**
 * guestService.ts — Server-side guest business logic
 *
 * All operations use Firebase Admin SDK (Firestore).
 * Called from API routes only — never imported on the client.
 * This is the single source of truth for guest mutations,
 * shared between the Web UI (via API routes) and the WhatsApp bot.
 */
import { Firestore, FieldValue } from 'firebase-admin/firestore';
import { runReconciliationLogic } from '@/lib/reconciliation';
import type { Guest, PG, LedgerEntry, SubmittedKycDocument } from '@/lib/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AddGuestInput {
    name: string;
    email?: string;
    phone?: string;
    pgId: string;
    pgName?: string;
    bedId?: string;
    roomId?: string;
    roomName?: string;
    rentAmount: number;
    deposit?: number;
    joinDate?: string;
    dueDate?: string;
    rentCycleUnit?: 'days' | 'weeks' | 'months';
    rentCycleValue?: number;
    ownerId: string;
}

export interface ReconcilePaymentInput {
    guest: Guest;
    amount: number;
    method: 'cash' | 'upi' | 'in-app';
}

export interface ChargeInput {
    description: string;
    amount: number;
}

export interface GuestServiceResult<T = void> {
    success: boolean;
    data?: T;
    error?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function guestRef(db: Firestore, ownerId: string, guestId: string) {
    return db.collection('users_data').doc(ownerId).collection('guests').doc(guestId);
}

function pgRef(db: Firestore, ownerId: string, pgId: string) {
    return db.collection('users_data').doc(ownerId).collection('pgs').doc(pgId);
}

// ─── Service Methods ──────────────────────────────────────────────────────────

export class GuestService {

    /**
     * Add a new guest and update PG occupancy atomically.
     * Creates an invite in the app DB if email is provided and no user exists yet.
     */
    static async addGuest(
        db: Firestore,
        ownerId: string,
        input: AddGuestInput,
        appDb?: Firestore // app-level DB for user/invite records
    ): Promise<Guest> {
        // Verify PG exists
        const pgSnap = await pgRef(db, ownerId, input.pgId).get();
        if (!pgSnap.exists) {
            throw new Error(`Property not found: ${input.pgId}`);
        }
        const pgData = pgSnap.data()!;

        const guestId = `g-${Date.now()}`;
        const now = new Date().toISOString();

        const newGuest: Guest = {
            id: guestId,
            ownerId,
            name: input.name,
            email: input.email || '',
            phone: input.phone || '',
            pgId: input.pgId,
            pgName: input.pgName || pgData.name,
            bedId: input.bedId || '',
            roomId: input.roomId || '',
            roomName: input.roomName || '',
            rentAmount: Number(input.rentAmount),
            deposit: Number(input.deposit || 0),
            balance: 0,
            paidAmount: 0,
            rentStatus: 'pending',
            paymentStatus: 'pending',
            isVacated: false,
            kycStatus: 'not_submitted',
            documents: [],
            ledger: [],
            paymentHistory: [],
            joinDate: input.joinDate || now,
            moveInDate: input.joinDate || now,
            dueDate: input.dueDate || now,
            rentCycleUnit: input.rentCycleUnit || 'months',
            rentCycleValue: input.rentCycleValue || 1,
            createdAt: Date.now(),
            noticePeriodDays: 30,
        } as unknown as Guest;

        const batch = db.batch();

        // Write guest
        batch.set(guestRef(db, ownerId, guestId), newGuest);

        // Update PG occupancy
        batch.update(pgRef(db, ownerId, input.pgId), {
            occupancy: (pgData.occupancy || 0) + 1,
        });

        // Mark bed as occupied (if bedId provided)
        if (input.bedId && pgData.floors) {
            // Bed update is embedded in PG document; update the full floors array
            const updatedFloors = (pgData.floors as any[]).map((floor: any) => ({
                ...floor,
                rooms: floor.rooms.map((room: any) => ({
                    ...room,
                    beds: room.beds.map((bed: any) =>
                        bed.id === input.bedId ? { ...bed, guestId } : bed
                    ),
                })),
            }));
            batch.update(pgRef(db, ownerId, input.pgId), { floors: updatedFloors });
        }

        await batch.commit();

        // Link user or create invite in app DB (best-effort, non-blocking)
        if (input.email && appDb) {
            try {
                const userSnap = await appDb.collection('users').where('email', '==', input.email).limit(1).get();
                if (!userSnap.empty) {
                    await appDb.doc(`users/${userSnap.docs[0].id}`).set({
                        guestId,
                        pgId: input.pgId,
                        ownerId,
                    }, { merge: true });
                } else {
                    await appDb.doc(`invites/${input.email}`).set({
                        email: input.email,
                        ownerId,
                        role: 'tenant',
                        details: newGuest,
                        createdAt: Date.now(),
                    });
                }
            } catch (linkErr) {
                console.warn('[GuestService.addGuest] Could not link user or create invite:', linkErr);
            }
        }

        return newGuest;
    }

    /**
     * Update a guest record (and optionally the PG document) atomically.
     */
    static async updateGuest(
        db: Firestore,
        ownerId: string,
        guest: Guest,
        pg?: PG
    ): Promise<Guest> {
        const batch = db.batch();
        batch.set(guestRef(db, ownerId, guest.id), guest, { merge: true });
        if (pg) {
            batch.set(pgRef(db, ownerId, pg.id), pg);
        }
        await batch.commit();
        return guest;
    }

    /**
     * Initiate the guest exit process by setting an exit date.
     */
    static async initiateGuestExit(
        db: Firestore,
        ownerId: string,
        guestId: string,
        noticePeriodDays: number = 30
    ): Promise<Partial<Guest>> {
        const exitDate = new Date();
        exitDate.setDate(exitDate.getDate() + noticePeriodDays);
        const exitDateStr = exitDate.toISOString();

        await guestRef(db, ownerId, guestId).set({ exitDate: exitDateStr }, { merge: true });
        return { id: guestId, exitDate: exitDateStr };
    }

    /**
     * Vacate a guest: mark as vacated, free their bed, decrement PG occupancy, clear user's guestId.
     */
    static async vacateGuest(
        db: Firestore,
        ownerId: string,
        guestId: string,
        appDb?: Firestore
    ): Promise<{ guestId: string; pgId: string }> {
        const snap = await guestRef(db, ownerId, guestId).get();
        if (!snap.exists) throw new Error(`Guest not found: ${guestId}`);

        const guest = snap.data() as Guest;
        const pgSnap = await pgRef(db, ownerId, guest.pgId).get();
        if (!pgSnap.exists) throw new Error(`PG not found: ${guest.pgId}`);

        const pgData = pgSnap.data()!;
        const vacatedAt = new Date().toISOString();

        // Free the bed in floors data
        const updatedFloors = pgData.floors
            ? (pgData.floors as any[]).map((floor: any) => ({
                ...floor,
                rooms: floor.rooms.map((room: any) => ({
                    ...room,
                    beds: room.beds.map((bed: any) =>
                        bed.guestId === guestId ? { ...bed, guestId: null } : bed
                    ),
                })),
            }))
            : undefined;

        const batch = db.batch();
        batch.set(guestRef(db, ownerId, guestId), { isVacated: true, exitDate: vacatedAt }, { merge: true });
        batch.update(pgRef(db, ownerId, guest.pgId), {
            occupancy: Math.max(0, (pgData.occupancy || 0) - 1),
            ...(updatedFloors ? { floors: updatedFloors } : {}),
        });
        await batch.commit();

        // Clear user's active guest reference (best-effort)
        if (guest.userId && appDb) {
            try {
                await appDb.doc(`users/${guest.userId}`).set({
                    guestId: null,
                    pgId: null,
                }, { merge: true });
            } catch (e) {
                console.warn('[GuestService.vacateGuest] Could not clear user guestId:', e);
            }
        }

        return { guestId, pgId: guest.pgId };
    }

    /**
     * Update the KYC status of a guest (verified / rejected).
     */
    static async updateKycStatus(
        db: Firestore,
        ownerId: string,
        guestId: string,
        status: 'verified' | 'rejected',
        reason?: string
    ): Promise<void> {
        await guestRef(db, ownerId, guestId).set({
            kycStatus: status,
            kycRejectReason: reason || null,
        }, { merge: true });
    }

    /**
     * Submit KYC documents for a guest (sets status to 'pending').
     */
    static async submitKycDocuments(
        db: Firestore,
        ownerId: string,
        guestId: string,
        documents: SubmittedKycDocument[]
    ): Promise<void> {
        await guestRef(db, ownerId, guestId).set({
            kycStatus: 'pending',
            documents,
        }, { merge: true });
    }

    /**
     * Reset KYC: clear all documents, set status to not-started.
     */
    static async resetKyc(db: Firestore, ownerId: string, guestId: string): Promise<void> {
        await guestRef(db, ownerId, guestId).set({
            kycStatus: 'not-started',
            kycRejectReason: null,
            documents: [],
        }, { merge: true });
    }

    /**
     * Add a debit charge entry to a guest's ledger.
     */
    static async addCharge(
        db: Firestore,
        ownerId: string,
        guestId: string,
        charge: ChargeInput
    ): Promise<LedgerEntry> {
        const newCharge: LedgerEntry = {
            id: `charge-${Date.now()}`,
            date: new Date().toISOString(),
            type: 'debit',
            description: charge.description,
            amount: charge.amount,
        };

        await guestRef(db, ownerId, guestId).update({
            ledger: FieldValue.arrayUnion(newCharge),
        });

        return newCharge;
    }

    /**
     * Remove a charge entry from a guest's ledger.
     */
    static async removeCharge(
        db: Firestore,
        ownerId: string,
        guestId: string,
        chargeId: string
    ): Promise<void> {
        const snap = await guestRef(db, ownerId, guestId).get();
        if (!snap.exists) throw new Error(`Guest not found: ${guestId}`);

        const guest = snap.data() as Guest;
        const chargeToRemove = (guest.ledger || []).find(c => c.id === chargeId);
        if (!chargeToRemove) throw new Error(`Charge not found: ${chargeId}`);

        await guestRef(db, ownerId, guestId).update({
            ledger: FieldValue.arrayRemove(chargeToRemove),
        });
    }

    /**
     * Add a shared charge across all guests in a room.
     * Total amount is split equally among room occupants.
     */
    static async addSharedRoomCharge(
        db: Firestore,
        ownerId: string,
        roomId: string,
        charge: ChargeInput
    ): Promise<{ updatedCount: number }> {
        // Find all non-vacated guests in this room
        const guestsSnap = await db.collection('users_data').doc(ownerId).collection('guests')
            .where('roomId', '==', roomId)
            .where('isVacated', '==', false)
            .get();

        if (guestsSnap.empty) {
            throw new Error('No active guests found in this room');
        }

        const chargePerGuest = charge.amount / guestsSnap.docs.length;
        const batch = db.batch();

        guestsSnap.docs.forEach(docSnap => {
            const newCharge: LedgerEntry = {
                id: `charge-${Date.now()}-${docSnap.id}`,
                date: new Date().toISOString(),
                type: 'debit',
                description: charge.description,
                amount: chargePerGuest,
            };
            batch.update(docSnap.ref, { ledger: FieldValue.arrayUnion(newCharge) });
        });

        await batch.commit();
        return { updatedCount: guestsSnap.docs.length };
    }

    /**
     * Record a payment and run rent reconciliation.
     * Returns the fully reconciled guest record.
     */
    static async recordPayment(
        db: Firestore,
        ownerId: string,
        input: ReconcilePaymentInput
    ): Promise<Guest> {
        const { guest, amount, method } = input;
        const now = new Date();

        // Build payment ledger entry
        const creditEntry: LedgerEntry = {
            id: `credit-${Date.now()}`,
            date: now.toISOString(),
            type: 'credit',
            description: `Payment via ${method} — ₹${amount}`,
            amount,
        };

        // Add credit to guest ledger then run reconciliation
        const guestWithPayment = {
            ...guest,
            ledger: [...(guest.ledger || []), creditEntry],
            paymentHistory: [
                ...(guest.paymentHistory || []),
                {
                    id: `pay-${Date.now()}`,
                    date: now.toISOString(),
                    amount,
                    method,
                    forMonth: now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
                },
            ],
        };

        const { guest: reconciledGuest } = runReconciliationLogic(guestWithPayment as Guest, now);

        // Persist reconciled guest
        await guestRef(db, ownerId, guest.id).set(reconciledGuest, { merge: true });

        return reconciledGuest;
    }

    /**
     * Run rent cycle reconciliation for a guest without a payment.
     * Used by the cron job to advance billing cycles.
     */
    static async reconcileRentCycle(
        db: Firestore,
        ownerId: string,
        guestId: string,
        mockDate?: string
    ): Promise<{ guest: Guest; cyclesProcessed: number }> {
        const snap = await guestRef(db, ownerId, guestId).get();
        if (!snap.exists) throw new Error(`Guest not found: ${guestId}`);

        const guest = snap.data() as Guest;
        const now = mockDate ? new Date(mockDate) : new Date();

        const { guest: reconciledGuest, cyclesProcessed } = runReconciliationLogic(guest, now);

        if (cyclesProcessed > 0 || JSON.stringify(guest) !== JSON.stringify(reconciledGuest)) {
            await guestRef(db, ownerId, guestId).set(reconciledGuest, { merge: true });
        }

        return { guest: reconciledGuest, cyclesProcessed };
    }
}
