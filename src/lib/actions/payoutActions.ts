'use server';

import { getAdminDb } from '../firebaseAdmin';
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

  legal_business_name: z.string(),
  business_type: z.enum([
    'proprietorship', 'partnership', 'private_limited', 'public_limited',
    'llp', 'trust', 'society', 'not_for_profit'
  ]),
  pan_number: z.string(),
  gst_number: z.string().optional(),
  phone: z.string(),
  street1: z.string(),
  street2: z.string().optional(),
  city: z.string(),
  state: z.string(),
  postal_code: z.string(),
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
      email: owner.email,
      contact: details.phone,
      type: 'vendor',
      reference_id: owner.id,
    });

    return { id: response.data.id, isNew: true };
  } catch (error: any) {
    console.error("Error creating Razorpay contact:", error.response?.data || error);
    throw new Error(`Contact creation failed: ${error.response?.data?.error?.description || error.message}`);
  }
}

async function createLinkedAccount(owner: User, details: z.infer<typeof payoutAccountSchema>) {
  if (owner.subscription?.razorpay_account_id) return { id: owner.subscription.razorpay_account_id, isNew: false };

  try {
    const response = await razorpayV2Api.post('/accounts', {
      email: owner.email,
      phone: details.phone,
      type: 'route',
      reference_id: owner.id,
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
    console.error("Error creating Razorpay Linked Account:", error.response?.data || error);
    throw new Error(`Linked Account creation failed: ${error.response?.data?.error?.description || error.message}`);
  }
}

async function createStakeholder(accountId: string, owner: User, details: z.infer<typeof payoutAccountSchema>) {
  try {
    await razorpayV2Api.post(`/accounts/${accountId}/stakeholders`, {
      name: owner.name,
      email: owner.email,
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
    if (
      error.response?.data?.error?.code === 'BAD_REQUEST_ERROR' &&
      error.response?.data?.error?.description.includes('already exists')
    ) {
      console.log("Stakeholder already exists for account:", accountId);
      return;
    }
    console.error("Error creating Razorpay Stakeholder:", error.response?.data || error);
    throw new Error(`Stakeholder creation failed: ${error.response?.data?.error?.description || error.message}`);
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
export async function addPayoutMethod(ownerId: string, accountDetails: z.infer<typeof payoutAccountSchema>) {
    const db = await getAdminDb();
    const ownerDocRef = db.collection('users').doc(ownerId);
  
    return db.runTransaction(async (transaction) => {
      const ownerDoc = await transaction.get(ownerDocRef);
      if (!ownerDoc.exists) throw new Error("Owner not found.");
      const owner = { id: ownerId, ...ownerDoc.data() } as User;
  console.log({owner})
      // 1. Create or get contact
      const { id: contactId } = await createOrGetContact(owner, accountDetails);
  
      // 2. Create linked account
      const { id: accountId } = await createLinkedAccount(owner, accountDetails);
  
      // 3. Create stakeholder
      await createStakeholder(accountId, owner, accountDetails);
  
      // 4. Create fund account
      const fundAccount = await createFundAccount(contactId, accountDetails);
  
      // Prevent duplicate payout methods
      const existingMethods = owner.subscription?.payoutMethods || [];
      if (existingMethods.some(m => m.razorpay_fund_account_id === fundAccount.id)) {
        throw new Error("Payout method already exists.");
      }
  
      const isPrimary = !existingMethods.some(m => m.isPrimary);
  
      const newMethod: PaymentMethod = {
        id: accountId,
        razorpay_fund_account_id: fundAccount.id,
        name: accountDetails.name || accountDetails.vpa!,
        isActive: fundAccount.active,
        isPrimary,
        createdAt: new Date().toISOString(),
        ...(accountDetails.payoutMethod === 'vpa'
          ? { type: 'vpa', vpaAddress: accountDetails.vpa! }
          : {
              type: 'bank_account',
              accountNumber: accountDetails.account_number!,
              accountNumberLast4: accountDetails.account_number!.slice(-4),
              ifscCode: accountDetails.ifsc!,
              accountHolderName: accountDetails.name!,
            }),
      };
  
      // ✅ All writes after reads
      transaction.update(ownerDocRef, {
        'subscription.razorpay_contact_id': contactId,
        'subscription.razorpay_account_id': accountId,
        'subscription.payoutMethods': FieldValue.arrayUnion(newMethod),
      });
  
      // Return updated object manually instead of reading again
      const updatedUser: User = {
        ...owner,
        subscription: {
          ...owner.subscription,
          razorpay_contact_id: contactId,
          razorpay_account_id: accountId,
          payoutMethods: [...existingMethods, newMethod],
        },
      };
  
      return { success: true, updatedUser };
    });
  }
  
// DELETE PAYOUT METHOD
export async function deletePayoutMethod({ ownerId, methodId }: { ownerId: string; methodId: string }) {
  const db = await getAdminDb();
  const ownerDocRef = db.collection('users').doc(ownerId);

  try {
    const ownerDoc = await ownerDocRef.get();
    if (!ownerDoc.exists) throw new Error("Owner not found.");
    const owner = ownerDoc.data() as User;

    const methods = owner.subscription?.payoutMethods || [];
    const methodToDeactivate = methods.find(m => m.razorpay_fund_account_id === methodId);

    if (methodToDeactivate?.razorpay_fund_account_id) {
      try {
        await razorpayV1Api.patch(`/fund_accounts/${methodToDeactivate.razorpay_fund_account_id}`, { active: false });
      } catch (err: any) {
        console.warn("Could not deactivate fund account on Razorpay:", err.response?.data || err);
      }
    }

    const updatedMethods = methods.filter(m => m.razorpay_fund_account_id !== methodId);
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
export async function setPrimaryPayoutMethod({ ownerId, methodId }: { ownerId: string; methodId: string }) {
  const db = await getAdminDb();
  const ownerDocRef = db.collection('users').doc(ownerId);

  try {
    const ownerDoc = await ownerDocRef.get();
    if (!ownerDoc.exists) throw new Error("Owner not found.");
    const owner = ownerDoc.data() as User;

    const updatedMethods = owner.subscription?.payoutMethods.map(m => ({
      ...m,
      isPrimary: m.razorpay_fund_account_id === methodId,
    })) || [];

    await ownerDocRef.update({ 'subscription.payoutMethods': updatedMethods });
    const updatedOwnerDoc = await ownerDocRef.get();
    return { success: true, updatedUser: updatedOwnerDoc.data() as User };
  } catch (error: any) {
    console.error("Error in setPrimaryPayoutMethod:", error);
    throw error;
  }
}
