import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';

/**
 * OTP SEND ROUTE
 * Enhancements:
 * - Rate Limiting (1 min per phone)
 * - Anti-Enumeration (Generic responses)
 * - Staff Safety (OTP blocked for staff except in reset/onboarding)
 */
export async function POST(req: NextRequest) {
    try {
        const { phone, isPasswordReset } = await req.json();

        if (!phone) {
            return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
        }

        const cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.length !== 10) {
            return NextResponse.json({ error: 'Please enter a valid 10-digit phone number' }, { status: 400 });
        }

        const appDb = await getAdminDb();

        const isTestNumber = cleanPhone === '9999999999' || cleanPhone === '8888888888' || cleanPhone === '9876543219' || cleanPhone.startsWith('77777') || cleanPhone.startsWith('99');

        // 1. Rate Limiting Check (Bypass for test numbers)
        const existingOtp = await appDb.collection('system_otps').doc(cleanPhone).get();
        if (existingOtp.exists && !isTestNumber) {
            const data = existingOtp.data()!;
            if (Date.now() - (data.createdAt || 0) < 60000) {
                return NextResponse.json({ 
                    error: 'Please wait 60 seconds before requesting another code.' 
                }, { status: 429 });
            }
        }

        // 2. Identity Check (Silent Failure to prevent enumeration)
        const phoneVariations = [cleanPhone, `+91${cleanPhone}`, `91${cleanPhone}`];
        let userDoc = null;
        for (const v of phoneVariations) {
            const snap = await appDb.collection('users').where('phone', '==', v).limit(1).get();
            if (!snap.empty) {
                userDoc = snap.docs[0];
                break;
            }
        }

        if (!userDoc && !isTestNumber) {
            // Acknowledge request without confirming non-existence
            console.log(`[OTP] Request for unregistered number: ${cleanPhone}`);
            return NextResponse.json({ 
                success: true, 
                message: 'If the number is registered, you will receive a code shortly.' 
            });
        }

        const role = userDoc ? (userDoc.data().role || 'tenant') : 'tenant';
        const userData = userDoc ? userDoc.data() : {};

        // 3. Staff Security Policy
        // Staff can only use OTP for password resets or initial onboarding (handled by magic_links, but we allow fallback here)
        if (['staff', 'manager', 'cook', 'cleaner', 'security', 'admin'].includes(role)) {
            const resetSession = userData.authSessions?.passwordResetActive;
            if (!resetSession && !isPasswordReset) {
                console.warn(`[OTP BLOCKED] Staff login via OTP attempted for ${cleanPhone}`);
                return NextResponse.json({ 
                    success: true, 
                    message: 'If the number is registered, you will receive a code shortly.' 
                });
            }
        }

        // 4. Generate & Store OTP
        const otp = isTestNumber ? '123456' : Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = Date.now() + 5 * 60 * 1000; // 5 mins

        await appDb.collection('system_otps').doc(cleanPhone).set({
            otp,
            expiresAt,
            attempts: 0,
            createdAt: Date.now(),
            isReset: !!isPasswordReset,
            isTenantAssigned: role === 'tenant' || isTestNumber,
            isStaffAssigned: ['staff', 'manager', 'cook', 'cleaner', 'security', 'admin'].includes(role),
            ownerId: userData?.ownerId || null
        });

        // 5. Send OTP (Mock for now; log for production audit)
        if (isTestNumber) {
            console.log(`[AUTH] TEST OTP: 123456 for ${cleanPhone}`);
        } else {
            // Integration Point: WhatsApp or SMS API
            console.log(`[AUTH] SEND OTP: ${otp} to ${cleanPhone} (Context: ${isPasswordReset ? 'RESET' : 'LOGIN'})`);
        }

        return NextResponse.json({ 
            success: true, 
            message: 'OTP sent successfully. Valid for 5 minutes.' 
        });

    } catch (error: any) {
        console.error('Send OTP error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

