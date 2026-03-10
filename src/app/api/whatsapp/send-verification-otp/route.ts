import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { sendWhatsAppMessage } from '@/lib/whatsapp/send-message';
import * as crypto from 'crypto';
import { getVerifiedOwnerId } from '@/lib/auth-server';
import { badRequest, serverError, unauthorized } from '@/lib/api/apiError';

export async function POST(req: NextRequest) {
    const { ownerId, error: authError } = await getVerifiedOwnerId(req);
    if (!ownerId) return unauthorized(authError);

    try {
        const { phone } = await req.json();

        if (!phone) {
            return badRequest('Missing phone.');
        }

        // Generate a 4-digit OTP
        const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
        const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes from now

        // Normalize phone: digits only, keep 10 digits if possible
        const normalizedPhone = phone.replace(/\D/g, '');
        const phoneToStore = normalizedPhone.length > 10 ? normalizedPhone.slice(-10) : normalizedPhone;

        const adminDb = await getAdminDb();
        const userRef = adminDb.collection('users').doc(ownerId);

        const userDoc = await userRef.get();
        if (!userDoc.exists) {
            return badRequest('User not found.');
        }

        // Store OTP temporarily in the user doc
        await userRef.update({
            whatsappOtp: otpCode,
            whatsappOtpExpires: expiresAt,
            pendingVerificationPhone: phoneToStore,
        });

        // Format phone for WhatsApp - ensure 91 prefix for delivery
        let formattedPhone = phoneToStore;
        if (formattedPhone.length === 10) {
            formattedPhone = '91' + formattedPhone;
        }

        // Send OTP via WhatsApp Template
        const { sendWhatsAppTemplate } = await import('@/lib/whatsapp/send-message');

        try {
            await sendWhatsAppTemplate(formattedPhone, 'new_auth_otp_secure', 'en_US', [
                {
                    type: 'body',
                    parameters: [
                        { type: 'text', text: otpCode } // {{1}}
                    ]
                },
                {
                    type: 'button',
                    sub_type: 'url',
                    index: 0, // Copy Code (Actually index 0 of buttons)
                    parameters: [{ type: 'text', text: otpCode }] // Meta uses this for copy-code too
                }
            ], ownerId, ownerId);
        } catch (templateErr) {
            console.warn('[send-verification-otp] Template failed, falling back to message:', templateErr);
            const msg = `*RentSutra Security*\n\nYour OTP for verifying your WhatsApp number is: *${otpCode}*\n\n_Do not share this code with anyone. It expires in 10 minutes._`;
            const sendResult = await sendWhatsAppMessage(formattedPhone, msg, ownerId, ownerId) as any;
            if (!sendResult.success && !sendResult.mock) {
                throw new Error('Failed to send WhatsApp message.');
            }
        }

        return NextResponse.json({ success: true, message: 'OTP sent successfully.' });
    } catch (error: any) {
        console.error('Error sending verification OTP:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
