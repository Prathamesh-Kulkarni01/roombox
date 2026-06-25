import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedOwnerId } from '@/lib/auth-server';
import { selectOwnerDataAdminDb } from '@/lib/firebaseAdmin';
import { AttendanceService } from '@/services/attendanceService';
import { badRequest, serverError, unauthorized } from '@/lib/api/apiError';

export async function GET(req: NextRequest) {
    const authResult = await getVerifiedOwnerId(req);
    const { ownerId, error } = authResult;

    if (!ownerId) {
        return unauthorized(error || 'Unauthorized: Owner session not found.');
    }

    try {
        const pgId = req.nextUrl.searchParams.get('pgId') || undefined;

        // Stats summary queries
        if (req.nextUrl.searchParams.get('stats') === 'true') {
            const db = await selectOwnerDataAdminDb(ownerId);
            
            // Auto Daily Snapshot trigger for midnight summaries
            const todayStr = new Date().toISOString().split('T')[0];
            const summaryDoc = await db.collection('users_data').doc(ownerId).collection('daily_attendance_summary').doc(todayStr).get();
            if (!summaryDoc.exists) {
                await AttendanceService.createDailySummarySnapshot(db, ownerId, todayStr);
            }

            const stats = await AttendanceService.getAttendanceStats(db, ownerId, pgId);
            const lateReturns = await AttendanceService.getLateReturns(db, ownerId, pgId);
            const missingTenants = await AttendanceService.getMissingTenants(db, ownerId, pgId);
            const neverScanned = await AttendanceService.getNeverScannedTenants(db, ownerId, pgId);

            return NextResponse.json({
                success: true,
                stats,
                lateReturns,
                missingTenants,
                neverScanned
            });
        }

        const guestId = req.nextUrl.searchParams.get('guestId') || undefined;
        const type = (req.nextUrl.searchParams.get('type') as 'IN' | 'OUT') || undefined;
        const startDate = req.nextUrl.searchParams.get('startDate') || undefined;
        const endDate = req.nextUrl.searchParams.get('endDate') || undefined;
        const limitStr = req.nextUrl.searchParams.get('limit');
        const limit = limitStr ? parseInt(limitStr, 10) : 100;

        const db = await selectOwnerDataAdminDb(ownerId);
        const logs = await AttendanceService.getAttendanceLogs(db, ownerId, {
            pgId,
            guestId,
            type,
            startDate,
            endDate,
            limit,
        });

        return NextResponse.json({ success: true, logs });
    } catch (err) {
        return serverError(err, 'GET /api/attendance');
    }
}

export async function POST(req: NextRequest) {
    const authResult = await getVerifiedOwnerId(req);
    const { ownerId, guestId: sessionGuestId, error } = authResult;

    if (!ownerId) {
        return unauthorized(error || 'Unauthorized session.');
    }

    try {
        const body = await req.json();
        const targetGuestId = sessionGuestId || body.guestId;

        if (!targetGuestId) {
            return badRequest('guestId is required.');
        }

        const db = await selectOwnerDataAdminDb(ownerId);

        // Fetch guest details
        const guestDoc = await db
            .collection('users_data')
            .doc(ownerId)
            .collection('guests')
            .doc(targetGuestId)
            .get();

        if (!guestDoc.exists) {
            return badRequest('Tenant record not found.');
        }

        const guestData = guestDoc.data()!;
        if (guestData.isVacated) {
            return badRequest('Tenant is already vacated.');
        }

        // Fetch last status/log
        const lastLog = await AttendanceService.getLatestAttendanceLog(db, ownerId, targetGuestId);

        // Determine resolved type
        let resolvedType: 'IN' | 'OUT' = 'IN';
        if (body.type === 'IN' || body.type === 'OUT') {
            resolvedType = body.type;
        } else if (lastLog) {
            resolvedType = lastLog.type === 'IN' ? 'OUT' : 'IN';
        }

        // State Machine validation: IN -> IN or OUT -> OUT
        if (lastLog && lastLog.type === resolvedType && !body.override) {
            return NextResponse.json({
                success: false,
                error: 'STATE_WARNING',
                message: `You are already checked ${resolvedType}. Do you want to check ${resolvedType} again?`
            }, { status: 409 });
        }

        const roomName = guestData.roomName || 'N/A';

        if (body.checkStatusOnly) {
            return NextResponse.json({
                success: true,
                statusOnly: true,
                lastLog,
                recommendedType: resolvedType,
                tenantName: guestData.name || 'Tenant',
                roomName,
                pgName: guestData.pgName || 'N/A'
            });
        }

        const userAgent = req.headers.get('user-agent') || undefined;

        // Perform transaction-safe write
        const loggedEntry = await AttendanceService.logAttendance(db, ownerId, {
            scanId: body.scanId, // Idempotency Key
            ownerId,
            pgId: guestData.pgId || 'N/A',
            pgName: guestData.pgName || 'N/A',
            zoneId: body.zoneId || 'GATE',
            guestId: targetGuestId,
            tenantName: guestData.name || 'Tenant',
            roomName,
            type: resolvedType,
            purpose: body.purpose || null,
            latitude: body.latitude || null,
            longitude: body.longitude || null,
            id: `scan-${Date.now()}`, timestamp: new Date().toISOString(),
            deviceFingerprint: body.deviceFingerprint || null,
            userAgent,
            source: body.source || 'QR_SCAN',
            isEmergency: body.isEmergency || false,
        });

        return NextResponse.json({ success: true, log: loggedEntry });
    } catch (err) {
        return serverError(err, 'POST /api/attendance');
    }
}
