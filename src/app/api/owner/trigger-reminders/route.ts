import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedOwnerId } from '@/lib/auth-server';
import { unauthorized, serverError } from '@/lib/api/apiError';
import { sendRemindersForOwner } from '@/lib/actions/reminderActions';
import { reconcileForOwner } from '@/lib/actions/reconciliationActions';

export const maxDuration = 60; // 1 minute max duration since it chunks guests

export async function POST(req: NextRequest) {
    const { ownerId, error } = await getVerifiedOwnerId(req);
    if (!ownerId) {
        return unauthorized(error);
    }

    try {
        // First run reconciliation so new rents/late fees are generated up to current time
        const reconciliationResult = await reconcileForOwner(ownerId, undefined, new Date(), { tenantScheduled: true });

        // Send reminders using the existing action.
        // We pass { tenantScheduled: true } so it forces execution even if the
        // owner has an isolated Enterprise DB, bypassing the central-path guard.
        const reminderResult = await sendRemindersForOwner(ownerId, new Date(), { tenantScheduled: true });
        
        return NextResponse.json({
            success: true,
            reconciliation: reconciliationResult,
            sentCount: reminderResult.sentCount,
            errorCount: reminderResult.errorCount,
            message: `Reconciled ledgers. Sent: ${reminderResult.sentCount}, Errors: ${reminderResult.errorCount}`
        });
    } catch (e: any) {
        return serverError(e, 'POST /api/owner/trigger-reminders');
    }
}
