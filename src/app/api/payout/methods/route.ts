
import { NextRequest, NextResponse } from "next/server";
import type { User } from '@/lib/types';
import { z } from 'zod';
import Razorpay from "razorpay";

const payoutAccountSchema = z.object({
  payoutMethod: z.enum(['bank_account', 'vpa']),
  name: z.string().min(3).optional(),
  account_number: z.string().optional(),
  ifsc: z.string().optional(),
  vpa: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    return NextResponse.json({ error: "Server misconfiguration: Razorpay keys missing." }, { status: 500 });
  }

  let body;
  try {
    body = await req.json();
  } catch (error) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { owner, accountDetails } = body as { owner: User, accountDetails: z.infer<typeof payoutAccountSchema>};

  if (!owner || !accountDetails) {
    return NextResponse.json({ error: "Missing owner or accountDetails" }, { status: 400 });
  }

  const razorpay = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET,
  });

  try {
    const linkedAccountPayload: any = {
        name: owner.name,
        email: owner.email!,
        phone: owner.phone!,
        type: "vendor",
        reference_id: `owner_account_${owner.id.substring(0, 20)}`,
        notes: {
            owner_id: owner.id
        },
        ... (accountDetails.payoutMethod === 'vpa' 
            ? { vpa: { address: accountDetails.vpa! } }
            : { bank_account: { name: accountDetails.name!, ifsc: accountDetails.ifsc!, account_number: accountDetails.account_number! } }
        )
    };

    const linkedAccount = await razorpay.accounts.create(linkedAccountPayload);

    if (!linkedAccount || !linkedAccount.id) {
        throw new Error("Failed to create linked account on Razorpay.");
    }
    
    return NextResponse.json({ success: true, accountId: linkedAccount.id });

  } catch (err: any) {
    console.error("Error in /api/payout/methods:", err);
    return NextResponse.json({ error: err.error?.description || err.message || "Internal server error" }, { status: 500 });
  }
}
