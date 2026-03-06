import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: Request) {
    try {
        const { ownerId, otp } = await req.json();

        if (!ownerId || !otp) {
            return NextResponse.json({ success: false, error: 'Missing ownerId or OTP.' }, { status: 400 });
        }

        const adminDb = await getAdminDb();
        const userRef = adminDb.collection('users').doc(ownerId);

        const userDoc = await userRef.get();
        if (!userDoc.exists) {
            return NextResponse.json({ success: false, error: 'User not found.' }, { status: 404 });
        }

        const userData = userDoc.data();

        if (!userData?.whatsappOtp || !userData?.whatsappOtpExpires || !userData?.pendingVerificationPhone) {
            return NextResponse.json({ success: false, error: 'No pending verification found. Please request a new OTP.' }, { status: 400 });
        }

        if (Date.now() > userData.whatsappOtpExpires) {
            return NextResponse.json({ success: false, error: 'OTP has expired. Please request a new one.' }, { status: 400 });
        }

        if (userData.whatsappOtp !== otp) {
            return NextResponse.json({ success: false, error: 'Invalid OTP.' }, { status: 400 });
        }

        // Verification successful, update the main phone number and clean up OTP fields
        await userRef.update({
            phone: userData.pendingVerificationPhone,
            whatsappOtp: FieldValue.delete(),
            whatsappOtpExpires: FieldValue.delete(),
            pendingVerificationPhone: FieldValue.delete(),
        });

        return NextResponse.json({ success: true, message: 'Phone number verified successfully.' });
    } catch (error: any) {
        console.error('Error verifying OTP:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
