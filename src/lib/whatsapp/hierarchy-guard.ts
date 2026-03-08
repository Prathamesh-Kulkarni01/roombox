/**
 * Hierarchy Guard — WhatsApp Bot Prerequisite Enforcement
 *
 * Enforces the strict data hierarchy: Property → Floor → Room → Bed → Tenant
 *
 * Before any action that requires a parent entity to exist, call `checkHierarchy()`.
 * It returns null if the hierarchy is satisfied, or a redirect spec if blocked.
 *
 * Usage in workflow-definitions.ts onEnter:
 *   const block = await checkHierarchy(ctx.ownerId!, 'property');
 *   if (block) { ctx.data._guard = block; return; }
 */

import { selectOwnerDataAdminDb } from '../firebaseAdmin';

export type HierarchyRequirement = 'property' | 'floor' | 'room' | 'bed';

export interface HierarchyBlock {
    message: string;
    workflowId: string;
    stepId: string;
    /** Optional Quick Setup offer (e.g. for floor+bed combo) */
    quickSetupLabel?: string;
    quickSetupWorkflowId?: string;
    quickSetupStepId?: string;
}

// ── Main Guard Function ─────────────────────────────────────────────────────────

/**
 * Returns null if the hierarchy prerequisite is satisfied.
 * Returns a HierarchyBlock redirect spec if not.
 */
export async function checkHierarchy(
    ownerId: string,
    required: HierarchyRequirement
): Promise<HierarchyBlock | null> {
    if (!ownerId) return null; // safe default — don't block if no owner ID

    try {
        const db = await selectOwnerDataAdminDb(ownerId);

        if (required === 'property') {
            const pgSnap = await db
                .collection('users_data')
                .doc(ownerId)
                .collection('pgs')
                .limit(1)
                .get();

            if (pgSnap.empty) {
                return {
                    message:
                        `🏗️ *First Things First!*\n\n` +
                        `I see you haven't added a property yet.\n` +
                        `Let's name your first building before we add tenants.\n\n` +
                        `1️⃣ Set Up My First Property\n` +
                        `2️⃣ Back to Menu`,
                    workflowId: 'propertyManagement',
                    stepId: 'addPropertyName',
                };
            }
        }

        if (required === 'floor') {
            // Check if ANY floor exists under any property for this owner
            const pgSnap = await db
                .collection('users_data')
                .doc(ownerId)
                .collection('pgs')
                .limit(1)
                .get();

            if (pgSnap.empty) {
                return {
                    message:
                        `🏗️ *Property Required*\n\n` +
                        `You need a property before adding floors.\n\n` +
                        `1️⃣ Set Up My First Property\n` +
                        `2️⃣ Back to Menu`,
                    workflowId: 'propertyManagement',
                    stepId: 'addPropertyName',
                };
            }

            // Check floors under the first property (simplified — full check is per property)
            const firstPg = pgSnap.docs[0];
            const floorSnap = await db
                .collection('users_data')
                .doc(ownerId)
                .collection('pgs')
                .doc(firstPg.id)
                .collection('floors')
                .limit(1)
                .get();

            if (floorSnap.empty) {
                return {
                    message:
                        `🏢 *Floor Needed*\n\n` +
                        `*${firstPg.data()?.name || 'Your property'}* doesn't have any floors yet.\n\n` +
                        `1️⃣ Add a Floor First\n` +
                        `2️⃣ ⚡ Quick Setup (Add Floor 1 + proceed)\n` +
                        `3️⃣ Back to Menu`,
                    workflowId: 'propertyManagement',
                    stepId: 'selectProperty',
                    quickSetupLabel: '⚡ Quick Setup (Add Floor 1 + proceed)',
                    quickSetupWorkflowId: 'propertyManagement',
                    quickSetupStepId: 'addPropertyFloorsCount',
                };
            }
        }

        // 'room' and 'bed' guards can be added as the schema matures
        return null;
    } catch (err) {
        console.error('[HierarchyGuard] Check failed — allowing action (safe default):', err);
        return null; // Never block users due to guard errors
    }
}

// ── Hierarchy Status (for briefings / tips) ─────────────────────────────────────

export interface HierarchyStatus {
    hasProperties: boolean;
    propertyCount: number;
    hasFloors: boolean;
    hasRooms: boolean;
}

/**
 * Returns the current hierarchy completeness for an owner.
 * Used for contextual tips in the main menu briefing.
 */
export async function getHierarchyStatus(ownerId: string): Promise<HierarchyStatus> {
    const defaults: HierarchyStatus = {
        hasProperties: false,
        propertyCount: 0,
        hasFloors: false,
        hasRooms: false,
    };

    if (!ownerId) return defaults;

    try {
        const db = await selectOwnerDataAdminDb(ownerId);
        const pgSnap = await db
            .collection('users_data')
            .doc(ownerId)
            .collection('pgs')
            .get();

        if (pgSnap.empty) return defaults;

        defaults.hasProperties = true;
        defaults.propertyCount = pgSnap.size;

        // Sample-check the first property for floors
        const firstPg = pgSnap.docs[0];
        const floorSnap = await db
            .collection('users_data')
            .doc(ownerId)
            .collection('pgs')
            .doc(firstPg.id)
            .collection('floors')
            .limit(1)
            .get();

        defaults.hasFloors = !floorSnap.empty;

        if (!floorSnap.empty) {
            const firstFloor = floorSnap.docs[0];
            const roomSnap = await db
                .collection('users_data')
                .doc(ownerId)
                .collection('pgs')
                .doc(firstPg.id)
                .collection('floors')
                .doc(firstFloor.id)
                .collection('rooms')
                .limit(1)
                .get();
            defaults.hasRooms = !roomSnap.empty;
        }

        return defaults;
    } catch (err) {
        console.error('[HierarchyGuard] Status check failed:', err);
        return defaults;
    }
}
