
import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { z } from 'zod';
import shortid from 'shortid';
import { getVerifiedOwnerId } from '@/lib/auth-server';
import { unauthorized, badRequest } from '@/lib/api/apiError';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

const rechargeRequestSchema = z.object({
  amount: z.number().min(100, "Minimum recharge is ₹100."), // Min recharge amount
});

export async function POST(req: NextRequest) {
  try {
    const { ownerId: verifiedOwnerId, error: authError } = await getVerifiedOwnerId(req);
    if (!verifiedOwnerId) return unauthorized(authError);

    const body = await req.json();
    const validation = rechargeRequestSchema.safeParse(body);
    if (!validation.success) {
      return badRequest('Invalid request: amount must be at least ₹100.');
    }

    const { amount } = validation.data;
    const amountInPaise = Math.round(amount * 100);

    const options = {
      amount: amountInPaise,
      currency: "INR",
      receipt: `recharge_${shortid.generate()}`,
      notes: {
        type: 'whatsapp_recharge',
        ownerId: verifiedOwnerId,
      },
    };
    
    const order = await razorpay.orders.create(options);

    return NextResponse.json({ success: true, order });

  } catch (error: any) {
    console.error('Error creating Razorpay recharge order:', error);
    const errorDescription = error.error?.description || error.message || "An unknown error occurred.";
    return NextResponse.json({ success: false, error: errorDescription }, { status: error.statusCode || 500 });
  }
}
