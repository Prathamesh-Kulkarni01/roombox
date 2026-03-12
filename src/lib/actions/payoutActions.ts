'use server';

import { getAdminDb } from '../firebaseAdmin';
import { db } from "../firebase";
import { getVerifiedOwnerId } from "../auth-server";
import { z } from 'zod';
import type { User, PaymentMethod } from '../types';
import { FieldValue, Firestore } from 'firebase-admin/firestore';
import axios from 'axios';

// ----------------- SCHEMA -----------------
const payoutAccountSchema = z.object({
  payoutMethod: z.enum(['bank_account', 'vpa']),
  name: z.string().optional(),
  account_number: z.string().optional(),
  ifsc: z.string().optional(),
  vpa: z.string().optional(),

  legal_business_name: z.string().optional(),
  business_type: z.enum([
    'proprietorship', 'partnership', 'private_limited', 'public_limited',
    'llp', 'trust', 'society', 'not_for_profit'
  ]).optional(),
  pan_number: z.string().optional(),
  gst_number: z.string().optional(),
  email: z.string().email(),
  phone: z.string(),
  street1: z.string().optional(),
  street2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
}).refine(data => 
  data.payoutMethod === 'vpa' 
    ? !!data.vpa 
    : !!(data.name && data.account_number && data.ifsc), {
  message: "Required payout fields are missing for selected payout method"
});

// ----------------- RAZORPAY CONFIG -----------------
const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;
if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
  throw new Error("CRITICAL: Razorpay keys are missing in environment variables.");
}

const razorpayV1Api = axios.create({
  baseURL: 'https://api.razorpay.com/v1',
  auth: { username: RAZORPAY_KEY_ID!, password: RAZORPAY_KEY_SECRET! },
});

const razorpayV2Api = axios.create({
  baseURL: 'https://api.razorpay.com/v2',
  auth: { username: RAZORPAY_KEY_ID!, password: RAZORPAY_KEY_SECRET! },
});

// ----------------- RAZORPAY FUNCTIONS -----------------
async function createOrGetContact(owner: User, details: z.infer<typeof payoutAccountSchema>) {
  if (owner.subscription?.razorpay_contact_id) return { id: owner.subscription.razorpay_contact_id, isNew: false };

  try {
    const response = await razorpayV1Api.post('/contacts', {
      name: owner.name,
      email: details.email,
      contact: details.phone,
      type: 'vendor',
      reference_id: `cont_${owner.id.slice(0, 15)}_${Date.now().toString().slice(-6)}`,
    });

    return { id: response.data.id, isNew: true };
  } catch (error: any) {
    const errorDescription = error.response?.data?.error?.description || "";
    
    // Recovery logic if contact already exists
    if (errorDescription.includes("already exists")) {
      try {
        // Attempt to extract contact ID from description if present
        // Format example: "The contact already exists with the same email - cont_XXXX"
        const idMatch = errorDescription.match(/cont_[a-zA-Z0-9]+/);
        if (idMatch) {
          console.log("Extracted contact ID from error message:", idMatch[0]);
          return { id: idMatch[0], isNew: false };
        }

        console.log("Contact email already exists. Attempting to recover contact for:", owner.email);
        const listResponse = await razorpayV1Api.get('/contacts', { params: { count: 100 } });
        const existingContact = listResponse.data.items?.find((cont: any) => 
          cont.email?.toLowerCase() === details.email?.toLowerCase() ||
          cont.reference_id === `cont_${owner.id.slice(0, 15)}_${Date.now().toString().slice(-6)}`
        );

        if (existingContact) {
          console.log("Recovered existing Razorpay contact:", existingContact.id);
          return { id: existingContact.id, isNew: false };
        }
      } catch (listError: any) {
        console.error("Failed to recover contact via listing:", listError.response?.data || listError);
      }
    }

    console.error("Error creating Razorpay contact:", error.response?.data || error);
    throw new Error(`Contact creation failed: ${errorDescription || error.message}`);
  }
}

