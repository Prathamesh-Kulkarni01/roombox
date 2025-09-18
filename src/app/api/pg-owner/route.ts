
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  // required env checks
  const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_ACCOUNT_NUMBER } = process.env;
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    console.error("❌ Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET");
    return NextResponse.json(
      { error: "Server misconfiguration: Razorpay keys missing." },
      { status: 500 }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch (error) {
    console.error("Error parsing JSON body:", error);
    return NextResponse.json({ error: "Invalid request body. Expected JSON." }, { status: 400 });
  }

  try {
    const name = body.name?.toString()?.trim();
    const email = body.email?.toString()?.trim();
    const phone = body.phone?.toString()?.trim();
    const upi = body.upi?.toString()?.trim();
    const amount = body.amount !== undefined ? Number(body.amount) : undefined; // INR

    if (!name || !upi) {
      return NextResponse.json({ error: "Missing required fields: name and upi are required." }, { status: 400 });
    }

    const auth = "Basic " + Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64");
    const headers = { Authorization: auth, "Content-Type": "application/json" };

    // 1) Create Contact
    const contactPayload = {
      name,
      email: email || undefined,
      contact: phone || undefined,
      type: "vendor",
      reference_id: `pg_owner_${Date.now()}`,
      notes: { role: "PG Owner" },
    };

    const contactResp = await fetch("https://api.razorpay.com/v1/contacts", {
      method: "POST",
      headers,
      body: JSON.stringify(contactPayload),
    });
    const contactData = await contactResp.json();
    if (!contactResp.ok) {
      console.error("Contact creation failed:", contactData);
      return NextResponse.json({ error: "Contact creation failed", details: contactData }, { status: contactResp.status || 500 });
    }
    const contactId = contactData.id;

    // 2) Create Fund Account (VPA/UPI)
    const fundPayload = {
      contact_id: contactId,
      account_type: "vpa",
      vpa: { address: upi },
    };

    const fundResp = await fetch("https://api.razorpay.com/v1/fund_accounts", {
      method: "POST",
      headers,
      body: JSON.stringify(fundPayload),
    });
    const fundData = await fundResp.json();
    if (!fundResp.ok) {
      console.error("Fund account creation failed:", fundData);
      return NextResponse.json({ error: "Fund account creation failed", details: fundData }, { status: fundResp.status || 500 });
    }
    const fundAccountId = fundData.id;

    // 3) Optionally create payout if amount provided
    let payoutResult = null;
    if (amount !== undefined) {
      if (!RAZORPAY_ACCOUNT_NUMBER) {
        return NextResponse.json({
          error:
            "RAZORPAY_ACCOUNT_NUMBER is required to create payouts. Set RAZORPAY_ACCOUNT_NUMBER in environment variables.",
        }, { status: 500 });
      }

      if (isNaN(amount) || amount <= 0) {
        return NextResponse.json({ error: "Invalid amount provided for payout." }, { status: 400 });
      }

      const commissionPercent = Number(process.env.COMMISSION_PERCENT ?? 0);
      const rentPaise = Math.round(Number(amount) * 100); // paise
      const commissionPaise = Math.round((rentPaise * commissionPercent) / 100);
      const finalPaise = Math.max(rentPaise - commissionPaise, 0);

      const payoutPayload = {
        account_number: RAZORPAY_ACCOUNT_NUMBER,
        fund_account_id: fundAccountId,
        amount: finalPaise, // paise (integer)
        currency: "INR",
        mode: "UPI",
        purpose: "payout",
        queue_if_low_balance: true,
        narration: "PG Rent Settlement",
      };

      const payoutResp = await fetch("https://api.razorpay.com/v1/payouts", {
        method: "POST",
        headers,
        body: JSON.stringify(payoutPayload),
      });
      const payoutData = await payoutResp.json();
      if (!payoutResp.ok) {
        console.error("Payout creation failed:", payoutData);
        // return contact/fund ids too so debugging is easier
        return NextResponse.json(
          { error: "Payout creation failed", details: payoutData, contactId, fundAccountId },
          { status: payoutResp.status || 500 }
        );
      }
      payoutResult = payoutData;
    }

    // Success response
    return NextResponse.json({
      success: true,
      contactId,
      fundAccountId,
      payout: payoutResult, // null if not triggered
      commissionPercent: Number(process.env.COMMISSION_PERCENT ?? 0),
      note:
        "Use testsuccess@razorpay as UPI in Test Mode (testsuccess@razorpay => success, testfailure@razorpay => failure).",
    });
  } catch (err: any) {
    console.error("Unexpected error in /api/pg-owner:", err);
    return NextResponse.json({ error: "Internal server error", details: err.message }, { status: 500 });
  }
}
