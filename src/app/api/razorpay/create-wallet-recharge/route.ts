
import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { z } from 'zod';
import shortid from 'shortid';
import { getVerifiedOwnerId } from '@/lib/auth-server';
import { unauthorized, badRequest, serverError } from '@/lib/api/apiError';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

const rechargeRequestSchema = z.object({
  amount: z.number().min(1, 'Minimum recharge is ₹1.'),
  description: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate
    const { ownerId, error: authError } = await getVerifiedOwnerId(req);
    if (!ownerId) return unauthorized(authError);

    // 2. Validate input
    const body = await req.json();
    const validation = rechargeRequestSchema.safeParse(body);
    if (!validation.success) {
      return badRequest(validation.error.errors[0]?.message || 'Invalid request.');
    }

    const { amount, description } = validation.data;
    const amountInPaise = Math.round(amount * 100);

    // 3. Create Razorpay Order
    const options = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: `wallet_${ownerId.slice(-8)}_${shortid.generate()}`,
      notes: {
        type: 'wallet_recharge',
        ownerId,
        description: description || `Wallet recharge of ₹${amount}`,
      },
    };

    const order = await razorpay.orders.create(options);

    return NextResponse.json({ success: true, order });
  } catch (error: any) {
    console.error('[API: create-wallet-recharge] Error:', error.message || error);
    return serverError(error, 'POST /api/razorpay/create-wallet-recharge');
  }
}
