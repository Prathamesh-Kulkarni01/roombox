
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { getVerifiedOwnerId } from '@/lib/auth-server';
import { badRequest, serverError, unauthorized } from '@/lib/api/apiError';
import { resolveTenant } from '@/platform/auth/server/tenant-resolver';
import { getAdminDb, selectOwnerDataAdminDb } from '@/lib/firebaseAdmin';

const tokenRequestSchema = z.object({
  guestId: z.string(),
});

export async function POST(req: NextRequest) {
  const { ownerId, error: authError } = await getVerifiedOwnerId(req);
  if (!ownerId) return unauthorized(authError);

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return NextResponse.json({ success: false, error: 'Server misconfiguration: JWT secret missing.' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const validation = tokenRequestSchema.safeParse(body);

    if (!validation.success) {
      return badRequest('Invalid request: guestId is required.');
    }

    const { guestId } = validation.data;

    // Fetch guest from the correct database (automatically resolves Enterprise DB if configured)
    const dataDb = await selectOwnerDataAdminDb(ownerId);
    const guestDoc = await dataDb.collection('users_data').doc(ownerId).collection('guests').doc(guestId).get();

    if (!guestDoc.exists) {
      return badRequest('Guest not found or does not belong to this owner.');
    }

    // Generate a secure JWT for the guest to access their rent details
    const token = jwt.sign({ guestId, ownerId }, secret, { expiresIn: '7d' });

    return NextResponse.json({ success: true, token });
  } catch (error: any) {
    return serverError(error, 'POST /api/generate-payment-link');
  }
}

function notFound(message: string) {
  return NextResponse.json({ success: false, error: message }, { status: 404 });
}
