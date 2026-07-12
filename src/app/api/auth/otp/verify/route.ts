import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/lib/firebaseAdmin';
import { logAuthEvent } from '@/lib/rbac-audit';

/**
 * OTP VERIFY ROUTE
 * Enhancements:
 * - Attempt Counter (Max 3)
 * - Role-Aware Enforcement (Staff security)
 * - Security Audit Logging
 */
export async function POST(req: NextRequest) {
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';
    
    try {
        const { phone, otp } = await req.json();

        if (!phone || !otp) {
            return NextResponse.json({ error: 'Phone and OTP are required' }, { status: 400 });
        }

        const appDb = await getAdminDb();
        const auth = await getAdminAuth();
        const cleanPhone = phone.replace(/\D/g, '');

        let userRole: any = null;
        let ownerId: string | null = null;
        let guestId: string | null = null;
        let staffId: string | null = null;
        let isInviteCode = false;
        let invitationData: any = null;
        let magicLinkDocId: string | null = null;
        let otpData: any = null;

        // 1. Check system_otps (Standard Login/Reset OTP)
        const otpRef = appDb.collection('system_otps').doc(cleanPhone);
        const otpDoc = await otpRef.get();
        
        if (otpDoc.exists) {
            otpData = otpDoc.data();
            
            // ATTEMPT LIMIT CHECK
            if ((otpData.attempts || 0) >= 3) {
                await otpRef.delete();
                await logAuthEvent({ phone, type: 'LOCKOUT', status: 'CRITICAL', ip, userAgent, details: 'Max attempts reached' });
                return NextResponse.json({ error: 'Too many failed attempts. Please request a new code.' }, { status: 429 });
            }

            if (otpData.otp === otp) {
                if (otpData.expiresAt > Date.now()) {
                    userRole = otpData.role || 'unassigned';
                    ownerId = otpData.ownerId;
                } else {
                    await otpRef.delete();
                    return NextResponse.json({ error: 'Code expired.' }, { status: 400 });
                }
            } else {
                // Increment attempts
                await otpRef.update({ attempts: (otpData.attempts || 0) + 1 });
                await logAuthEvent({ phone, type: 'OTP_FAILURE', status: 'WARNING', ip, userAgent, details: `Wrong code: ${otp}` });
            }
        }

        // 2. Check magic_links (Invitation / Setup Codes)
        if (!userRole) {
            const magicSnap = await appDb.collection('magic_links')
                .where('inviteCode', '==', otp)
                .where('used', '==', false)
                .get();

            if (!magicSnap.empty) {
                for (const mDoc of magicSnap.docs) {
                    const m = mDoc.data();
                    const dp = (m.phone || '').replace(/\D/g, '');
                    if (dp === cleanPhone || dp.slice(-10) === cleanPhone.slice(-10)) {
                        if (m.expiresAt && m.expiresAt < Date.now()) {
                            continue; // Expired
                        }
                        isInviteCode = true;
                        invitationData = m;
                        magicLinkDocId = mDoc.id;
                        userRole = m.role || 'tenant';
                        ownerId = m.ownerId;
                        staffId = m.staffId;
                        guestId = m.guestId;
                        break;
                    }
                }
            }
        }

        // 3. Validation Logic
        if (!userRole) {
            await logAuthEvent({ phone, type: 'OTP_FAILURE', status: 'WARNING', ip, userAgent, details: 'Invalid phone or code' });
            return NextResponse.json({ error: 'Incorrect code or phone number.' }, { status: 400 });
        }

        // 4. Find user record
        const cleanPhoneDigits = cleanPhone.slice(-10);
        let userDocSnap = null;
        let isEnterpriseUser = false;
        let enterpriseOwnerId: string | null = null;
        const variations = [cleanPhone, `+91${cleanPhoneDigits}`, `91${cleanPhoneDigits}`, cleanPhoneDigits];
        
        // Search central DB first
        for (const v of variations) {
            const snap = await appDb.collection('users').where('phone', '==', v).limit(1).get();
            if (!snap.empty) {
                userDocSnap = snap.docs[0];
                break;
            }
        }

        // If not found in central DB, try enterprise context
        if (!userDocSnap) {
            const { resolveTenant } = await import('@/platform/auth/server/tenant-resolver');
            const { selectOwnerDataAdminDb } = await import('@/lib/firebaseAdmin');
            
            const { tenantId, isEnterprise } = await resolveTenant(req);
            
            // Or if we know the ownerId from the OTP/invite data, try that
            const targetOwnerId = tenantId || ownerId;
            
            if (targetOwnerId) {
                const customDb = await selectOwnerDataAdminDb(targetOwnerId);
                
                // For enterprise staff and tenants, check the custom users and guests collections
                for (const v of variations) {
                    const snap = await customDb.collection('users').where('phone', '==', v).limit(1).get();
                    if (!snap.empty) {
                        userDocSnap = snap.docs[0];
                        isEnterpriseUser = true;
                        enterpriseOwnerId = targetOwnerId;
                        break;
                    }
                }
                
                if (!userDocSnap) {
                    for (const v of variations) {
                        const guestSnap = await customDb
                            .collection('users_data')
                            .doc(targetOwnerId)
                            .collection('guests')
                            .where('phone', '==', v)
                            .limit(1)
                            .get();
                        if (!guestSnap.empty) {
                            userDocSnap = guestSnap.docs[0];
                            isEnterpriseUser = true;
                            enterpriseOwnerId = targetOwnerId;
                            break;
                        }
                    }
                }
            }
        } else {
            // Check if central user is linked to an enterprise owner
            const userData = userDocSnap.data();
            if (userData?.ownerId) {
                const ownerDoc = await appDb.collection('users').doc(userData.ownerId).get();
                if (ownerDoc.exists) {
                    const ownerData = ownerDoc.data();
                    const { isEnterpriseIsolated } = await import('@/lib/enterprise/isolation');
                    if (isEnterpriseIsolated(ownerData as Record<string, unknown>)) {
                        isEnterpriseUser = true;
                        enterpriseOwnerId = userData.ownerId;
                    }
                }
            }
        }

        if (!userDocSnap) {
            return NextResponse.json({ error: 'Account not found. Contact owner.' }, { status: 404 });
        }

        const userData = userDocSnap.data()!;
        const uid = userDocSnap.id;
        const role = userData.role || userRole;

        // 5. STAFF SECURITY POLICY
        // Enforce Password-Only for Staff unless resetting or onboarding
        if (['staff', 'manager', 'cook', 'cleaner', 'security', 'admin'].includes(role)) {
            const isReset = otpData?.isReset;
            const isInvite = isInviteCode;
            
            if (!isReset && !isInvite) {
                await logAuthEvent({ uid, phone, type: 'STAFF_OTP_BLOCKED', status: 'CRITICAL', ip, userAgent });
                return NextResponse.json({ 
                    error: 'Administrative accounts must log in with a password for better security.' 
                }, { status: 403 });
            }
        }

        // 6. Cleanup & Success Flow
        if (isInviteCode && magicLinkDocId) {
            await appDb.collection('magic_links').doc(magicLinkDocId).update({
                used: true,
                usedAt: Date.now(),
                verifiedPhone: phone
            });
        } else {
            await otpRef.delete();
        }

        // 7. Token Generation
        const claims: any = {
            role,
            ownerId: userData.ownerId || ownerId || enterpriseOwnerId,
            guestId: userData.guestId || guestId || (role === 'tenant' ? uid : undefined),
            staffId: userData.staffId || staffId,
            pgId: userData.pgId,
        };

        // Populate staff details if needed
        if (claims.role !== 'owner' && claims.role !== 'tenant' && claims.role !== 'admin') {
            const sId = claims.staffId;
            const oId = claims.ownerId;
            if (sId && oId) {
                const { selectOwnerDataAdminDb } = await import('@/lib/firebaseAdmin');
                const targetDb = isEnterpriseUser ? await selectOwnerDataAdminDb(oId) : appDb;
                const sDoc = await targetDb.collection('users_data').doc(oId).collection('staff').doc(sId).get();
                if (sDoc.exists) {
                    claims.permissions = sDoc.data()?.permissions || [];
                    claims.pgs = sDoc.data()?.pgIds || [sDoc.data()?.pgId];
                }
            }
        }

        let activeAuth = auth;
        if (isEnterpriseUser && claims.ownerId) {
            const { resolveTenant } = await import('@/platform/auth/server/tenant-resolver');
            const { auth: tenantAuth } = await resolveTenant(req);
            if (tenantAuth && tenantAuth !== auth) {
                activeAuth = tenantAuth;
                console.log(`[AUTH] Using enterprise Auth for owner: ${claims.ownerId}`);
            }
        }

        const customToken = await activeAuth.createCustomToken(uid, claims);
        await activeAuth.setCustomUserClaims(uid, claims);

        console.log(`[AUTH] Successful OTP login: ${uid} (Role: ${role})`);
        return NextResponse.json({ success: true, customToken });

    } catch (error: any) {
        console.error('Verify OTP error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}


