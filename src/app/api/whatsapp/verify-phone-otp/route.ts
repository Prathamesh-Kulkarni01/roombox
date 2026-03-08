import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { getVerifiedOwnerId } from '@/lib/auth-server';
import { badRequest, serverError, unauthorized } from '@/lib/api/apiError';

export async function POST(req: NextRequest) {
    const { ownerId, error: authError } = await getVerifiedOwnerId(req);
    if (!ownerId) return unauthorized(authError);

    try {
        const { otp } = await req.json();

        if (!otp) {
            return badRequest('Missing OTP.');
        }

        const adminDb = await getAdminDb();
        const userRef = adminDb.collection('users').doc(ownerId);

        const userDoc = await userRef.get();
        if (!userDoc.exists) {
            return badRequest('User not found.');
        }

        const userData = userDoc.data();

        if (!userData?.whatsappOtp || !userData?.whatsappOtpExpires || !userData?.pendingVerificationPhone) {
            return badRequest('No pending verification found. Please request a new OTP.');
        }

        if (Date.now() > userData.whatsappOtpExpires) {
            return badRequest('OTP has expired. Please request a new one.');
        }

        if (userData.whatsappOtp !== otp) {
            return badRequest('Invalid OTP.');
        }

        // Verification successful, update the main phone number (normalized) and clean up OTP fields
        const normalizedPhone = userData.pendingVerificationPhone.replace(/\D/g, '');
        const phoneToUpdate = normalizedPhone.length > 10 ? normalizedPhone.slice(-10) : normalizedPhone;

        await userRef.update({
            phone: phoneToUpdate,
            whatsappOtp: FieldValue.delete(),
            whatsappOtpExpires: FieldValue.delete(),
            pendingVerificationPhone: FieldValue.delete(),
        });

        return NextResponse.json({ success: true, message: 'Phone number verified successfully.' });
    } catch (error: any) {
        return serverError(error, 'POST /api/whatsapp/verify-phone-otp');
    }
}
