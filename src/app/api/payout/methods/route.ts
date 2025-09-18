
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from 'uuid';
import type { User } from '@/lib/types';
import { z } from 'zod';

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

  const auth = "Basic " + Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64");
  const headers = { 
      Authorization: auth, 
      "Content-Type": "application/json",
      "X-Idempotency-Key": uuidv4(),
  };

  try {
    // Step 1: Create or find Contact
    let contactId = owner.subscription?.payoutMethods?.find(p => p.razorpay_contact_id)?.razorpay_contact_id;
    if (!contactId) {
        const contactPayload = {
            name: owner.name,
            email: owner.email,
            contact: owner.phone,
            type: "vendor",
            reference_id: `owner_contact_${owner.id.substring(0, 20)}`,
        };
        const contactResp = await fetch("https://api.razorpay.com/v1/contacts", {
            method: "POST", headers, body: JSON.stringify(contactPayload),
        });
        const contactData = await contactResp.json();
        if (!contactResp.ok) throw new Error(`Contact creation failed: ${contactData?.error?.description}`);
        contactId = contactData.id;
    }

    // Step 2: Create Fund Account
    let fundPayload;
    if (accountDetails.payoutMethod === 'vpa') {
        fundPayload = { contact_id: contactId, account_type: "vpa", vpa: { address: accountDetails.vpa } };
    } else {
        fundPayload = {
            contact_id: contactId,
            account_type: "bank_account",
            bank_account: {
                name: accountDetails.name,
                ifsc: accountDetails.ifsc,
                account_number: accountDetails.account_number,
            }
        };
    }
    
    const fundResp = await fetch("https://api.razorpay.com/v1/fund_accounts", {
        method: "POST", headers, body: JSON.stringify(fundPayload),
    });
    const fundData = await fundResp.json();
    if (!fundResp.ok) throw new Error(`Fund account creation failed: ${fundData?.error?.description}`);
    
    return NextResponse.json({ success: true, contactId, fundAccountId: fundData.id });

  } catch (err: any) {
    console.error("Error in /api/payout/methods:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
