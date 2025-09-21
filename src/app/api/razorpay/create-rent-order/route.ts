
import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { getAdminDb } from '@/lib/firebaseAdmin';
import type { Guest, User } from '@/lib/types';
import { z } from 'zod';
import shortid from 'shortid';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

const orderRequestSchema = z.object({
  guestId: z.string(),
  ownerId: z.string(),
  amount: z.number().min(1),
});

const COMMISSION_RATE = parseFloat(process.env.COMMISSION_PERCENT || '0') / 100;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = orderRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: 'Invalid request payload.' }, { status: 400 });
    }

    const { guestId, ownerId, amount } = validation.data;
    const adminDb = await getAdminDb();
    
    // Fetch owner to get their primary payout method (linked account)
    const ownerDoc = await adminDb.collection('users').doc(ownerId).get();
    if (!ownerDoc.exists) {
        return NextResponse.json({ success: false, error: 'Property owner not found.' }, { status: 404 });
    }
    const owner = ownerDoc.data() as User;
    const primaryPayoutAccount = owner.subscription?.payoutMethods?.find(m => m.isPrimary && m.isActive);

    if (!primaryPayoutAccount?.razorpay_fund_account_id) {
        return NextResponse.json({ success: false, error: 'Owner has not configured a primary payout account. Payment cannot be processed.' }, { status: 400 });
    }
    
    // Fetch guest to get their details
    const guestDoc = await adminDb.collection('users_data').doc(ownerId).collection('guests').doc(guestId).get();
    if (!guestDoc.exists) {
        return NextResponse.json({ success: false, error: 'Guest not found.' }, { status: 404 });
    }
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
          account: primaryPayoutAccount.razorpay_fund_account_id, // The Fund Account ID
          amount: amountInPaise - commissionInPaise,
          currency: "INR",
          on_hold: 0,
        }
      ]
    };
    
    const order = await razorpay.orders.create(options);

    return NextResponse.json({ success: true, order });

  } catch (error: any) {
    console.error('Error creating Razorpay order with Route:', error);
    const errorDescription = error.error?.description || error.message || "An unknown error occurred.";
    return NextResponse.json({ success: false, error: errorDescription }, { status: error.statusCode || 500 });
  }
}
