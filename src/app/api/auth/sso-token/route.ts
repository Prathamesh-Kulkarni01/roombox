import { NextRequest, NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/tenantResolver';
import { getAdminAuth } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const { auth: adminAuth } = await resolveTenant(req);
    
    // Verify the token to ensure the request is authenticated
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;

    // Create a secure, 5-minute single-use custom login token for this UID
    const customToken = await adminAuth.createCustomToken(uid);

    return NextResponse.json({ success: true, customToken });
  } catch (error) {
    console.error('[SSO Token Error]', error);
    return NextResponse.json({ error: 'Failed to create token' }, { status: 500 });
  }
}
