import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { StaffService } from '@/services/staffService';
import { auth } from 'firebase-admin';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { action, staffId, ownerId, data } = body;

        if (!action || !ownerId) {
            return NextResponse.json({ error: 'Action and ownerId are required' }, { status: 400 });
        }

        const appDb = await getAdminDb();
        // For simplicity, we assume 'db' is the same as 'appDb' in this project structure,
        // or we fetch it similarly. Based on previous code, getAdminDb() returns the main db.
        const db = appDb; 

        switch (action) {
            case 'add':
                if (!data) return NextResponse.json({ error: 'Data is required for add' }, { status: 400 });
                const newStaff = await StaffService.addStaff(db, appDb, { ...data, ownerId });
                return NextResponse.json({ success: true, staff: newStaff });

            case 'update':
                if (!staffId || !data) return NextResponse.json({ error: 'staffId and data are required for update' }, { status: 400 });
                await StaffService.updateStaff(db, appDb, ownerId, staffId, data);
                return NextResponse.json({ success: true });

            case 'delete':
                if (!staffId) return NextResponse.json({ error: 'staffId is required for delete' }, { status: 400 });
                await StaffService.deleteStaff(db, appDb, ownerId, staffId);
                return NextResponse.json({ success: true });

            case 'list':
                const staffList = await StaffService.getStaffList(db, ownerId);
                return NextResponse.json({ success: true, staff: staffList });

            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

    } catch (error: any) {
        console.error('Staff Management error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
