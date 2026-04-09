/**
 * /api/activity-logs — API for retrieving centralized activity logs
 */
import { NextRequest, NextResponse } from 'next/server';
import { enforcePermission } from '@/lib/rbac-middleware';
import { serverError } from '@/lib/api/apiError';
import { ActivityLogsService } from '@/lib/activity-logs-service';

// GET /api/activity-logs — list logs with filtering
export async function GET(req: NextRequest) {
    // We'll use 'settings:view' as the base permission for viewing audit logs,
    // as it's a management-level feature.
    const result = await enforcePermission(req, 'settings', 'view', 'GET /api/activity-logs');
    if (!result.authorized) return result.response;
    const { ownerId } = result;

    try {
        const url = new URL(req.url);
        const module = url.searchParams.get('module') || undefined;
        const activityType = url.searchParams.get('activityType') || undefined;
        const targetId = url.searchParams.get('targetId') || undefined;
        const userId = url.searchParams.get('userId') || undefined;
        const limit = parseInt(url.searchParams.get('limit') || '20', 10);
        const lastId = url.searchParams.get('lastId') || undefined;

        const { logs, lastDoc } = await ActivityLogsService.getLogs(ownerId, {
            module,
            activityType,
            targetId,
            userId,
            limit,
            lastId
        });

        return NextResponse.json({ 
            success: true, 
            logs,
            // Return the ID of the last fetched document for next page pagination
            nextId: lastDoc ? lastDoc.id : null 
        });
    } catch (error: any) {
        return serverError(error, 'GET /api/activity-logs');
    }
}