async function createLinkedAccount(owner: User, details: z.infer<typeof payoutAccountSchema>) {
  if (owner.subscription?.razorpay_account_id) return { id: owner.subscription.razorpay_account_id, isNew: false };

  try {
    const response = await razorpayV2Api.post('/accounts', {
      email: details.email,
      phone: details.phone,
      type: 'route',
      reference_id: `acc_${owner.id.slice(0, 15)}_${Date.now().toString().slice(-6)}`,
      legal_business_name: details.legal_business_name,
      business_type: details.business_type,
      contact_name: owner.name,
      profile: {
        category: "housing",
        subcategory: "facility_management",
        addresses: {
          registered: {
            street1: details.street1,
            street2: details.street2 || undefined,
            city: details.city,
            state: details.state,
            postal_code: details.postal_code,
            country: "IN",
          },
        },
      },
    });

    return { id: response.data.id, isNew: true };
  } catch (error: any) {
    const errorDescription = error.response?.data?.error?.description || "";
    
    // Handle "merchant email already exist" by attempting to find the account in the merchant's linked accounts list
    if (errorDescription.includes("email already exist")) {
      try {
        console.log("Merchant email already exists. Fetching linked accounts for verification...");
        const listResponse = await razorpayV2Api.get('/accounts', { params: { count: 100 } });
        const linkedAccounts = listResponse.data.items || [];
        
        // 1. Try to find by email in the actual linked accounts list
        const existingAccount = linkedAccounts.find((acc: any) => 
          acc.email?.toLowerCase() === details.email?.toLowerCase()
        );

        if (existingAccount) {
          console.log("Recovered valid linked account from list:", existingAccount.id);
          return { id: existingAccount.id, isNew: false };
        }

        // 2. If not in list, check if we can extract an ID from the error message for explanation
        const idMatch = errorDescription.match(/account - ([a-zA-Z0-9]+)/);
        if (idMatch && idMatch[1]) {
          const extractedId = idMatch[1].startsWith("acc_") ? idMatch[1] : `acc_${idMatch[1]}`;
          
          // Verify if this extracted ID is in our linked accounts list
          const isInList = linkedAccounts.some((acc: any) => acc.id === extractedId);
          
          if (!isInList) {
            console.error(`[CRITICAL] Extracted ID ${extractedId} is NOT in the merchant's linked accounts list. It likely belongs to the master account.`);
            throw new Error(`The email "${details.email}" is already used by your main Razorpay account or an external account. Please use a different email for this PG Owner payout profile.`);
          }

          console.log("Extracted ID verified in linked accounts list:", extractedId);
          return { id: extractedId, isNew: false };
        }

        // 3. Fallback: If email exists but nowhere in our accessible linked accounts
        throw new Error(`The email "${details.email}" is already associated with a Razorpay account that cannot be accessed as a linked account. Please use a unique email for payouts.`);
      } catch (listError: any) {
        if (listError.message.includes("use a different email") || listError.message.includes("unique email")) throw listError;
        console.error("Failed to recover or verify account via listing:", listError.response?.data || listError);
      }
    }

    console.error("Error creating Razorpay Linked Account:", error.response?.data || error);
    throw new Error(`Linked Account creation failed: ${errorDescription || error.message}`);
  }
}

async function createStakeholder(accountId: string, owner: User, details: z.infer<typeof payoutAccountSchema>) {
  try {
    await razorpayV2Api.post(`/accounts/${accountId}/stakeholders`, {
      name: owner.name,
      email: details.email,
      phone: { primary: details.phone },
      relationship: { director: true, executive: true },
      percentage_ownership: 100,
      addresses: {
        residential: {
          street: details.street1,
          city: details.city,
          state: details.state,
          postal_code: details.postal_code,
          country: 'IN',
        },
      },
    });
  } catch (error: any) {
    const errorCode = error.response?.data?.error?.code;
    const errorDescription = error.response?.data?.error?.description || "";

    if (
      (errorCode === 'BAD_REQUEST_ERROR' && errorDescription.includes('already exists')) ||
      errorDescription === 'Access Denied'
    ) {
      console.log(`Stakeholder creation skipped for account ${accountId}: ${errorDescription}`);
      return;
    }
    console.error("Error creating Razorpay Stakeholder:", error.response?.data || error);
    throw new Error(`Stakeholder creation failed: ${errorDescription || error.message}`);
  }
}

