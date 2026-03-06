import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { sendWhatsAppMessage } from '@/lib/whatsapp/send-message';
import * as crypto from 'crypto';

export async function POST(req: Request) {
    try {
        const { ownerId, phone } = await req.json();

        if (!ownerId || !phone) {
            return NextResponse.json({ success: false, error: 'Missing ownerId or phone.' }, { status: 400 });
        }

        // Generate a 4-digit OTP
        const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
        const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes from now

        const adminDb = await getAdminDb();
        const userRef = adminDb.collection('users').doc(ownerId);

        const userDoc = await userRef.get();
        if (!userDoc.exists) {
            return NextResponse.json({ success: false, error: 'User not found.' }, { status: 404 });
        }

        // Store OTP temporarily in the user doc
        await userRef.update({
            whatsappOtp: otpCode,
            whatsappOtpExpires: expiresAt,
            pendingVerificationPhone: phone,
        });

        // Format phone for WhatsApp
        let formattedPhone = phone.replace(/\D/g, '');
        if (formattedPhone.length === 10) {
            formattedPhone = '91' + formattedPhone;
        }

        // Send OTP via WhatsApp
        const msg = `*RentSutra Security*\n\nYour OTP for verifying your WhatsApp number is: *${otpCode}*\n\n_Do not share this code with anyone. It expires in 10 minutes._`;
        const sendResult = await sendWhatsAppMessage(formattedPhone, msg) as any;

        if (!sendResult.success && !sendResult.mock) {
            throw new Error('Failed to send WhatsApp message.');
        }

        return NextResponse.json({ success: true, message: 'OTP sent successfully.' });
    } catch (error: any) {
        console.error('Error sending verification OTP:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
