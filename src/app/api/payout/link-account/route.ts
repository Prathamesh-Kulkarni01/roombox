import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { getVerifiedOwnerId } from '@/lib/auth-server';
import Razorpay from "razorpay";
import { User } from '@/lib/types';

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const RAZORPAY_ENV = process.env.RAZORPAY_ENV || 'test';

export async function POST(req: NextRequest) {
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    return NextResponse.json(
      { error: "Server misconfiguration: Razorpay keys missing." },
      { status: 500 }
    );
  }

  try {
    const { ownerId: verifiedOwnerId, error: authError } = await getVerifiedOwnerId(req);
    
    if (!verifiedOwnerId) {
      return NextResponse.json({ error: authError || "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { accountDetails } = body;

    if (!accountDetails) {
      return NextResponse.json({ error: "Missing accountDetails" }, { status: 400 });
    }

    if (!["bank_account", "vpa"].includes(accountDetails.payoutMethod)) {
      return NextResponse.json({ error: "Invalid payout method" }, { status: 400 });
    }

    const db = await getAdminDb();
    const ownerDoc = await db.collection('users').doc(verifiedOwnerId).get();
    
    if (!ownerDoc.exists) {
      return NextResponse.json({ error: "Owner not found" }, { status: 404 });
    }

    const owner = ownerDoc.data() as User;
    const isTest = RAZORPAY_ENV === "test";

    const razorpay = new Razorpay({
      key_id: RAZORPAY_KEY_ID,
      key_secret: RAZORPAY_KEY_SECRET,
    });

    const accounts = razorpay.accounts as any;

    // 1️⃣ Prepare Linked Account Payload
    const linkedAccountPayload: any = {
      name: accountDetails.payoutMethod === "vpa"
        ? `UPI for ${owner.name}`
        : accountDetails.name || owner.name,
      email: owner.email || `owner_${verifiedOwnerId}@example.com`,
      contact: owner.phone || "9999999999",
      type: "individual",
      tnc_accepted: true,
      account_details: {
        business_name: owner.name,
        business_type: "individual",
      },
    };

    const linkedAccount = await accounts.create(linkedAccountPayload);
    if (!linkedAccount?.id) throw new Error("Failed to create linked account.");

    // 2️⃣ Stakeholder
    const stakeholderPayload: any = {
      name: owner.name,
      email: owner.email || `owner_${verifiedOwnerId}@example.com`,
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
    const stakeholder = await accounts.createStakeholder(linkedAccount.id, stakeholderPayload);

    // 3️⃣ Request Route Product
    await accounts.requestProductConfiguration(linkedAccount.id, { product: "route", tnc_accepted: true });

    // 4️⃣ Configure Route Product
    const productConfigUpdate = await accounts.updateProductConfiguration(
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
