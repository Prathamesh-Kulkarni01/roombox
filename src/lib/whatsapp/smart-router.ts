/**
 * Smart Router — WhatsApp Bot Entry Point
 *
 * Replaces bot-logic.ts. Routes every incoming message through
 * the workflow engine. No hardcoded if/else chains.
 *
 * Flow:
 *   1. Load session from Redis
 *   2. If not authenticated → run auth flow
 *   3. If authenticated → load/advance workflow
 *   4. Handle cross-workflow navigation tokens
 *   5. Save session, send response
 */

import { sendWhatsAppMessage } from './send-message';
import { getSession, updateSession, clearSession } from './session-state';
import { workflowEngine } from './workflow-engine';
import { WorkflowContext } from './workflow-types';
import { getAdminDb } from '../firebaseAdmin';

// ─── Special navigation tokens produced by nextStepsFn ───────────────────────
// These tell the router to switch workflows rather than advance within one.
const WORKFLOW_SWITCH_MAP: Record<string, { workflowId: string; step: string }> = {
    '__switchPropertyManagement': { workflowId: 'propertyManagement', step: 'selectProperty' },
    '__switchAddTenant': { workflowId: 'addTenant', step: 'selectPgForTenant' },
    '__switchManageTenants': { workflowId: 'tenantManagement', step: 'selectTenantToManage' },
    '__switchTodayPayments': { workflowId: 'mainMenu', step: 'todayPayments' },
    '__switchMonthlySummary': { workflowId: 'mainMenu', step: 'monthlySummary' },
    '__switchPendingRents': { workflowId: 'mainMenu', step: 'pendingRents' },
    '__goMainMenu': { workflowId: 'mainMenu', step: 'showMenu' },
    '__goTenantPortal': { workflowId: 'tenantPortal', step: 'tenantMenu' },
};

// ─── Data-collecting workflows that can be safely resumed after timeout ────────
const RESUMABLE_WORKFLOWS = new Set([
    'addTenant',
    'ownerRegistration',
    'propertyManagement', // only when in addProperty steps
]);

// Workflow steps that are part of data entry (not navigation pages)
const DATA_ENTRY_STEP_PREFIXES = [
    'addProperty', 'tenantForm', 'editTenant', 'tenantLazy', 'askOwner', 'addFloor', 'addRoom', 'addBed'
];

function isDataEntryStep(stepId: string): boolean {
    return DATA_ENTRY_STEP_PREFIXES.some(prefix => stepId.startsWith(prefix));
}

// ─── Session helpers ──────────────────────────────────────────────────────────

function isContextExpired(ctx: WorkflowContext): boolean {
    const updated = new Date(ctx.updatedAt).getTime();
    return Date.now() - updated > 15 * 60 * 1000; // 15 min idle timeout
}

