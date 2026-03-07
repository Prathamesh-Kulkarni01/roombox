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
};

// ─── Session helpers ──────────────────────────────────────────────────────────

function isContextExpired(ctx: WorkflowContext): boolean {
    const updated = new Date(ctx.updatedAt).getTime();
    return Date.now() - updated > 15 * 60 * 1000; // 15 min idle timeout
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
        await handleWithWorkflow(from, text, session, 'tenantPortal', 'tenantMenu');
        return;
    }

    // ── 3. Owner authenticated ────────────────────────────────────────
    const lowerText = text.toLowerCase();

    // Global reset commands
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
    await handleWithWorkflow(from, text, session,
        session.data?.workflowId || 'mainMenu',
        session.data?.currentStep || 'showMenu'
    );
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
        // Fresh context — present the current step
        ctx = workflowEngine.initializeContext(workflowId, from, from, {
            isAuthenticatedOwner: session.data?.isAuthenticatedOwner || false,
            isAuthenticatedTenant: session.data?.isAuthenticatedTenant || false,
            ownerId: session.data?.ownerId,
            ownerName: session.data?.ownerName,
        });
        ctx.workflowId = workflowId;
        ctx.currentStep = currentStep;

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
        // Preserve cross-workflow data if needed
        data: prevCtx?.data ? { pgsList: prevCtx.data.pgsList } : {},
    });
    ctx.workflowId = workflowId;
    ctx.currentStep = stepId;

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

    // ── Entry greeting ────────────────────────────────────────────────
    if (state === 'IDLE') {
        if (!['hi', 'hello', 'menu', 'start'].includes(lowerText)) {
            await sendWhatsAppMessage(from, `Welcome to RoomBox 🏠\n\nReply *Hi* to get started.`);
            return;
        }

        // Attempt owner auto-login by phone number
        const matchedOwner = await lookupOwnerByPhone(from);

        if (matchedOwner) {
            // ✅ Auto-login success
            await updateSession(from, 'IDLE', {
                isAuthenticatedOwner: true,
                ownerName: matchedOwner.name || 'Owner',
                ownerId: matchedOwner.id,
            });
            await sendWhatsAppMessage(from, `✅ *Welcome back, ${matchedOwner.name || 'Owner'}!*`);

            // Switch directly to main menu
            const updatedSession = await getSession(from);
            await switchToWorkflow(from, updatedSession, 'mainMenu', 'showMenu');
            return;
        }

        // Not an owner — show role selection
        await updateSession(from, 'AWAITING_USER_ROLE', {});
        await sendWhatsAppMessage(
            from,
            `Welcome to RoomBox 🏠\n\n` +
            `Who are you?\n\n` +
            `1️⃣ Property Owner / PG Owner\n` +
            `2️⃣ Tenant\n` +
            `3️⃣ Support`
        );
        return;
    }

    // ── Role selection ────────────────────────────────────────────────
    if (state === 'AWAITING_USER_ROLE') {
        if (text === '1') {
            await clearSession(from);
            await sendWhatsAppMessage(
                from,
                `❌ *Not Registered*\n\n` +
                `Your WhatsApp number isn't verified in our system.\n\n` +
                `*To get access:*\n` +
                `1️⃣ Visit: https://roombox.netlify.app/dashboard/settings\n` +
                `2️⃣ Go to *Settings → WhatsApp*\n` +
                `3️⃣ Add & verify your phone number\n` +
                `4️⃣ Reply *Hi* here to login automatically 🪄\n\n` +
                `Need help? Reply *Support*.`
            );
        } else if (text === '2') {
            await updateSession(from, 'IDLE', { isAuthenticatedTenant: true });
            await sendWhatsAppMessage(from, `✅ *Tenant Portal*\n\nWelcome to RoomBox Tenant Portal!`);
            const updatedSession = await getSession(from);
            await switchToWorkflow(from, updatedSession, 'tenantPortal', 'tenantMenu');
        } else if (text === '3') {
            await sendWhatsAppMessage(from, `🆘 *Support*\n\nFor help, email us at: support@roombox.app\n\nOr visit: https://roombox.netlify.app/support\n\nReply *Hi* to go back.`);
        } else {
            await sendWhatsAppMessage(from, `Please reply *1* for Owner, *2* for Tenant, or *3* for Support.`);
        }
        return;
    }

    // Fallback
    await sendWhatsAppMessage(from, `Reply *Hi* to get started.`);
}

// ─── Owner Lookup ─────────────────────────────────────────────────────────────

async function lookupOwnerByPhone(from: string): Promise<{ id: string; name: string; phone: string } | null> {
    try {
        const adminDb = await getAdminDb();

        // Format phone — WhatsApp sends with country code e.g. 919876543210
        const allDigits = from.replace(/\D/g, '');
        const withoutCC = (allDigits.startsWith('91') && allDigits.length === 12)
            ? allDigits.substring(2)
            : allDigits;

        // Try both owner and manager roles (managers often handle PG operations)
        const roles = ['owner', 'manager'];

        const queries = [
            // Try matching numeric strings in DB
            adminDb.collection('users')
                .where('role', 'in', roles)
                .where('phone', '==', allDigits)
                .limit(1)
                .get(),
            adminDb.collection('users')
                .where('role', 'in', roles)
                .where('phone', '==', withoutCC)
                .limit(1)
                .get(),
            // Failover: Match if DB has standard formatting like +91 XXXXX XXXXX or spaces
            // This is harder in Firestore without fetch-all, so we rely on normalization at save time
        ];

        const results = await Promise.all(queries);

        for (const snap of results) {
            if (!snap.empty) {
                const doc = snap.docs[0];
                return { id: doc.id, ...doc.data() as any };
            }
        }

        console.log(`[Auth] No authorized owner/manager found for phone: ${from} (tried ${allDigits} and ${withoutCC})`);
        return null;

    } catch (err) {
        console.error('[Auth] Owner lookup error:', err);
        return null;
    }
}

export default handleIncomingMessage;
