
import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import type { User } from '@/lib/types';

interface OnboardRequestBody {
  owner: User;
  accountDetails: {
    payoutMethod: 'bank_account' | 'vpa';
    name?: string;
    account_number?: string;
    ifsc?: string;
    vpa?: string;
    pan?: string;
  };
}

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

  const { owner, accountDetails } = body as OnboardRequestBody;

  if (!owner || !accountDetails) {
    return NextResponse.json({ error: "Missing owner or accountDetails" }, { status: 400 });
  }

  const razorpay = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET,
  });

  try {
    // Step 1: Create a Linked Account
    const linkedAccountPayload = {
        name: owner.name,
        email: owner.email!,
        phone: owner.phone!,
        type: 'route' as 'route',
        legal_business_name: owner.name,
        business_type: 'individual' as 'individual', // Simplified for this use case
    };
    
    const linkedAccount = await razorpay.accounts.create(linkedAccountPayload);
    if (!linkedAccount || !linkedAccount.id) {
        throw new Error("Failed to create linked account on Razorpay.");
    }
    
    // Step 2: Create a Stakeholder for the Linked Account
    const stakeholderPayload = {
      name: owner.name,
      email: owner.email!,
      kyc: { pan: accountDetails.pan! }
    };
    await razorpay.accounts.createStakeholder(linkedAccount.id, stakeholderPayload);

    // Step 3: Create Fund Account (Bank or VPA) linked to the Linked Account
    let fundAccount;
    if (accountDetails.payoutMethod === 'vpa') {
        fundAccount = await razorpay.fundAccount.create({
            account_type: 'vpa',
            contact_id: linkedAccount.id, // This links it to the Linked Account
            vpa: { address: accountDetails.vpa! }
        });
    } else { // bank_account
        fundAccount = await razorpay.fundAccount.create({
            account_type: 'bank_account',
            contact_id: linkedAccount.id, // This links it to the Linked Account
            bank_account: {
                name: accountDetails.name!,
                ifsc: accountDetails.ifsc!,
                account_number: accountDetails.account_number!
            }
        });
    }
    
    if(!fundAccount) {
        throw new Error("Failed to create fund account for linked account.")
    }

    return NextResponse.json({ success: true, accountId: linkedAccount.id });

  } catch (err: any) {
    console.error("Error in /api/payout/onboard:", err);
    return NextResponse.json({ error: err.error?.description || err.message || "Internal server error" }, { status: 500 });
  }
}
