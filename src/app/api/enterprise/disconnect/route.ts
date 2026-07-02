import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedOwnerId } from '@/lib/auth-server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { unauthorized, serverError } from '@/lib/api/apiError';

export async function POST(req: NextRequest) {
  const { ownerId, error: authError } = await getVerifiedOwnerId(req);
  if (!ownerId) return unauthorized(authError);

  try {
    const adminDb = await getAdminDb();
    
    // Owner subscription metadata always lives on the central Firebase project.
    await adminDb.collection('users').doc(ownerId).update({
      'subscription.enterpriseProject': null,
      'subscription.planId': 'monthly',
      'subscription.status': 'active', // keep active
    });

    return NextResponse.json({ success: true, message: 'Database successfully disconnected.' });
  } catch (error: any) {
    return serverError(error, 'POST /api/enterprise/disconnect');
  }
}
