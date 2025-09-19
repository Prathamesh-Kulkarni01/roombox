
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
  street1: z.string(),
  street2: z.string().optional(),
  city: z.string(),
  state: z.string(),
  postal_code: z.string(),
});

async function createOrGetRazorpayAccount(owner: User, details: z.infer<typeof payoutAccountSchema>): Promise<string> {
    const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      throw new Error("Server misconfiguration: Razorpay keys missing.");
    }
    
    if (owner.subscription?.razorpay_account_id) {
        return owner.subscription.razorpay_account_id;
    }

    const payload = {
        email: owner.email,
        phone: owner.phone,
        type: "route",
        reference_id: owner.id,
        legal_business_name: details.legal_business_name,
        business_type: details.business_type,
        contact_name: owner.name,
        profile: {
            category: "services",
            subcategory: "real_estate",
            addresses: {
                registered: {
                    street1: details.street1,
                    street2: details.street2,
                    city: details.city,
                    state: details.state,
                    postal_code: details.postal_code,
                    country: "IN"
                }
            }
        },
        legal_info: {
            pan: details.pan_number,
            gst: details.gst_number,
        }
    };

    try {
        const response = await axios.post('https://api.razorpay.com/v2/accounts', payload, {
            auth: { username: RAZORPAY_KEY_ID, password: RAZORPAY_KEY_SECRET },
        });
        const accountId = response.data.id;
        
        await getAdminDb().collection('users').doc(owner.id).update({
            'subscription.razorpay_account_id': accountId
        });

        return accountId;
    } catch (error: any) {
        console.error("Failed to create Razorpay v2 account:", error.response?.data);
        throw new Error(`Account creation failed: ${error.response?.data?.error?.description}`);
    }
}

async function createFundAccount(accountId: string, accountDetails: z.infer<typeof payoutAccountSchema>) {
    const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      throw new Error("Server misconfiguration: Razorpay keys missing.");
    }
    
    const isVpa = accountDetails.payoutMethod === 'vpa';

    const payload: any = {
      account_type: isVpa ? 'vpa' : 'bank_account',
      ...(isVpa ? 
        { vpa: { address: accountDetails.vpa } } : 
        { bank_account: { name: accountDetails.name, ifsc: accountDetails.ifsc, account_number: accountDetails.account_number } }
      ),
      contact: {
        name: accountDetails.name || accountDetails.legal_business_name
      }
    };

    try {
        const url = `https://api.razorpay.com/v1/accounts/${accountId}/fund_accounts`;
        const response = await axios.post(url, payload, {
             auth: { username: RAZORPAY_KEY_ID, password: RAZORPAY_KEY_SECRET }
        });
        return response.data;
    } catch (error: any) {
        console.error("Failed to create Razorpay fund account:", error.response?.data);
        throw new Error(`Could not link payout account. Reason: ${error.response?.data?.error?.description || 'Unknown error'}`);
    }
}

export async function addPayoutMethod(ownerId: string, accountDetails: z.infer<typeof payoutAccountSchema>) {
    const adminDb = await getAdminDb();
    const ownerDocRef = adminDb.collection('users').doc(ownerId);
    
    try {
        const ownerDoc = await ownerDocRef.get();
        if (!ownerDoc.exists) throw new Error("Owner not found.");
        const owner = ownerDoc.data() as User;
        
        const accountId = await createOrGetRazorpayAccount(owner, accountDetails);
        const fundAccount = await createFundAccount(accountId, accountDetails);
        
        const newMethod: PaymentMethod = {
          id: accountId,
          razorpay_fund_account_id: fundAccount.id,
          name: accountDetails.name || accountDetails.vpa!,
          isActive: true,
          isPrimary: !(owner.subscription?.payoutMethods?.some(m => m.isPrimary)),
          createdAt: new Date().toISOString(),
          onboardingError: null,
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
        throw error;
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
                 await axios.patch(
                    `https://api.razorpay.com/v1/fund_accounts/${methodToDeactivate.razorpay_fund_account_id}`,
                    { active: false },
                    { auth: { username: process.env.RAZORPAY_KEY_ID!, password: process.env.RAZORPAY_KEY_SECRET! } }
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
