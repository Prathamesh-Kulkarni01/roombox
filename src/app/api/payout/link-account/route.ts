import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";

export async function POST(req: NextRequest) {
  const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_ENV } = process.env;
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    return NextResponse.json(
      { error: "Server misconfiguration: Razorpay keys missing." },
      { status: 500 }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { owner, accountDetails } = body;
  if (!owner || !accountDetails) {
    return NextResponse.json({ error: "Missing owner or accountDetails" }, { status: 400 });
  }

  if (!["bank_account", "vpa"].includes(accountDetails.payoutMethod)) {
    return NextResponse.json({ error: "Invalid payout method" }, { status: 400 });
  }

  const isTest = RAZORPAY_ENV === "test"||true;

  try {
    const razorpay = new Razorpay({
      key_id: RAZORPAY_KEY_ID,
      key_secret: RAZORPAY_KEY_SECRET,
    });

    // 1️⃣ Prepare Linked Account Payload
    const linkedAccountPayload: any = {
      name: accountDetails.payoutMethod === "vpa"
        ? `UPI for ${owner.name}`
        : accountDetails.name || owner.name,
      email: owner.email || `test_${Date.now()}@example.com`,
      contact: owner.phone || "9999999999",
      type: "individual",
      tnc_accepted: true,
      account_details: {
        business_name: owner.name,
        business_type: "individual",
      },
    };
    console.log({ linkedAccountPayload });

    const linkedAccount = await razorpay.accounts.create(linkedAccountPayload);
    console.log({ linkedAccount });
    if (!linkedAccount?.id) throw new Error("Failed to create linked account.");

    // 2️⃣ Stakeholder
    const stakeholderPayload: any = {
      name: owner.name,
      email: owner.email || `test_${Date.now()}@example.com`,
      phone: owner.phone || "9999999999",
      relationship: { director: true, executive: true },
      kyc: isTest
        ? {}
        : {
            pan: accountDetails.pan,
            name: owner.name,
            dob: accountDetails.dob, // YYYY-MM-DD
          },
      percentage_ownership: 100,
    };
    const stakeholder = await razorpay.accounts.createStakeholder(linkedAccount.id, stakeholderPayload);

    // 3️⃣ Request Route Product
    await razorpay.accounts.requestProductConfiguration(linkedAccount.id, { product: "route", tnc_accepted: true });

    // 4️⃣ Configure Route Product
    const productConfigUpdate = await razorpay.accounts.updateProductConfiguration(
      linkedAccount.id,
      "route",
      accountDetails.payoutMethod === "vpa"
        ? { vpa: { address: isTest ? "test@upi" : accountDetails.vpa } }
        : {
            bank_account: isTest
              ? {
                  name: owner.name,
                  ifsc: "TEST0000",
                  account_number: "1234567890",
                }
              : {
                  name: accountDetails.name,
                  ifsc: accountDetails.ifsc,
                  account_number: accountDetails.account_number,
                },
          }
    );

    return NextResponse.json({
      success: true,
      accountId: linkedAccount.id,
      stakeholderId: stakeholder.id,
      activationStatus: productConfigUpdate.activation_status,
    });
  } catch (err: any) {
    console.error("Error in /api/payout/link-account:", err);
    return NextResponse.json(
      { error: err.error?.description || err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
