import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';

/**
 * INTERNAL TEST-ONLY ROUTE
 * used by E2E tests to safely retrieve OTPs from the emulator
 * Restricted to non-production environments.
 */
export async function GET(req: NextRequest) {
    // SECURITY: Bypass only in development/test
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Not permitted in production' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const phone = searchParams.get('phone');

    if (!phone) {
        return NextResponse.json({ error: 'Phone required' }, { status: 400 });
    }

    try {
        const cleanPhone = phone.replace(/\D/g, '').slice(-10);
        const appDb = await getAdminDb();
        
        // 1. Check system_otps
        const doc = await appDb.collection('system_otps').doc(cleanPhone).get();
        if (doc.exists) {
            return NextResponse.json({ otp: doc.data()?.otp });
        }

        // 2. Check magic_links (For invitation testing)
        const magicSnap = await appDb.collection('magic_links')
            .where('phone', '==', cleanPhone)
            .where('used', '==', false)
            .limit(1)
            .get();
        
        if (!magicSnap.empty) {
            return NextResponse.json({ otp: magicSnap.docs[0].data().inviteCode });
        }

        return NextResponse.json({ error: 'OTP not found' }, { status: 404 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
