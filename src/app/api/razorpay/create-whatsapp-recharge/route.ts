
import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { z } from 'zod';
import shortid from 'shortid';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

const rechargeRequestSchema = z.object({
  ownerId: z.string(),
  amount: z.number().min(100, "Minimum recharge is ₹100."), // Min recharge amount
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = rechargeRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: 'Invalid request payload.' }, { status: 400 });
    }

    const { ownerId, amount } = validation.data;
    const amountInPaise = amount * 100;

    const options = {
      amount: amountInPaise,
      currency: "INR",
      receipt: `recharge_${ownerId}_${shortid.generate()}`,
      notes: {
        type: 'whatsapp_recharge',
        ownerId,
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
