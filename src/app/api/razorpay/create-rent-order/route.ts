
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = orderRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: 'Invalid request payload.' }, { status: 400 });
    }

    const { guestId, ownerId, amount } = validation.data;
    const adminDb = await getAdminDb();

    // Fetch owner to get their Razorpay Linked Account ID
    const ownerDoc = await adminDb.collection('users').doc(ownerId).get();
    if (!ownerDoc.exists) {
      return NextResponse.json({ success: false, error: 'Owner not found.' }, { status: 404 });
    }
    const owner = ownerDoc.data() as User;
    const linkedAccountId = owner.subscription?.razorpay_linked_account_id;

    if (!linkedAccountId) {
      return NextResponse.json({ success: false, error: 'Owner payout account is not set up.' }, { status: 400 });
    }
    
    // Fetch guest to get their details
    const guestDoc = await adminDb.collection('users_data').doc(ownerId).collection('guests').doc(guestId).get();
    if (!guestDoc.exists) {
        return NextResponse.json({ success: false, error: 'Guest not found.' }, { status: 404 });
    }
    const guest = guestDoc.data() as Guest;

    const options = {
      amount: amount * 100, // amount in the smallest currency unit
      currency: "INR",
      receipt: `rent_${guestId}_${shortid.generate()}`,
      transfers: [
        {
          account: linkedAccountId,
          amount: amount * 100,
          currency: "INR",
          on_hold: 0, // Release payment immediately
        },
      ],
      notes: {
        guestId,
        ownerId,
        guestName: guest.name,
        pgName: guest.pgName,
      }
    };
    
    const order = await razorpay.orders.create(options);

    return NextResponse.json({ success: true, order });

  } catch (error: any) {
    console.error('Error creating Razorpay order:', error);
    return NextResponse.json({ success: false, error: error.message || "An unknown error occurred." }, { status: 500 });
  }
}
