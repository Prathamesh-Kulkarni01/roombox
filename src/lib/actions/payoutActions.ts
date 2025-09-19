
'use server'

import { getAdminDb } from '../firebaseAdmin';
import { z } from 'zod';
import type { User, PaymentMethod } from '../types';
import { produce } from 'immer';
import { FieldValue } from 'firebase-admin/firestore';
import axios from 'axios';

const payoutAccountSchema = z.object({
  payoutMethod: z.enum(['bank_account', 'vpa']),
  name: z.string().optional(),
  account_number: z.string().optional(),
  ifsc: z.string().optional(),
  vpa: z.string().optional(),
  
  // KYC fields for sub-merchant account creation
  legal_business_name: z.string(),
  business_type: z.enum(['proprietorship', 'partnership', 'private_limited', 'public_limited', 'llp', 'trust', 'society', 'not_for_profit']),
  pan_number: z.string(),
  gst_number: z.string().optional(),
  phone: z.string(),
  street1: z.string(),
  street2: z.string().optional(),
  city: z.string(),
  state: z.string(),
  postal_code: z.string(),
});


const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;
if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
  console.error("CRITICAL: Razorpay keys are missing in environment variables.");
}

const razorpayV1Api = axios.create({
    baseURL: 'https://api.razorpay.com/v1',
     auth: {
        username: RAZORPAY_KEY_ID!,
        password: RAZORPAY_KEY_SECRET!,
    }
});

const razorpayV2Api = axios.create({
    baseURL: 'https://api.razorpay.com/v2',
     auth: {
        username: RAZORPAY_KEY_ID!,
        password: RAZORPAY_KEY_SECRET!,
    }
});

async function createOrGetContact(owner: User, details: z.infer<typeof payoutAccountSchema>) {
    if (owner.subscription?.razorpay_contact_id) {
        return { id: owner.subscription.razorpay_contact_id, isNew: false };
    }
    
    try {
        const response = await razorpayV1Api.post('/contacts', {
            name: owner.name,
            email: owner.email,
            contact: details.phone,
            type: 'vendor',
            reference_id: owner.id,
        });
        
        await getAdminDb().collection('users').doc(owner.id).update({
            'subscription.razorpay_contact_id': response.data.id
        });

        return { id: response.data.id, isNew: true };
    } catch(error: any) {
        console.error("Error creating Razorpay contact:", error.response?.data);
        throw new Error(`Contact creation failed: ${error.response?.data?.error?.description}`);
    }
}

async function createLinkedAccount(owner: User, details: z.infer<typeof payoutAccountSchema>) {
    if (owner.subscription?.razorpay_account_id) {
        return { id: owner.subscription.razorpay_account_id, isNew: false };
    }

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
                category: "services",
                subcategory: "renting_and_leasing",
                addresses: {
                    registered: {
                        street1: details.street1,
                        street2: details.street2 || undefined,
                        city: details.city,
                        state: details.state,
                        postal_code: details.postal_code,
                        country: "IN"
                    }
                }
            },
            legal_info: {
                pan: details.pan_number,
                gst: details.gst_number || undefined,
            }
        });

        await getAdminDb().collection('users').doc(owner.id).update({
            'subscription.razorpay_account_id': response.data.id
        });
        
        return { id: response.data.id, isNew: true };
    } catch(error: any) {
        console.error("Error creating Razorpay Linked Account:", error.response?.data);
        throw new Error(`Linked Account creation failed: ${error.response?.data?.error?.description}`);
    }
}

async function createStakeholder(accountId: string, details: z.infer<typeof payoutAccountSchema>) {
    try {
        await razorpayV2Api.post(`/accounts/${accountId}/stakeholders`, {
            name: details.legal_business_name,
            email: details.email,
            phone: {
                primary: details.phone,
            },
             relationship: {
                director: true,
                executive: true
            },
            percentage_ownership: 100,
            addresses: {
                residential: {
                    street: details.street1,
                    city: details.city,
                    state: details.state,
                    postal_code: details.postal_code,
                    country: 'IN',
                }
            },
            kyc: {
                pan: details.pan_number
            }
        });
    } catch (error: any) {
        // Stakeholder might already exist, which is not always an error
        if (error.response?.data?.error?.code === 'BAD_REQUEST_ERROR' && error.response?.data?.error?.description.includes('already exists')) {
            console.log("Stakeholder already exists for account:", accountId);
            return;
        }
        console.error("Error creating Razorpay Stakeholder:", error.response?.data);
        throw new Error(`Stakeholder creation failed: ${error.response?.data?.error?.description}`);
    }
}

