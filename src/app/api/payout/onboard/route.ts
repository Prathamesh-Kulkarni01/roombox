
import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import type { User } from "@/lib/types";

interface OnboardRequestBody {
  owner: User;
  accountDetails: {
    payoutMethod: "bank_account" | "vpa";
    name?: string;
    account_number?: string;
    ifsc?: string;
    vpa?: string;
    pan: string;
  };
}

export async function POST(req: NextRequest) {
  const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    return NextResponse.json(
      { error: "Server misconfiguration: Razorpay keys missing." },
      { status: 500 }
    );
  }

  let body: OnboardRequestBody;
  try {
    body = await req.json();
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { owner, accountDetails } = body;

  if (!owner || !accountDetails?.pan || !owner.email) {
    return NextResponse.json(
      { error: "Missing owner details (email) or essential account details (PAN)." },
      { status: 400 }
    );
  }

  const razorpay = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET,
  });

  try {
    // STEP 1: Create a Contact
    const contactPayload = {
        name: accountDetails.name || owner.name,
        email: owner.email,
        contact: owner.phone || "9999999999",
        type: 'vendor' as const, // For payouts
    };
    const contact = await razorpay.contacts.create(contactPayload);
    if (!contact?.id) {
        throw new Error("Failed to create contact on Razorpay.");
    }

    // STEP 2: Create a Linked Account for the Contact
    const linkedAccountPayload = {
      email: owner.email,
      phone: owner.phone || "9999999999",
      type: "route" as const,
      legal_business_name: accountDetails.name || owner.name,
      business_type: "individual" as const,
      contact_name: accountDetails.name || owner.name,
      profile: {
        category: "housing",
        subcategory: "facility_management",
        addresses: {
          registered: {
            street1: "123, Main Street",
            street2: "Near Landmark",
            city: "Bengaluru",
            state: "Karnataka",
            postal_code: "560001",
            country: "IN",
          },
        },
      },
    };
    
    // @ts-ignore - The SDK might not be perfectly typed for this, but the API expects it.
    const linkedAccount = await razorpay.accounts.create(linkedAccountPayload);
    if (!linkedAccount?.id) {
      throw new Error("Failed to create linked account on Razorpay.");
    }
    const linkedAccountId = linkedAccount.id;

    // STEP 3: Create Stakeholder for Linked Account (using owner's PAN)
    const stakeholderPayload = {
      name: accountDetails.name || owner.name,
      email: owner.email,
      percentage_ownership: 100,
      kyc: {
        pan: accountDetails.pan,
      },
    };
    // @ts-ignore
    const stakeholder = await razorpay.accounts.createStakeholder(linkedAccountId, stakeholderPayload);
    if (!stakeholder?.id) {
        throw new Error("Failed to create stakeholder for linked account.");
    }

    // STEP 4: Add Fund Account (Bank/VPA) to the Contact
    let fundAccount;
    if (accountDetails.payoutMethod === "vpa" && accountDetails.vpa) {
      fundAccount = await razorpay.fundAccounts.create({
        account_type: "vpa",
        contact_id: contact.id, // Use contact_id from Step 1
        vpa: { address: accountDetails.vpa },
      });
    } else if (
      accountDetails.payoutMethod === "bank_account" &&
      accountDetails.name &&
      accountDetails.ifsc &&
      accountDetails.account_number
    ) {
      fundAccount = await razorpay.fundAccounts.create({
        account_type: "bank_account",
        contact_id: contact.id, // Use contact_id from Step 1
        bank_account: {
          name: accountDetails.name,
          ifsc: accountDetails.ifsc,
          account_number: accountDetails.account_number,
        },
      });
    } else {
      throw new Error("Invalid payout method details provided.");
    }

    if (!fundAccount?.id) {
      throw new Error("Failed to create fund account for the contact.");
    }

    return NextResponse.json({
      success: true,
      linkedAccountId,
      fundAccountId: fundAccount.id,
      contactId: contact.id,
    });
  } catch (err: any) {
    console.error("Error in /api/payout/onboard:", err);
    return NextResponse.json(
      { error: err.error?.description || err.message || "Internal server error" },
      { status: err.statusCode || 500 }
    );
  }
}
