
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
    let linkedAccountId = owner.subscription?.razorpay_account_id?.trim();


    if (!linkedAccountId) {
      return badRequest('Owner has not configured a primary payout account. Payment cannot be processed.');
    }

    // SELF-HEALING: Ensure the account ID has the mandatory 'acc_' prefix (18 characters)
    // Legacy data might only have the 14-character suffix
    if (linkedAccountId && !linkedAccountId.startsWith('acc_')) {
      if (linkedAccountId.length === 14) {
        linkedAccountId = `acc_${linkedAccountId}`;
      } else {
        console.warn(`[DEBUG] Account ID length is ${linkedAccountId.length}, not 14. Cannot safely auto-fix with prefix, but checking if it's already 18 total...`);
      }
      
      if (linkedAccountId.length === 18) {
        // Proactively update Firestore so we don't have to keep fixing it
        try {
          await adminDb.collection('users').doc(ownerId).update({
            'subscription.razorpay_account_id': linkedAccountId
          });
        } catch (updateErr) {
          console.error("Failed to proactively update normalized account ID in Firestore:", updateErr);
        }
      }
    }


    // Use owner's enterprise database (if configured) for tenant records
    const enterpriseDbId = owner.subscription?.enterpriseProject?.databaseId;
    const enterpriseProjectId = owner.subscription?.enterpriseProject?.projectId;
    const dataDb = await getAdminDb(enterpriseProjectId, enterpriseDbId);

    // Fetch guest to get their details
    const guestDoc = await dataDb.collection('users_data').doc(ownerId).collection('guests').doc(guestId).get();
    if (!guestDoc.exists) return notFound('Guest not found.');

    const guest = guestDoc.data() as Guest;

    // 4. Validate Amount
    // Ensure the guest is not overpaying (unless they want to, but we keep it safe)
    // We calculate current balance from ledger to be sure it's accurate
    const ledger = guest.ledger || [];
    const calculatedBalance = ledger.reduce((acc, entry) => {
      if (entry.type === 'debit') return acc + entry.amount;
      if (entry.type === 'credit') return acc - entry.amount;
      return acc;
    }, 0);

    // We use the higher of calculated or field-stored balance for maximum flexibility
    const outstandingBalance = Math.max(calculatedBalance, guest.balance || 0);

    // We allow a small buffer (1 INR) for rounding issues or currency conversion Paise logic
    if (amount > (outstandingBalance + 1)) {
      return badRequest(`Requested amount (₹${amount}) exceeds outstanding balance (₹${outstandingBalance}).`);
    }

    const amountInPaise = Math.round(amount * 100);
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
