
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
    pan: string;
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

  if (!owner || !accountDetails || !accountDetails.pan) {
    return NextResponse.json({ error: "Missing owner or essential account details (PAN)." }, { status: 400 });
  }

  const razorpay = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET,
  });

  try {
    // Step 1: Create a Contact for the owner
    const contact = await razorpay.contacts.create({
      name: accountDetails.name || owner.name,
      email: owner.email!,
      contact: owner.phone || '9999999999',
      type: 'vendor', // A contact for payouts is a 'vendor'
    });

    if (!contact || !contact.id) {
      throw new Error("Failed to create Razorpay Contact for the owner.");
    }
    
    // Step 2: Create a Linked Account for the Contact
    const linkedAccountPayload = {
        email: owner.email!,
        phone: owner.phone || '9999999999',
        type: 'route' as 'route',
        legal_business_name: accountDetails.name || owner.name,
        business_type: 'individual' as 'individual',
        contact_name: accountDetails.name || owner.name,
        profile: {
            category: "housing",
            subcategory: "facility_management" ,
            addresses: {
                registered: {
                    street1: "123, Main Street",
                    street2: "Near Landmark",
                    city: "Bengaluru",
                    state: "Karnataka",
                    postal_code: "560001",
                    country: "IN"
                }
            }
        }
    };
    
    const linkedAccount = await razorpay.accounts.create(linkedAccountPayload);

    if (!linkedAccount || !linkedAccount.id) {
        throw new Error("Failed to create linked account on Razorpay.");
    }

    // Step 3: Create a Stakeholder for the Linked Account with KYC info
    const stakeholderPayload = {
      name: accountDetails.name || owner.name,
      email: owner.email!,
      phone: owner.phone || '9999999999',
      kyc: {
          pan: accountDetails.pan
      }
    };
    
    await razorpay.stakeholders.create(linkedAccount.id, stakeholderPayload);

    // Step 4: Create Fund Account (Bank or VPA) linked to the CONTACT
    let fundAccount;
    const contactIdForFundAccount = contact.id; // Use the 'cont_...' ID here

    if (accountDetails.payoutMethod === 'vpa' && accountDetails.vpa) {
        fundAccount = await razorpay.fundAccount.create({
            account_type: 'vpa',
            contact_id: contactIdForFundAccount,
            vpa: { address: accountDetails.vpa }
        });
    } else if (accountDetails.payoutMethod === 'bank_account' && accountDetails.name && accountDetails.ifsc && accountDetails.account_number) {
        fundAccount = await razorpay.fundAccount.create({
            account_type: 'bank_account',
            contact_id: contactIdForFundAccount,
            bank_account: {
                name: accountDetails.name,
                ifsc: accountDetails.ifsc,
                account_number: accountDetails.account_number
            }
        });
    } else {
        throw new Error("Invalid payout method details provided.");
    }
    
    if(!fundAccount) {
        throw new Error("Failed to create fund account for the contact.")
    }

    // Associate the new Linked Account ID with the Contact
    await razorpay.contacts.edit(contactIdForFundAccount, {
        notes: {
            razorpay_linked_account_id: linkedAccount.id,
        },
    });


    return NextResponse.json({ 
        success: true, 
        linkedAccountId: linkedAccount.id,
        fundAccountId: fundAccount.id,
    });

  } catch (err: any) {
    console.error("Error in /api/payout/onboard:", err);
    return NextResponse.json({ error: err.error?.description || err.message || "Internal server error" }, { status: 500 });
  }
}