async function createFundAccount(accountId: string, accountDetails: z.infer<typeof payoutAccountSchema>) {
    const isVpa = accountDetails.payoutMethod === 'vpa';
    const payload: any = {
      account_type: isVpa ? 'vpa' : 'bank_account',
      ...(isVpa ? 
        { vpa: { address: accountDetails.vpa } } : 
        { bank_account: { name: accountDetails.name, ifsc: accountDetails.ifsc, account_number: accountDetails.account_number } }
      )
    };

    try {
        const response = await razorpayV2Api.post(`/accounts/${accountId}/fund_accounts`, payload);
        return response.data;
    } catch (error: any) {
        console.error("Error creating Razorpay Fund Account:", error.response?.data);
        throw new Error(`Fund Account creation failed: ${error.response?.data?.error?.description}`);
    }
}

export async function addPayoutMethod(ownerId: string, accountDetails: z.infer<typeof payoutAccountSchema>) {
    const adminDb = await getAdminDb();
    const ownerDocRef = adminDb.collection('users').doc(ownerId);
    
    try {
        const ownerDoc = await ownerDocRef.get();
        if (!ownerDoc.exists) throw new Error("Owner not found.");
        const owner = { id: ownerId, ...ownerDoc.data() } as User;

        const { id: contactId } = await createOrGetContact(owner, accountDetails);
        const { id: accountId } = await createLinkedAccount(owner, accountDetails);
        await createStakeholder(accountId, accountDetails);
        const fundAccount = await createFundAccount(accountId, accountDetails);
        
        const newMethod: PaymentMethod = {
          id: accountId, // Use Razorpay Account ID as our internal reference now
          razorpay_fund_account_id: fundAccount.id,
          name: accountDetails.name || accountDetails.vpa!,
          isActive: fundAccount.active,
          isPrimary: !(owner.subscription?.payoutMethods?.some(m => m.isPrimary)),
          createdAt: new Date().toISOString(),
          ...(accountDetails.payoutMethod === 'vpa' ? { 
              type: 'vpa' as 'vpa', vpaAddress: accountDetails.vpa! 
            } : {
              type: 'bank_account' as 'bank_account', accountNumber: accountDetails.account_number!, accountNumberLast4: accountDetails.account_number!.slice(-4), ifscCode: accountDetails.ifsc!, accountHolderName: accountDetails.name!,
          }),
        };
        
        await ownerDocRef.update({ 'subscription.payoutMethods': FieldValue.arrayUnion(newMethod) });
        
        const updatedOwnerDoc = await ownerDocRef.get();
        return { success: true, updatedUser: updatedOwnerDoc.data() as User };

    } catch (error: any) {
        console.error("Error in addPayoutMethod flow:", error.message);
        throw error; // Re-throw for client-side handling
    }
}


export async function deletePayoutMethod({ ownerId, methodId }: { ownerId: string; methodId: string }) {
    const adminDb = await getAdminDb();
    const ownerDocRef = adminDb.collection('users').doc(ownerId);
    
    try {
        const ownerDoc = await ownerDocRef.get();
        if (!ownerDoc.exists) throw new Error("Owner not found.");
        
        const owner = ownerDoc.data() as User;
        let methods = owner.subscription?.payoutMethods || [];
        const methodToDeactivate = methods.find(m => m.razorpay_fund_account_id === methodId);

        if (methodToDeactivate?.razorpay_fund_account_id) { 
            try {
                 await razorpayV1Api.patch(
                    `/fund_accounts/${methodToDeactivate.razorpay_fund_account_id}`,
                    { active: false }
                 );
            } catch (razorpayError: any) {
                console.warn("Could not deactivate fund account on Razorpay, may already be inactive:", razorpayError.response?.data);
            }
        }
        
        const updatedMethods = methods.filter(m => m.razorpay_fund_account_id !== methodId);
        
        if (methods.find(m => m.razorpay_fund_account_id === methodId)?.isPrimary && updatedMethods.length > 0) {
            updatedMethods[0].isPrimary = true;
        }
        
        await ownerDocRef.update({ 'subscription.payoutMethods': updatedMethods });
        
        const updatedDoc = await ownerDocRef.get();
        return { success: true, updatedUser: updatedDoc.data() as User };
    } catch(error: any) {
        console.error("Error in deletePayoutMethod", error);
        throw error;
    }
}

export async function setPrimaryPayoutMethod({ ownerId, methodId }: { ownerId: string; methodId: string }) {
    const adminDb = await getAdminDb();
    const ownerDocRef = adminDb.collection('users').doc(ownerId);

    try {
        const ownerDoc = await ownerDocRef.get();
        if (!ownerDoc.exists) throw new Error("Owner not found.");

        const owner = ownerDoc.data() as User;
        const methods = owner.subscription?.payoutMethods || [];
        
        const updatedMethods = methods.map(m => ({
            ...m,
            isPrimary: m.razorpay_fund_account_id === methodId,
        }));

        await ownerDocRef.update({ 'subscription.payoutMethods': updatedMethods });

        const updatedOwnerDoc = await ownerDocRef.get();
        return { success: true, updatedUser: updatedOwnerDoc.data() as User };
    } catch(error: any) {
        console.error("Error in setPrimaryPayoutMethod", error);
        throw error;
    }
}

    