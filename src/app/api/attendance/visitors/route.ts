import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedOwnerId } from '@/lib/auth-server';
import { logVisitorEntry, logVisitorExit, getVisitorHistory } from '@/lib/actions/pgSecurityActions';
import { serverError, unauthorized } from '@/lib/api/apiError';

export async function GET(req: NextRequest) {
    const { ownerId, error } = await getVerifiedOwnerId(req);
    if (!ownerId) return unauthorized(error || 'Unauthorized');

    try {
        const pgId = req.nextUrl.searchParams.get('pgId') || '';
        const visitors = await getVisitorHistory(ownerId, pgId, 100);
        return NextResponse.json({ success: true, visitors });
    } catch (err: any) {
        return serverError(err, 'GET /api/attendance/visitors');
    }
}

export async function POST(req: NextRequest) {
    const { ownerId, error } = await getVerifiedOwnerId(req);
    if (!ownerId) return unauthorized(error || 'Unauthorized');

    try {
        const body = await req.json();
        const result = await logVisitorEntry(ownerId, body.pgId, {
            visitorName: body.visitorName,
            phone: body.phone,
        });
        return NextResponse.json(result);
    } catch (err: any) {
        return serverError(err, 'POST /api/attendance/visitors');
    }
}

export async function PATCH(req: NextRequest) {
    const { ownerId, error } = await getVerifiedOwnerId(req);
    if (!ownerId) return unauthorized(error || 'Unauthorized');

    try {
        const body = await req.json();
        const result = await logVisitorExit(ownerId, body.visitorLogId);
        return NextResponse.json(result);
    } catch (err: any) {
        return serverError(err, 'PATCH /api/attendance/visitors');
    }
}
