import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';

export async function POST(req: NextRequest) {
    try {
        const { phone } = await req.json();

        if (!phone) {
            return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
        }

        const cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.length < 10) {
            // Early return for obviously invalid input to save DB lookups
            // but keep response structure similar
            return NextResponse.json({ 
                success: true, 
                method: 'PASSWORD_OR_OTP',
                suggestion: 'PASSWORD'
            });
        }

        const appDb = await getAdminDb();
        const cleanPhoneDigits = cleanPhone.slice(-10);
        
        // 1. Check for Active Invitation (Magic Link)
        // We do this first because new users need an 'Invite Code' UX
        const magicSnap = await appDb.collection('magic_links')
            .where('phone', '>=', cleanPhoneDigits)
            .where('used', '==', false)
            .limit(5) // Get a few to check variations manually
            .get();

        let activeInvite = false;
        if (!magicSnap.empty) {
            for (const doc of magicSnap.docs) {
                const data = doc.data();
                const dp = (data.phone || '').replace(/\D/g, '');
                if (dp.includes(cleanPhoneDigits)) {
                    activeInvite = true;
                    break;
                }
            }
        }

        // 2. Check for Existing User
        const variations = [
            cleanPhone,
            `+91${cleanPhoneDigits}`,
            `91${cleanPhoneDigits}`,
            cleanPhoneDigits
        ];
        
        let userExists = false;
        for (const v of variations) {
            const snap = await appDb.collection('users').where('phone', '==', v).limit(1).get();
            if (!snap.empty) {
                userExists = true;
                break;
            }
        }

        // 3. Response Strategy (Anti-Enumeration & Adaptive)
        // If they have an invite but no user doc yet -> INVITE_CODE
        if (activeInvite && !userExists) {
            return NextResponse.json({ 
                success: true, 
                method: 'INVITE_CODE',
                suggestion: 'INVITE_CODE' 
            });
        }

        // For everyone else (Existing Users OR Potential New Users)
        // We return PASSWORD_OR_OTP. This provides a clean interface for returning users
        // while not confirming if the person is a user to an attacker.
        return NextResponse.json({ 
            success: true, 
            method: 'PASSWORD_OR_OTP',
            suggestion: 'PASSWORD' // Default expectation
        });

    } catch (error: any) {
        console.error('[CheckState] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