/** Returns true if the given input is a global navigation command */
function isNavCommand(text: string): boolean {
    const lower = text.toLowerCase();
    return ['menu', 'hi', 'hello', 'cancel', 'start'].includes(lower);
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

export async function handleIncomingMessage(data: {
    from: string;
    msgBody: string;
    messageType?: string;
    rawData?: any;
}): Promise<void> {
    const { from, msgBody, messageType, rawData } = data;

    // Use media ID as input for image messages
    let text = msgBody?.trim() || '';
    if (messageType === 'image' && rawData?.image?.id) {
        text = rawData.image.id;
    }

    console.log(`[Router] From: ${from} | Type: ${messageType} | Msg: "${text}"`);

    // Load persisted session
    const session = await getSession(from);

    // ── 1. Not authenticated → run auth ──────────────────────────────
    if (!session.data?.isAuthenticatedOwner && !session.data?.isAuthenticatedTenant) {
        await handleAuth(from, text, session);
        return;
    }

    // ── 2. Tenant authenticated ───────────────────────────────────────
    if (session.data?.isAuthenticatedTenant) {
        // SECURITY CHECK: Verify they haven't been vacated since their last login
        const activeTenants = await lookupTenantsByPhone(from);
        if (activeTenants.length === 0) {
            console.log(`[Router] Previously authenticated tenant ${from} is no longer active (vacated). Clearing session...`);
            await clearSession(from);
            await handleAuth(from, 'hi', { state: 'IDLE', data: {}, lastUpdated: Date.now() });
            return;
        }

        // LAZY ONBOARDING CHECK: If tenant has never completed self-onboarding, intercept
        const isAlreadyOnboarding = session.data?.workflowId === 'tenantLazyOnboarding';
        if (!isAlreadyOnboarding) {
            const isOnboarded = await checkTenantIsOnboarded(
                session.data.ownerId ?? '',
                session.data.guestId ?? ''
            );
            if (!isOnboarded) {
                console.log(`[Router] Tenant ${from} (guestId=${session.data.guestId}) is not onboarded. Starting lazy onboarding flow.`);
                await switchToWorkflow(from, session, 'tenantLazyOnboarding', 'welcomeAndName');
                return;
            }
        }

        await handleWithWorkflow(from, text, session, 'tenantPortal', 'tenantMenu');
        return;
    }

    // ── 3. Owner authenticated ────────────────────────────────────────
    if (session.data?.isAuthenticatedOwner) {
        // SECURITY CHECK: Verify they still exist and are an owner
        const activeOwners = await lookupOwnersByPhone(from);
        if (activeOwners.length === 0) {
            console.log(`[Router] Previously authenticated owner ${from} is no longer active/registered. Clearing session...`);
            await clearSession(from);
            await handleAuth(from, 'hi', { state: 'IDLE', data: {}, lastUpdated: Date.now() });
            return;
        }

        const lowerText = text.toLowerCase();
        const activeWorkflowId: string = session.data?.workflowId || 'mainMenu';
        const activeStep: string = session.data?.currentStep || 'showMenu';

        // ── Mid-Flow Switch Interception ─────────────────────────────────────
        // If user sends a nav command while in the middle of a data-entry flow,
        // ask them to save or switch — don't silently discard their progress.
        if (isNavCommand(text) && RESUMABLE_WORKFLOWS.has(activeWorkflowId) && isDataEntryStep(activeStep)) {
            const ctx: WorkflowContext | undefined = session.data?.workflowContext;
            const hasPartialData = ctx && Object.keys(ctx.data || {}).some(k =>
                k.startsWith('tf_') || k.startsWith('newProp') || k.startsWith('reg_') || k.startsWith('lazy_')
            );

            if (hasPartialData) {
                // Store pending switch intent so next message resolves it
                const workflowLabel = activeWorkflowId === 'addTenant' ? 'adding a tenant'
                    : activeWorkflowId === 'propertyManagement' ? 'setting up a property'
                        : 'your current task';

                await updateSession(from, 'IDLE', {
                    ...session.data,
                    _midFlowSwitchPending: true,
                    _midFlowLabel: workflowLabel,
                });
                await sendWhatsAppMessage(
                    from,
                    `🔀 *You're in the middle of ${workflowLabel}.*\n\n` +
                    `Your progress is saved for a few minutes.\n\n` +
                    `1️⃣ Save & go to Menu\n` +
                    `2️⃣ Continue current task`
                );
                return;
            }
        }

        // ── Resolve Pending Mid-Flow Switch ──────────────────────────────────
        if (session.data?._midFlowSwitchPending) {
            await updateSession(from, 'IDLE', {
                ...session.data,
                _midFlowSwitchPending: false,
            });
            if (text.trim() === '1') {
                // Discard and go to menu
                await updateSession(from, 'IDLE', {
                    ...session.data,
                    _midFlowSwitchPending: false,
                    workflowContext: undefined,
                    workflowId: 'mainMenu',
                    currentStep: 'showMenu',
                });
                await switchToWorkflow(from, await getSession(from), 'mainMenu', 'showMenu');
                return;
            } else {
                // Continue — re-present the current step
                await handleWithWorkflow(from, '', session, activeWorkflowId, activeStep);
                return;
            }
        }

        // Global reset commands (only when NOT in mid-flow)
        if (lowerText === 'menu' || lowerText === 'hi' || lowerText === 'hello') {
            await switchToWorkflow(from, session, 'mainMenu', 'showMenu');
            return;
        }

        if (lowerText === 'cancel') {
            await switchToWorkflow(from, session, 'mainMenu', 'showMenu');
            await sendWhatsAppMessage(from, '❌ Cancelled. Returning to main menu.');
            return;
        }

        // Continue active workflow
        await handleWithWorkflow(from, text, session, activeWorkflowId, activeStep);
        return;
    }
}

// ─── Workflow Dispatcher ──────────────────────────────────────────────────────

async function handleWithWorkflow(
    from: string,
    text: string,
    session: any,
    workflowId: string,
    currentStep: string
): Promise<void> {
    // Restore or build context
    let ctx: WorkflowContext = session.data?.workflowContext;

    if (!ctx || isContextExpired(ctx)) {
        // Check if this is a resumable workflow with partial data
        if (ctx && isContextExpired(ctx) && RESUMABLE_WORKFLOWS.has(workflowId) && isDataEntryStep(currentStep)) {
            const hasPartialData = Object.keys(ctx.data || {}).some(k =>
                k.startsWith('tf_') || k.startsWith('newProp') || k.startsWith('reg_') || k.startsWith('lazy_')
            );

            if (hasPartialData) {
                // Check if they've already responded to the resume prompt
                if (!session.data?._resumePending) {
                    // First time expiring — prompt user
                    const tenantName = ctx.data?.tf_name;
                    const label = tenantName ? `adding *${tenantName}*` : 'your previous work';
                    await updateSession(from, 'IDLE', {
                        ...session.data,
                        _resumePending: true,
                        _resumeWorkflowId: workflowId,
                        _resumeStep: currentStep,
                        _resumeCtx: ctx,
                    });
                    await sendWhatsAppMessage(
                        from,
                        `⏸️ *Welcome back!*\n\n` +
                        `Would you like to continue ${label} or start over?\n\n` +
                        `1️⃣ Continue\n` +
                        `2️⃣ Start Over`
                    );
                    return;
                }

                // They are responding to the resume prompt
                await updateSession(from, 'IDLE', { ...session.data, _resumePending: false });
                if (text.trim() === '1' && session.data._resumeCtx) {
                    // Restore and re-present
                    ctx = session.data._resumeCtx as WorkflowContext;
                    ctx.updatedAt = new Date(); // Reset timer
                    const message = await workflowEngine.presentStep(ctx);
                    await sendWhatsAppMessage(from, message);
                    await persistWorkflowContext(from, session, ctx);
                    return;
                }
                // '2' or anything else → fall through to fresh context below
            }
        }

        // Fresh context — present the current step
        ctx = workflowEngine.initializeContext(workflowId, from, from, {
            isAuthenticatedOwner: session.data?.isAuthenticatedOwner || false,
            isAuthenticatedTenant: session.data?.isAuthenticatedTenant || false,
            ownerId: session.data?.ownerId,
            ownerName: session.data?.ownerName,
            tenantName: session.data?.tenantName,
            guestId: session.data?.guestId,
            pgId: session.data?.pgId,
            userRole: session.data?.userRole,
        });
        ctx.workflowId = workflowId;
        ctx.currentStep = currentStep;
        if (session.data?.userRole) ctx.userRole = session.data.userRole;

        // Present the step (with onEnter)
        const message = await workflowEngine.presentStep(ctx);
        await sendWhatsAppMessage(from, message);
        await persistWorkflowContext(from, session, ctx);
        return;
    }

    // Ensure auth fields are always fresh
    ctx.isAuthenticatedOwner = session.data?.isAuthenticatedOwner || false;
    ctx.ownerId = session.data?.ownerId;
    ctx.ownerName = session.data?.ownerName;
    if (session.data?.userRole) ctx.userRole = session.data.userRole;

    // Process input through engine
    const result = await workflowEngine.processInput(text, ctx);

    if (!result.success) {
        // Validation error — repeat current step message
        await sendWhatsAppMessage(from, result.message || '⚠️ Invalid input. Try again.');
        return;
    }

    // Handle cross-workflow navigation tokens
    if (result.nextStep && WORKFLOW_SWITCH_MAP[result.nextStep]) {
        const { workflowId: nextWfId, step: nextStepId } = WORKFLOW_SWITCH_MAP[result.nextStep];
        await switchToWorkflow(from, session, nextWfId, nextStepId, ctx);
        return;
    }

    // Send the response message
    if (result.message) {
        await sendWhatsAppMessage(from, result.message);
    }

    // Persist updated context
    await persistWorkflowContext(from, session, result.context);
}

// ─── Switch Workflow ──────────────────────────────────────────────────────────

async function switchToWorkflow(
    from: string,
    session: any,
    workflowId: string,
    stepId: string,
    prevCtx?: WorkflowContext
): Promise<void> {
    const ctx = workflowEngine.initializeContext(workflowId, from, from, {
        isAuthenticatedOwner: session.data?.isAuthenticatedOwner || false,
        isAuthenticatedTenant: session.data?.isAuthenticatedTenant || false,
        ownerId: session.data?.ownerId,
        ownerName: session.data?.ownerName,
        tenantName: session.data?.tenantName,
        guestId: session.data?.guestId,
        pgId: session.data?.pgId,
        userRole: session.data?.userRole,
        // Preserve cross-workflow data if needed
        data: prevCtx?.data ? { pgsList: prevCtx.data.pgsList } : {},
    });
    ctx.workflowId = workflowId;
    ctx.currentStep = stepId;
    if (session.data?.userRole) ctx.userRole = session.data.userRole;

    // Run onEnter and present the step
    const message = await workflowEngine.presentStep(ctx);
    await sendWhatsAppMessage(from, message);
    await persistWorkflowContext(from, session, ctx);
}

// ─── Session Persistence ──────────────────────────────────────────────────────

async function persistWorkflowContext(from: string, session: any, ctx: WorkflowContext): Promise<void> {
    await updateSession(from, 'IDLE', {
        ...session.data,
        workflowContext: ctx,
        workflowId: ctx.workflowId,
        currentStep: ctx.currentStep,
    });
}

// ─── Authentication Handler ───────────────────────────────────────────────────

async function handleAuth(from: string, text: string, session: any): Promise<void> {
    const lowerText = text.toLowerCase();
    const state = session.state;

    // ── IDLE State (Entry greeting & Auto-login) ─────────────────────
    if (state === 'IDLE') {
        if (!['hi', 'hello', 'menu', 'start', 'test'].includes(lowerText)) {
            await sendWhatsAppMessage(from, `Welcome to RoomBox 🏠\n\nReply *Hi* to get started.`);
            return;
        }

        console.log(`[Auth] Identifying accounts for ${from}...`);

        // Parallel lookups for all account associations
        const [owners, tenants] = await Promise.all([
            lookupOwnersByPhone(from),
            lookupTenantsByPhone(from)
        ]);

        const allAccounts = [
            ...owners.map(o => ({ type: 'owner', ...o })),
            ...tenants.map(t => ({ type: 'tenant', ...t }))
        ];

        // 1. Single Account Found -> Auto-login
        if (allAccounts.length === 1) {
            const acc = allAccounts[0];
            if (acc.type === 'owner') {
                await updateSession(from, 'IDLE', {
                    isAuthenticatedOwner: true,
                    ownerName: acc.name,
                    ownerId: acc.id,
                    userRole: (acc.role as string) || 'owner', // Propagate role for access control
                });
                await sendWhatsAppMessage(from, `✅ *Welcome back, ${acc.name}!* (Owner)`);
                await switchToWorkflow(from, await getSession(from), 'mainMenu', 'showMenu');
            } else {
                await updateSession(from, 'IDLE', {
                    isAuthenticatedTenant: true,
                    tenantName: acc.name,
                    guestId: acc.id,
                    ownerId: acc.ownerId,
                    pgId: acc.pgId,
                });
                await sendWhatsAppMessage(from, `✅ *Welcome back, ${acc.name}!* (Tenant in ${acc.pgName || 'PG'})`);
                await switchToWorkflow(from, await getSession(from), 'tenantPortal', 'tenantMenu');
            }
            return;
        }

        // 2. Multiple Accounts Found -> Selection Menu
        if (allAccounts.length > 1) {
            await updateSession(from, 'AWAITING_ACCOUNT_SELECTION', { identifiedAccounts: allAccounts });
            let menu = `Hi ${allAccounts[0].name}! We found multiple accounts for this number.\n\nPlease select which one to log in to:\n\n`;
            allAccounts.forEach((acc, i) => {
                const label = acc.type === 'owner' ? `Owner Dashboard` : `Tenant (${acc.pgName || 'PG'})`;
                menu += `${i + 1}️⃣ ${label}\n`;
            });
            await sendWhatsAppMessage(from, menu);
            return;
        }

        // 3. No Account Found -> Role Selection / New Signup
        await updateSession(from, 'AWAITING_USER_ROLE', {});
        await sendWhatsAppMessage(
            from,
            `Welcome to RoomBox 🏠\n\n` +
            `We don't recognize your number. Are you a new owner or an existing tenant?\n\n` +
            `1️⃣ I am a Property Owner (Register)\n` +
            `2️⃣ I am a Tenant (Login)\n` +
            `3️⃣ Support`
        );
        return;
    }

    // ── Account Selection State (Multiple matches) ───────────────────
    if (state === 'AWAITING_ACCOUNT_SELECTION') {
        const accounts = session.data?.identifiedAccounts || [];
        const index = parseInt(text) - 1;

        if (index >= 0 && index < accounts.length) {
            const acc = accounts[index];
            if (acc.type === 'owner') {
                await updateSession(from, 'IDLE', {
                    isAuthenticatedOwner: true,
                    ownerName: acc.name,
                    ownerId: acc.id,
                    userRole: (acc.role as string) || 'owner',
                });
                await switchToWorkflow(from, await getSession(from), 'mainMenu', 'showMenu');
            } else {
                await updateSession(from, 'IDLE', {
                    isAuthenticatedTenant: true,
                    tenantName: acc.name,
                    guestId: acc.id,
                    ownerId: acc.ownerId,
                    pgId: acc.pgId,
                });
                await switchToWorkflow(from, await getSession(from), 'tenantPortal', 'tenantMenu');
            }
        } else {
            await sendWhatsAppMessage(from, `⚠️ Please reply with a valid option (1-${accounts.length}).`);
        }
        return;
    }

    // ── Role Selection state (Guest/Unknown) ─────────────────────────
    if (state === 'AWAITING_USER_ROLE') {
        if (text === '1') {
            await updateSession(from, 'IDLE', { isAuthenticatedOwner: false });
            await switchToWorkflow(from, await getSession(from), 'ownerRegistration', 'askOwnerName');
        } else if (text === '2') {
            // Re-check if they are a tenant now (maybe they were just added)
            const matchedTenants = await lookupTenantsByPhone(from);
            if (matchedTenants.length > 0) {
                // If miraculously multiple found now, re-route to selection
                if (matchedTenants.length > 1) {
                    await updateSession(from, 'AWAITING_ACCOUNT_SELECTION', { identifiedAccounts: matchedTenants.map(t => ({ type: 'tenant', ...t })) });
                    await handleIncomingMessage({ from, msgBody: 'hi', messageType: 'text' });
                } else {
                    const acc = matchedTenants[0];
                    await updateSession(from, 'IDLE', {
                        isAuthenticatedTenant: true,
                        tenantName: acc.name,
                        guestId: acc.id,
                        ownerId: acc.ownerId,
                        pgId: acc.pgId,
                    });
                    await switchToWorkflow(from, await getSession(from), 'tenantPortal', 'tenantMenu');
                }
            } else {
                await sendWhatsAppMessage(
                    from,
                    `❌ *Access Denied*\n\n` +
                    `We couldn't find a tenant record for your number (*${from.replace(/\D/g, '')}*).\n\n` +
                    `Please ask your PG owner to add your phone number accurately in the RoomBox portal.`
                );
                await updateSession(from, 'IDLE');
            }
        } else if (text === '3') {
            await sendWhatsAppMessage(from, `🆘 *Support*\n\nFor help, email us at: support@roombox.app\n\nOr visit: https://roombox.netlify.app/support\n\nReply *Hi* to go back.`);
            await updateSession(from, 'IDLE');
        } else {
            await sendWhatsAppMessage(from, `Please reply *1* for Owner, *2* for Tenant, or *3* for Support.`);
        }
        return;
    }

    // Fallback
    await sendWhatsAppMessage(from, `Reply *Hi* to get started.`);
}

// ─── Owner Lookup ─────────────────────────────────────────────────────────────

/**
 * Looks up owners associated with a phone number.
 * Returns multiple if found.
 */
async function lookupOwnersByPhone(from: string): Promise<any[]> {
    const adminDb = await getAdminDb();
    const allDigits = from.replace(/\D/g, '');
    const withoutCC = (allDigits.startsWith('91') && allDigits.length === 12) ? allDigits.substring(2) : allDigits;
    const withCCInput = (allDigits.length === 10) ? '91' + allDigits : allDigits;

    const roles = ['owner', 'manager'];
    // Variations: 91987..., 987..., 91987..., +91987...
    const phoneVariations = [...new Set([allDigits, withoutCC, withCCInput, '+' + withCCInput])];

    console.log(`[Auth] Looking up owners for variations: ${phoneVariations.join(', ')}`);
    const matches: any[] = [];

    for (const phone of phoneVariations) {
        try {
            const snap = await adminDb.collection('users')
                .where('role', 'in', roles)
                .where('phone', '==', phone)
                .get();

            snap.docs.forEach(doc => {
                if (!matches.find(m => m.id === doc.id)) {
                    matches.push({ id: doc.id, ...doc.data() as any });
                }
            });
        } catch (err) {
            console.error(`[Auth] Owner lookup failed for ${phone}:`, err);
        }
    }
    return matches;
}

// ─── Tenant Lookup ────────────────────────────────────────────────────────────

/**
 * Looks up tenants associated with a phone number across all owners.
 */
async function lookupTenantsByPhone(from: string): Promise<any[]> {
    const adminDb = await getAdminDb();
    const allDigits = from.replace(/\D/g, '');
    const withoutCC = (allDigits.startsWith('91') && allDigits.length === 12) ? allDigits.substring(2) : allDigits;
    const withCCInput = (allDigits.length === 10) ? '91' + allDigits : allDigits;

    // Variations: 91987..., 987..., 91987..., +91987...
    const phoneVariations = [...new Set([allDigits, withoutCC, withCCInput, '+' + withCCInput])];

    console.log(`[Auth] Looking up tenants for variations: ${phoneVariations.join(', ')}`);
    const matches: any[] = [];

    // STAGE 1: Standard User Lookup (Guaranteed Index)
    // Most tenants are linked to a User document in the root collection
    for (const phone of phoneVariations) {
        try {
            const userSnap = await adminDb.collection('users')
                .where('phone', '==', phone)
                .get();

            for (const uDoc of userSnap.docs) {
                const uData = uDoc.data();
                if (uData.guestId && uData.ownerId) {
                    // Try to fetch the full guest data for context
                    const gSnap = await adminDb.collection('users_data').doc(uData.ownerId).collection('guests').doc(uData.guestId).get();
                    if (gSnap.exists) {
                        const gData = gSnap.data();
                        if (gData?.isVacated === false) {
                            matches.push({
                                id: gSnap.id,
                                name: gData?.name || uData.name,
                                ownerId: uData.ownerId,
                                pgId: uData.pgId || gData?.pgId,
                                pgName: gData?.pgName || 'PG'
                            });
                        }
                    }
                }
            }
        } catch (e) { console.warn(`[Auth] Users collection fallback failed:`, e); }
    }

    // STAGE 2: Collection Group (Best Effort / Memory Fallback)
    for (const phone of phoneVariations) {
        let snap;
        try {
            // Priority: Optimized query
            snap = await adminDb.collectionGroup('guests')
                .where('phone', '==', phone)
                .where('isVacated', '==', false)
                .get();
        } catch (err: any) {
            if (err?.code === 9) {
                console.warn(`[Index Missing] collectionGroup('guests') missing index for ${phone}. Falling back to memory filter.`);
                // Fallback: Query by phone ONLY (single-field index usually exists) then filter isVacated
                try {
                    snap = await adminDb.collectionGroup('guests')
                        .where('phone', '==', phone)
                        .get();
                } catch (innerErr) {
                    console.error(`[Auth] Deep fallback failed for ${phone}:`, innerErr);
                    continue;
                }
            } else {
                console.error(`[Auth] STAGE 2 lookup error:`, err);
                continue;
            }
        }

        if (snap) {
            snap.docs.forEach(doc => {
                const data = doc.data();
                // Crucial: Manual filter for isVacated during index-less fallback
                if (data.isVacated === true) return;

                if (!matches.find(m => m.id === doc.id)) {
                    matches.push({
                        id: doc.id,
                        name: data.name,
                        ownerId: data.ownerId,
                        pgId: data.pgId,
                        pgName: data.pgName
                    });
                }
            });
        }
    }
    return matches;
}

// ─── Lazy Onboarding Helper ───────────────────────────────────────────────────

/**
 * Returns true if the tenant has completed self-onboarding via WhatsApp.
 * Defaults to `true` on errors so existing tenants are never accidentally locked out.
 */
async function checkTenantIsOnboarded(ownerId: string, guestId: string): Promise<boolean> {
    if (!ownerId || !guestId) return true; // Safe default
    try {
        const adminDb = await getAdminDb();
        const guestSnap = await adminDb
            .collection('users_data')
            .doc(ownerId)
            .collection('guests')
            .doc(guestId)
            .get();

        if (!guestSnap.exists) return true; // Doc missing — safe default
        const data = guestSnap.data();
        // If `isOnboarded` field is absent (old records), treat as already onboarded
        return data?.isOnboarded !== false;
    } catch (e) {
        console.error('[Router] checkTenantIsOnboarded error:', e);
        return true; // Safe default — don't block tenant on DB error
    }
}

export default handleIncomingMessage;