async function createFundAccount(contactId: string, details: z.infer<typeof payoutAccountSchema>) {
  const isVpa = details.payoutMethod === 'vpa';
  const payload: any = {
    account_type: isVpa ? 'vpa' : 'bank_account',
    contact_id: contactId,
    ...(isVpa
      ? { vpa: { address: details.vpa } }
      : { bank_account: { name: details.name, ifsc: details.ifsc, account_number: details.account_number } }),
  };

  try {
    const response = await razorpayV1Api.post('/fund_accounts', payload);
    return response.data;
  } catch (error: any) {
    console.error("Error creating Razorpay Fund Account:", error.response?.data || error);
    throw new Error(`Fund Account creation failed: ${error.response?.data?.error?.description || error.message}`);
  }
}

// ----------------- FIRESTORE TRANSACTION FLOW -----------------
export async function addPayoutMethod(data: z.infer<typeof payoutAccountSchema>, token?: string) {
  try {
    const { ownerId, error } = await getVerifiedOwnerId(undefined, token);
    if (!ownerId) throw new Error(error || "Unauthorized");

    const db = await getAdminDb();
    const ownerDocRef = db.collection('users').doc(ownerId);
  
    return db.runTransaction(async (transaction) => {
      const ownerDoc = await transaction.get(ownerDocRef);
      if (!ownerDoc.exists) throw new Error("Owner not found.");
      const { id: _, ...ownerData } = ownerDoc.data() as User;
      const owner = { id: ownerId, ...ownerData } as User;
      const payoutMode = owner.subscription?.payoutMode || 'PAYOUT';
  
      // 1. Create or get contact (Mandatory for both modes)
      const { id: contactId } = await createOrGetContact(owner, data);
  
      // 2. Conditional: Marketplace/Route Account Setup
      let accountId: string | undefined = owner.subscription?.razorpay_account_id;
      if (payoutMode === 'ROUTE') {
        // Business details are mandatory for Marketplace mode
        if (!data.legal_business_name || !data.pan_number || !data.street1 || !data.city || !data.state || !data.postal_code) {
          throw new Error("Business details (PAN, Address, Legal Name) are required for Marketplace mode.");
        }
        
        // Ensure account creation and stakeholder setup if needed
        const result = await createLinkedAccount(owner, data);
        accountId = result.id;
        if (result.isNew) {
          await createStakeholder(accountId!, owner, data); // Explicitly non-null
        }
      }
  
      // 3. Create fund account (linked to contact)
      const fundAccount = await createFundAccount(contactId, data);
  
      // Prevent duplicate payout methods
      const existingMethods = owner.subscription?.payoutMethods || [];
      if (existingMethods.some(m => m.razorpay_fund_account_id === fundAccount.id)) {
        throw new Error("Payout method already exists.");
      }
  
      const isPrimary = !existingMethods.some(m => m.isPrimary);
  
      const newMethod: PaymentMethod = {
        id: fundAccount.id,
        razorpay_fund_account_id: fundAccount.id,
        name: data.name || data.vpa!,
        isActive: fundAccount.active,
        isPrimary,
        createdAt: new Date().toISOString(),
        ...(data.payoutMethod === 'vpa'
          ? { type: 'upi', vpaAddress: data.vpa! }
          : {
              type: 'bank_account',
              accountNumber: data.account_number!,
              accountNumberLast4: data.account_number!.slice(-4),
              ifscCode: data.ifsc!,
              accountHolderName: data.name!,
            }),
      } as PaymentMethod;
  
      // ✅ All writes after reads
      transaction.update(ownerDocRef, {
        'subscription.razorpay_contact_id': contactId,
        'subscription.razorpay_account_id': accountId || FieldValue.delete(), 
        'subscription.payoutMethods': FieldValue.arrayUnion(newMethod),
      });
  
      // Return updated object manually instead of reading again
      const updatedUser: User = {
        ...owner,
        subscription: {
          ...owner.subscription!,
          razorpay_contact_id: contactId,
          razorpay_account_id: accountId, 
          payoutMethods: [...existingMethods, newMethod],
          planId: owner.subscription?.planId || 'free',
          status: owner.subscription?.status || 'active',
        },
      };
  
      return { success: true, updatedUser };
    });
  } catch (error: any) {
    console.error("Error in addPayoutMethod:", error);
    throw error;
  }
}
  
