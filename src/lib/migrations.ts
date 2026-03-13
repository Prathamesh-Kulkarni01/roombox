import { Guest, PG, Payment, Complaint, CURRENT_SCHEMA_VERSION } from './types';
import { getAdminDb } from './firebaseAdmin';
import { GuestSchema, PGSchema, PaymentSchema, ComplaintSchema } from './schema';
import { z } from 'zod';

/**
 * Lazy Migration Utility
 * 
 * Updates a document automatically when it is read if its schemaVersion is older than the current schema version.
 */
export async function lazyMigrateDocument<T extends Record<string, any>>(
    collectionName: string,
    docId: string,
    docData: T,
    updateLogic: (data: T) => Partial<T>
): Promise<T> {
    const docSchemaVersion = docData.schemaVersion || 0;

    if (docSchemaVersion < CURRENT_SCHEMA_VERSION) {
        try {
            console.log(`[Lazy Migration] Upgrading ${collectionName}/${docId} from v${docSchemaVersion} to v${CURRENT_SCHEMA_VERSION}`);

            const updates = updateLogic(docData);

            // Merge original document with updates
            const updatedDoc = {
                ...docData,
                ...updates,
            } as any;

            // Set schemaVersion
            updatedDoc.schemaVersion = CURRENT_SCHEMA_VERSION;

            // Extract only mutations to apply in firestore
            const finalUpdates: any = {
                ...updates,
                schemaVersion: CURRENT_SCHEMA_VERSION
            };

            // Perform the update
            const adminDb = await getAdminDb();
            await adminDb.collection(collectionName).doc(docId).update(finalUpdates);

            return updatedDoc;
        } catch (error) {
            console.error(`[Lazy Migration] Failed to upgrade ${collectionName}/${docId}:`, error);
            // In case of error, just return the original document to avoid failing the read request.
            return docData;
        }
    }

    return docData;
}

// Helper to run Zod validation safely and log errors
function validateWithZod<T>(schema: z.ZodType<any, any, any>, data: any, docId: string): T {
    const result = schema.safeParse(data);
    if (!result.success) {
        console.warn(`[Validation Warning] Schema mismatch detected for ${docId}:`, result.error.errors);
        // Even if validation fails, we map fallback fields instead of crashing to stay backward compatible
    }
    return data as T;
}

// Specific helper for Tenant/Guest
export function getSafeGuestData(guest: any, docId: string): Guest {
    const safeData = {
        ...guest,
        depositAmount: guest.depositAmount ?? 0,
        rentAmount: guest.rentAmount ?? 0,
        rentStatus: guest.rentStatus ?? 'unpaid',
        amountType: guest.amountType ?? 'numeric',
        symbolicRentValue: guest.symbolicRentValue ?? 'XXX',
        symbolicDepositValue: guest.symbolicDepositValue ?? 'XXX',
        symbolicBalance: guest.symbolicBalance ?? '',
        schemaVersion: guest.schemaVersion ?? 0,
        kycStatus: guest.kycStatus ?? 'not-started',
        rentCycleUnit: guest.rentCycleUnit ?? 'months',
        rentCycleValue: guest.rentCycleValue ?? 1,
        billingAnchorDay: guest.billingAnchorDay ?? 1,
        isVacated: guest.isVacated ?? false,
        noticePeriodDays: guest.noticePeriodDays ?? 30,
    };
    return validateWithZod<Guest>(GuestSchema, safeData, docId);
}

// Specific helper for Property/PG
export function getSafePgData(pg: any, docId: string): PG {
    const safeData = {
        ...pg,
        status: pg.status ?? 'active',
        schemaVersion: pg.schemaVersion ?? 0,
    };
    return validateWithZod<PG>(PGSchema, safeData, docId);
}

// Specific helper for Payment
export function getSafePaymentData(payment: any, docId: string): Payment {
    const safeData = {
        ...payment,
        amountType: payment.amountType ?? 'numeric',
        symbolicValue: payment.symbolicValue ?? '',
        schemaVersion: payment.schemaVersion ?? 0,
    };
    return validateWithZod<Payment>(PaymentSchema, safeData, docId);
}

// Specific helper for Complaint
export function getSafeComplaintData(complaint: any, docId: string): Complaint {
    const safeData = {
        ...complaint,
        status: complaint.status ?? 'open',
        isPublic: complaint.isPublic ?? false,
        schemaVersion: complaint.schemaVersion ?? 0,
    };
    return validateWithZod<Complaint>(ComplaintSchema, safeData, docId);
}
