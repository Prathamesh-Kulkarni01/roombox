
import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { getAdminDb } from '@/lib/firebaseAdmin';
import type { Guest, User } from '@/lib/types';
import { z } from 'zod';
import shortid from 'shortid';
import jwt from 'jsonwebtoken';
import { getVerifiedOwnerId } from '@/lib/auth-server';
import { badRequest, notFound, serverError, unauthorized } from '@/lib/api/apiError';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

const COMMISSION_RATE = parseFloat(process.env.COMMISSION_PERCENT || '0') / 100;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { amount, token, guestId: bodyGuestId, ownerId: bodyOwnerId } = body;

    if (!amount || amount < 1) return badRequest('Valid amount is required.');

    let effectiveOwnerId: string | null = null;
    let effectiveGuestId: string | null = null;

    // 1. Try Session Auth
    const { ownerId: sessionOwnerId, role, guestId: sessionGuestId, error: authError } = await getVerifiedOwnerId(req);

    if (sessionOwnerId) {
      effectiveOwnerId = sessionOwnerId;
      // If it's a tenant, they can only pay for themselves
      if (role === 'tenant') {
        effectiveGuestId = sessionGuestId || null;
      } else if (role === 'owner' || role === 'staff') {
        // Owners/Staff can pay for any of their guests (though usually it's the guest)
        effectiveGuestId = bodyGuestId;
      }
    }
    // 2. Try JWT Token Auth (for public links)
    else if (token) {
      const secret = process.env.JWT_SECRET;
      if (!secret) return serverError('JWT secret missing', 'POST /api/razorpay/create-rent-order');

      try {
        const decoded = jwt.verify(token, secret) as { guestId: string, ownerId: string };
        effectiveOwnerId = decoded.ownerId;
        effectiveGuestId = decoded.guestId;
      } catch (jwtErr) {
        return unauthorized('Invalid or expired payment token.');
      }
    }

    // Still no owner found?
    if (!effectiveOwnerId) return unauthorized(authError || 'Session or token required.');

    // Now we have a verified ownerId. If we don't have a verified guestId yet, take it from body if allowed.
    const guestId = effectiveGuestId || bodyGuestId;
    const ownerId = effectiveOwnerId;

    if (!guestId) return badRequest('guestId is required.');

    const adminDb = await getAdminDb();

    // Fetch owner to get their primary payout method (linked account)
    const ownerDoc = await adminDb.collection('users').doc(ownerId).get();
    if (!ownerDoc.exists) return notFound('Property owner not found.');

    const owner = ownerDoc.data() as User;
    const linkedAccountId = owner.subscription?.razorpay_account_id;

    if (!linkedAccountId) {
      return badRequest('Owner has not configured a primary payout account. Payment cannot be processed.');
    }

    // Use owner's enterprise database (if configured) for tenant records
    const enterpriseDbId = owner.subscription?.enterpriseProject?.databaseId;
    const enterpriseProjectId = owner.subscription?.enterpriseProject?.projectId;
    const dataDb = await getAdminDb(enterpriseProjectId, enterpriseDbId);

    // Fetch guest to get their details
    const guestDoc = await dataDb.collection('users_data').doc(ownerId).collection('guests').doc(guestId).get();
    if (!guestDoc.exists) return notFound('Guest not found.');

    const guest = guestDoc.data() as Guest;

    const amountInPaise = amount * 100;
    const commissionInPaise = Math.round(amountInPaise * COMMISSION_RATE);

    const options = {
      amount: amountInPaise,
      currency: "INR",
      receipt: `rent_${guestId}_${shortid.generate()}`,
      notes: {
        guestId,
        ownerId,
        guestName: guest.name,
        pgName: guest.pgName,
      },
      transfers: [
        {
          account: linkedAccountId,
          amount: amountInPaise - commissionInPaise,
          currency: "INR",
          on_hold: 0,
        }
      ]
    };

    const order = await razorpay.orders.create(options);
    return NextResponse.json({ success: true, order });

  } catch (error: any) {
    return serverError(error, 'POST /api/razorpay/create-rent-order');
  }
}