// DELETE PAYOUT METHOD
export async function deletePayoutMethod(payoutId: string, token?: string) {
  try {
    const { ownerId, error } = await getVerifiedOwnerId(undefined, token);
    if (!ownerId) throw new Error(error || "Unauthorized");

    const db = await getAdminDb();
    const ownerDocRef = db.collection('users').doc(ownerId);

    const ownerDoc = await ownerDocRef.get();
    if (!ownerDoc.exists) throw new Error("Owner not found.");
    const owner = ownerDoc.data() as User;

    const methods = owner.subscription?.payoutMethods || [];
    const methodToDeactivate = methods.find(m => m.razorpay_fund_account_id === payoutId);

    if (methodToDeactivate?.razorpay_fund_account_id) {
      try {
        await razorpayV1Api.patch(`/fund_accounts/${methodToDeactivate.razorpay_fund_account_id}`, { active: false });
      } catch (err: any) {
        console.warn("Could not deactivate fund account on Razorpay:", err.response?.data || err);
      }
    }

    const updatedMethods = methods.filter(m => m.razorpay_fund_account_id !== payoutId);
    if (methodToDeactivate?.isPrimary && updatedMethods.length > 0) updatedMethods[0].isPrimary = true;

    await ownerDocRef.update({ 'subscription.payoutMethods': updatedMethods });
    const updatedDoc = await ownerDocRef.get();
    return { success: true, updatedUser: updatedDoc.data() as User };
  } catch (error: any) {
    console.error("Error in deletePayoutMethod:", error);
    throw error;
  }
}

// SET PRIMARY PAYOUT METHOD
export async function setPrimaryPayoutMethod(payoutId: string, token?: string) {
  try {
    const { ownerId, error } = await getVerifiedOwnerId(undefined, token);
    if (!ownerId) throw new Error(error || "Unauthorized");

    const db = await getAdminDb();
    const ownerDocRef = db.collection('users').doc(ownerId);

    const ownerDoc = await ownerDocRef.get();
    if (!ownerDoc.exists) throw new Error("Owner not found.");
    const owner = ownerDoc.data() as User;

    const updatedMethods = owner.subscription?.payoutMethods?.map(m => ({
      ...m,
      isPrimary: m.razorpay_fund_account_id === payoutId,
    })) || [];

    await ownerDocRef.update({ 'subscription.payoutMethods': updatedMethods });
    const updatedOwnerDoc = await ownerDocRef.get();
    return { success: true, updatedUser: updatedOwnerDoc.data() as User };
  } catch (error: any) {
    console.error("Error in setPrimaryPayoutMethod:", error);
    throw error;
  }
}

// RESET RAZORPAY ACCOUNT LINKING
export async function resetRazorpayAccount(token?: string) {
  try {
    const { ownerId, error } = await getVerifiedOwnerId(undefined, token);
    if (!ownerId) throw new Error(error || "Unauthorized");

    const db = await getAdminDb();
    const ownerDocRef = db.collection('users').doc(ownerId);

    await ownerDocRef.update({
      'subscription.razorpay_account_id': null,
      'subscription.razorpay_contact_id': null,
      'subscription.payoutMethods': [],
      'subscription.kycDetails': null,
      'subscription.payoutMode': 'PAYOUT', // Reset to default
    });

    const updatedOwnerDoc = await ownerDocRef.get();
    return { success: true, updatedUser: updatedOwnerDoc.data() as User };
  } catch (error: any) {
    console.error("Error in resetRazorpayAccount:", error);
    throw error;
  }
}

