
'use server'

import { getAdminDb } from '../firebaseAdmin';
import { z } from 'zod';
import type { User, PaymentMethod, BankPaymentMethod, UpiPaymentMethod, PaymentMethodValidationResult } from '../types';
import { produce } from 'immer';
import { FieldValue } from 'firebase-admin/firestore';
import axios from 'axios';

const payoutAccountSchema = z.object({
  payoutMethod: z.enum(['bank_account', 'vpa']),
  name: z.string().optional(),
  account_number: z.string().min(5, "Account number is required.").regex(/^\d+$/, "Account number must contain only digits.").optional(),
  ifsc: z.string().length(11, "IFSC code must be 11 characters.").regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC code format.").optional(),
  vpa: z.string().regex(/^[\w.-]+@[\w.-]+$/, "Invalid UPI ID format.").optional(),
  // KYC fields for stakeholder creation
  legal_business_name: z.string(),
  pan_number: z.string(),
  dob: z.string(),
});

async function validateVPA(vpa: string): Promise<PaymentMethodValidationResult> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.URL || 'http://localhost:9002';
    try {
        const response = await fetch(`${appUrl}/api/validate-vpa`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vpa })
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
            return { isValid: false, error: result.error || 'Server error during VPA validation.' };
        }
        if (!result.valid) {
            return { isValid: false, error: result.reason || 'This UPI ID is not valid.' };
        }
        return { isValid: true };
    } catch (e: any) {
        return { isValid: false, error: e.message || 'Network error during VPA validation.' };
    }
}

async function createOrGetContact(owner: User): Promise<{ id: string }> {
    if (owner.subscription?.razorpay_contact_id) {
        try {
            const response = await axios.get(`https://api.razorpay.com/v1/contacts/${owner.subscription.razorpay_contact_id}`, {
                auth: { username: process.env.RAZORPAY_KEY_ID!, password: process.env.RAZORPAY_KEY_SECRET! },
            });
            return { id: response.data.id };
        } catch (error) { /* Contact not found on Razorpay, proceed to create */ }
    }
    try {
        const response = await axios.post('https://api.razorpay.com/v1/contacts', {
            name: owner.name, email: owner.email!, type: 'vendor', reference_id: owner.id,
        }, {
            auth: { username: process.env.RAZORPAY_KEY_ID!, password: process.env.RAZORPAY_KEY_SECRET! }
        });
        await getAdminDb().collection('users').doc(owner.id).update({ 'subscription.razorpay_contact_id': response.data.id });
        return { id: response.data.id };
    } catch (error: any) {
        console.error("Failed to create Razorpay contact:", error.response?.data);
        throw new Error('Step 1 Failed: Could not create a contact on the payment gateway.');
    }
}

async function createLinkedAccount(contactId: string, owner: User): Promise<{ id: string }> {
    try {
        const response = await axios.post('https://api.razorpay.com/v1/linked_accounts', {
            contact_id: contactId,
            account_type: 'customer',
            email: owner.email,
            name: owner.name,
        }, {
            auth: { username: process.env.RAZORPAY_KEY_ID!, password: process.env.RAZORPAY_KEY_SECRET! }
        });
        return { id: response.data.id };
    } catch (error: any) {
        console.error("Failed to create Razorpay linked account:", error.response?.data);
        throw new Error('Step 2 Failed: Could not create a linked account.');
    }
}

async function createStakeholder(linkedAccountId: string, kycDetails: { pan_number: string, legal_business_name: string, dob: string }): Promise<void> {
    try {
        await axios.post(`https://api.razorpay.com/v1/linked_accounts/${linkedAccountId}/stakeholders`, {
            name: kycDetails.legal_business_name,
            kyc: { pan: kycDetails.pan_number },
        }, {
            auth: { username: process.env.RAZORPAY_KEY_ID!, password: process.env.RAZORPAY_KEY_SECRET! }
        });
    } catch (error: any) {
        console.error("Failed to create Razorpay stakeholder:", error.response?.data);
        throw new Error(`Step 3 Failed: Stakeholder creation failed. Reason: ${error.response?.data?.error?.description}`);
    }
}

