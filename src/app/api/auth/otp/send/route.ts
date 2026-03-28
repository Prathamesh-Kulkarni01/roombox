import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';

export async function POST(req: NextRequest) {
    try {
        const { phone } = await req.json();

        if (!phone) {
            return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
        }

        const cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.length !== 10) {
            return NextResponse.json({ error: 'Please enter a valid 10-digit phone number' }, { status: 400 });
        }

        const appDb = await getAdminDb();

        // 1. Check if a users doc exists with this phone (i.e. owner previously onboarded them)
        const phoneVariations = [cleanPhone, `+91${cleanPhone}`, `91${cleanPhone}`];
        let userDoc = null;
        for (const v of phoneVariations) {
            const snap = await appDb.collection('users').where('phone', '==', v).limit(1).get();
            if (!snap.empty) {
                userDoc = snap.docs[0];
                break;
            }
        }

        if (!userDoc) {
            // [BLOCKED] Phone not registered by any owner → reject
            console.log(`[BLOCKED] Unauthorized OTP request for phone ${cleanPhone} — not added by any owner.`);
            return NextResponse.json({
                error: 'You are not added to any property. Please contact your property owner to get access.'
            }, { status: 403 });
        }

        const userData = userDoc.data();
        // Only tenants and staff can use OTP login. Owners use email.
        if (userData.role === 'owner') {
            return NextResponse.json({ error: 'Owners must log in with email and password.' }, { status: 403 });
        }

        // 2. Generate OTP
        const isTestNumber = cleanPhone === '9999999999' || cleanPhone === '8888888888';
        const otp = isTestNumber ? '123456' : Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

        // 3. Store OTP in Firestore
        await appDb.collection('system_otps').doc(cleanPhone).set({
            otp,
            expiresAt,
            attempts: 0,
            createdAt: Date.now()
        });

        // 4. "Send" OTP (Mock: Log to console; replace with real SMS in production)
        if (isTestNumber) {
            console.log(`[TEST] Used fixed OTP 123456 for ${phone}`);
        } else {
            console.log(`[OTP] Sent OTP ${otp} to ${phone}`);
        }

        return NextResponse.json({ success: true, message: 'OTP sent successfully' });

    } catch (error: any) {
        console.error('Send OTP error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