// UPDATE PAYOUT MODE
export async function updatePayoutMode(mode: 'PAYOUT' | 'ROUTE', token?: string) {
  try {
    const { ownerId, error } = await getVerifiedOwnerId(undefined, token);
    if (!ownerId) throw new Error(error || "Unauthorized");

    const db = await getAdminDb();
    const ownerDocRef = db.collection('users').doc(ownerId);

    await ownerDocRef.update({
      'subscription.payoutMode': mode,
    });

    const updatedOwnerDoc = await ownerDocRef.get();
    return { success: true, updatedUser: updatedOwnerDoc.data() as User };
  } catch (error: any) {
    console.error("Error in updatePayoutMode:", error);
    throw error;
  }
}
// EXECUTE PAYOUT (Internal use for webhooks/automated flows)
export async function executePayout(params: {
  fund_account_id: string;
  amountPaise: number;
  idempotencyKey?: string; // Extremely important for preventing double payouts on retries
  purpose?: string;
  mode?: 'UPI' | 'IMPS' | 'NEFT' | 'RTGS';
  notes?: Record<string, string>;
}) {
  const { RAZORPAY_ACCOUNT_NUMBER } = process.env;
  
  if (!RAZORPAY_ACCOUNT_NUMBER) {
    throw new Error("RAZORPAY_ACCOUNT_NUMBER is not configured for master payouts.");
  }

  try {
    console.log(`[Payout: Execute] Requesting payout:`, {
      fund_account_id: params.fund_account_id,
      amount: params.amountPaise / 100,
      mode: params.mode || 'UPI',
      reference_id: params.idempotencyKey
    });

    const response = await razorpayV1Api.post('/payouts', {
      account_number: RAZORPAY_ACCOUNT_NUMBER,
      fund_account_id: params.fund_account_id,
      amount: params.amountPaise,
      currency: 'INR',
      mode: params.mode || 'UPI',
      purpose: params.purpose || 'payout',
      queue_if_low_balance: true,
      reference_id: params.idempotencyKey, // Match with idempotency key for easier lookup
      notes: params.notes,
    }, {
      headers: params.idempotencyKey ? {
        'X-Payout-Idempotency': params.idempotencyKey
      } : {}
    });

    console.log(`[Payout: Execute] SUCCESS: Payout ID: ${response.data.id}, Status: ${response.data.status}`);
    return { success: true, payout: response.data };
  } catch (error: any) {
    const errorData = error.response?.data || error.message;
    console.error(`[Payout: Execute] FAILED:`, JSON.stringify(errorData, null, 2));
    throw new Error(`Payout execution failed: ${error.response?.data?.error?.description || error.message}`);
  }
}

// FETCH PAYOUT STATUS (To verify before refunds)
export async function fetchPayoutStatus(payoutId: string) {
  try {
    const response = await razorpayV1Api.get(`/payouts/${payoutId}`);
    return response.data;
  } catch (error: any) {
    console.error(`Error fetching payout status for ${payoutId}:`, error.response?.data || error.message);
    throw error;
  }
}
// FETCH PAYOUT BY REFERENCE ID (To recover after timeouts)
export async function fetchPayoutByReference(referenceId: string) {
  try {
    const response = await razorpayV1Api.get(`/payouts`, { params: { reference_id: referenceId } });
    // Returns { entity: "collection", count: X, items: [...] }
    return response.data.items?.[0] || null;
  } catch (error: any) {
    console.error(`Error fetching payout by reference ${referenceId}:`, error.response?.data || error.message);
    throw error;
  }
}