async function createFundAccount(linkedAccountId: string, accountDetails: z.infer<typeof payoutAccountSchema>) {
    try {
        const fundAccountPayload: any = {
            account_type: accountDetails.payoutMethod,
            ...(accountDetails.payoutMethod === 'vpa' && { vpa: { address: accountDetails.vpa! } }),
            ...(accountDetails.payoutMethod === 'bank_account' && {
                bank_account: {
                    name: accountDetails.name!, ifsc: accountDetails.ifsc!, account_number: accountDetails.account_number!,
                }
            })
        };
        const response = await axios.post(`https://api.razorpay.com/v1/linked_accounts/${linkedAccountId}/fund_accounts`, fundAccountPayload, {
             auth: { username: process.env.RAZORPAY_KEY_ID!, password: process.env.RAZORPAY_KEY_SECRET! }
        });
        return response.data;
    } catch (error: any) {
        console.error("Failed to create Razorpay fund account:", error.response?.data);
        throw new Error(`Step 4 Failed: Could not link payout account. Reason: ${error.response?.data?.error?.description}`);
    }
}

export async function addPayoutMethod(ownerId: string, accountDetails: z.infer<typeof payoutAccountSchema>): Promise<{ success: boolean; updatedUser: User }> {
    const adminDb = await getAdminDb();
    const ownerDocRef = adminDb.collection('users').doc(ownerId);
    let currentMethodForErrorHandling: Partial<PaymentMethod> = { onboardingError: 'contact' };

    try {
        const ownerDoc = await ownerDocRef.get();
        if (!ownerDoc.exists) throw new Error("Owner not found.");
        const owner = ownerDoc.data() as User;

        if (accountDetails.payoutMethod === 'vpa' && accountDetails.vpa) {
            const vpaValidation = await validateVPA(accountDetails.vpa);
            if (!vpaValidation.isValid) throw new Error(vpaValidation.error);
        }

        const contact = await createOrGetContact(owner);
        currentMethodForErrorHandling.onboardingError = 'linked_account';
        
        const linkedAccount = await createLinkedAccount(contact.id, owner);
        currentMethodForErrorHandling.onboardingError = 'stakeholder';
        
        await createStakeholder(linkedAccount.id, accountDetails);
        currentMethodForErrorHandling.onboardingError = 'fund_account';

        const fundAccount = await createFundAccount(linkedAccount.id, accountDetails);
        
        const newMethod: PaymentMethod = {
          id: linkedAccount.id, // Store the Linked Account ID (la_...)
          razorpay_fund_account_id: fundAccount.id,
          name: accountDetails.name || accountDetails.vpa!,
          isActive: fundAccount.active,
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
        await ownerDocRef.update({ 'subscription.payoutMethods': FieldValue.arrayUnion(currentMethodForErrorHandling) });
        throw error;
    }
}

export async function deletePayoutMethod({ ownerId, methodId }: { ownerId: string; methodId: string }): Promise<{ success: boolean; updatedUser: User }> {
    try {
        const adminDb = await getAdminDb();
        const ownerDocRef = adminDb.collection('users').doc(ownerId);
        
        const ownerDoc = await ownerDocRef.get();
        if (!ownerDoc.exists) throw new Error("Owner not found.");
        
        const owner = ownerDoc.data() as User;
        let methods = owner.subscription?.payoutMethods || [];
        const methodToDeactivate = methods.find(m => m.id === methodId);

        if (methodToDeactivate?.id) { // Linked Account ID
            try {
                 await axios.patch(`https://api.razorpay.com/v1/linked_accounts/${methodToDeactivate.id}`, 
                    { status: 'suspended' },
                    { auth: { username: process.env.RAZORPAY_KEY_ID!, password: process.env.RAZORPAY_KEY_SECRET! } }
                );
            } catch (razorpayError: any) {
                console.warn("Could not suspend linked account on Razorpay, may already be suspended:", razorpayError.response?.data);
            }
        }
        
        const updatedMethods = methods.filter(m => m.id !== methodId);
        
        if (methods.find(m => m.id === methodId)?.isPrimary && updatedMethods.length > 0) {
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

export async function setPrimaryPayoutMethod({ ownerId, methodId }: { ownerId: string; methodId: string }): Promise<{ success: boolean; updatedUser: User }> {
    try {
        const adminDb = await getAdminDb();
        const ownerDocRef = adminDb.collection('users').doc(ownerId);
        const ownerDoc = await ownerDocRef.get();
        if (!ownerDoc.exists) throw new Error("Owner not found.");

        const owner = ownerDoc.data() as User;
        const methods = owner.subscription?.payoutMethods || [];
        
        const updatedMethods = methods.map(m => ({
            ...m,
            isPrimary: m.id === methodId,
        }));

        await ownerDocRef.update({ 'subscription.payoutMethods': updatedMethods });

        const updatedOwnerDoc = await ownerDocRef.get();
        return { success: true, updatedUser: updatedOwnerDoc.data() as User };
    } catch(error: any) {
        console.error("Error in setPrimaryPayoutMethod", error);
        throw error;
    }
}

    