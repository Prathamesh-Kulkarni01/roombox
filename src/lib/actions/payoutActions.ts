
'use server'

import { getAdminDb } from '../firebaseAdmin';
import { z } from 'zod';
import type { User, PaymentMethod, BankPaymentMethod, UpiPaymentMethod, PaymentMethodValidationResult } from '../types';
import { produce } from 'immer';
import { FieldValue } from 'firebase-admin/firestore';
import Razorpay from 'razorpay';

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
});


const payoutAccountSchema = z.object({
  payoutMethod: z.enum(['bank_account', 'vpa']),
  name: z.string().optional(),
  account_number: z.string().min(5, "Account number is required.").regex(/^\d+$/, "Account number must contain only digits.").optional(),
  ifsc: z.string().length(11, "IFSC code must be 11 characters.").regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC code format.").optional(),
  vpa: z.string().regex(/^[\w.-]+@[\w.-]+$/, "Invalid UPI ID format.").optional(),
}).refine(data => {
    if (data.payoutMethod === 'bank_account') {
        return !!data.name && !!data.account_number && !!data.ifsc;
    }
    if (data.payoutMethod === 'vpa') {
        return !!data.vpa;
    }
    return false;
}, {
    message: 'Please fill in the required fields for the selected payout method.',
    path: ['payoutMethod'],
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
            // Check if contact actually exists on Razorpay
            await razorpay.contacts.fetch(owner.subscription.razorpay_contact_id);
            return { id: owner.subscription.razorpay_contact_id };
        } catch (error) {
            // Contact doesn't exist on Razorpay, proceed to create a new one
        }
    }
    try {
        const contactPayload = {
            name: owner.name,
            email: owner.email!,
            type: 'vendor' as 'vendor',
            reference_id: owner.id,
        };
        const contact = await razorpay.contacts.create(contactPayload);
        
        // Update Firestore with the new contact ID
        const adminDb = await getAdminDb();
        const ownerDocRef = adminDb.collection('users').doc(owner.id);
        await ownerDocRef.update({ 'subscription.razorpay_contact_id': contact.id });
        
        return { id: contact.id };
    } catch (error: any) {
        console.error("Failed to create Razorpay contact:", error);
        throw new Error('Failed to create contact on payment gateway.');
    }
}

async function createFundAccount(contactId: string, accountDetails: z.infer<typeof payoutAccountSchema>) {
    try {
        const fundAccountPayload: any = {
            contact_id: contactId,
            account_type: accountDetails.payoutMethod,
            ...(accountDetails.payoutMethod === 'vpa' && { vpa: { address: accountDetails.vpa! } }),
            ...(accountDetails.payoutMethod === 'bank_account' && {
                bank_account: {
                    name: accountDetails.name!,
                    ifsc: accountDetails.ifsc!,
                    account_number: accountDetails.account_number!,
                }
            })
        };
        const fundAccount = await razorpay.fundAccounts.create(fundAccountPayload);
        return fundAccount;
    } catch (error: any) {
        console.error("Failed to create Razorpay fund account:", error);
        throw new Error(error.error?.description || 'Failed to create fund account on payment gateway.');
    }
}


export async function addPayoutMethod(ownerId: string, accountDetails: z.infer<typeof payoutAccountSchema>): Promise<{ success: boolean, updatedUser?: User, error?: string }> {
    const validation = payoutAccountSchema.safeParse(accountDetails);
    if (!validation.success) {
        const firstError = validation.error.errors[0];
        return { success: false, error: `${firstError.path.join('.')}: ${firstError.message}` };
    }
    const data = validation.data;

    const adminDb = await getAdminDb();
    const ownerDocRef = adminDb.collection('users').doc(ownerId);
    let tempMethodIdForErrorHandling: string | null = null;
    
    const updateErrorAndThrow = async (errorStep: string, errorMessage: string) => {
        if (tempMethodIdForErrorHandling) {
             const ownerDoc = await ownerDocRef.get();
            if (ownerDoc.exists()) {
                const owner = ownerDoc.data() as User;
                const methods = owner.subscription?.payoutMethods || [];
                const updatedMethods = methods.map(m => m.id === tempMethodIdForErrorHandling ? { ...m, onboardingError: errorStep } : m);
                await ownerDocRef.update({ 'subscription.payoutMethods': updatedMethods });
            }
        }
        throw new Error(errorMessage);
    }
    
    try {
        const ownerDoc = await ownerDocRef.get();
        if (!ownerDoc.exists()) return { success: false, error: "Owner not found." };
        const owner = ownerDoc.data() as User;

        if (data.payoutMethod === 'vpa' && data.vpa) {
            const vpaValidation = await validateVPA(data.vpa);
            if (!vpaValidation.isValid) {
                return { success: false, error: vpaValidation.error };
            }
        }

        // STEP 1: Create or Get Contact
        const contact = await createOrGetContact(owner);

        // STEP 2: Create Fund Account
        const fundAccount = await createFundAccount(contact.id, data);
        
        // STEP 3: Store the new method in Firestore
        const newMethod: PaymentMethod = {
          id: fundAccount.id,
          razorpay_fund_account_id: fundAccount.id,
          name: data.name || data.vpa!,
          isActive: fundAccount.active,
          isPrimary: !(owner.subscription?.payoutMethods?.some(m => m.isPrimary)),
          createdAt: new Date().toISOString(),
          ...(data.payoutMethod === 'vpa' ? { 
              type: 'vpa' as 'vpa',
              vpaAddress: data.vpa! 
            } : {
              type: 'bank_account' as 'bank_account',
              accountNumber: data.account_number!,
              accountNumberLast4: data.account_number!.slice(-4),
              ifscCode: data.ifsc!,
              accountHolderName: data.name!,
          }),
        };
        
        await ownerDocRef.update({
            'subscription.payoutMethods': FieldValue.arrayUnion(newMethod)
        });

        const updatedOwnerDoc = await ownerDocRef.get();
        const updatedUser = updatedOwnerDoc.data() as User;

        return { success: true, updatedUser };

    } catch (error: any) {
        console.error('Error in addPayoutMethod action:', error);
        return { success: false, error: error.message || "Failed to link payout account."};
    }
}

export async function deletePayoutMethod({ ownerId, methodId }: { ownerId: string; methodId: string }): Promise<{ success: boolean, updatedUser?: User, error?: string }> {
    try {
        const adminDb = await getAdminDb();
        const ownerDocRef = adminDb.collection('users').doc(ownerId);
        
        const ownerDoc = await ownerDocRef.get();
        if (!ownerDoc.exists()) throw new Error("Owner not found.");
        
        const owner = ownerDoc.data() as User;
        let methods = owner.subscription?.payoutMethods || [];
        const methodToDeactivate = methods.find(m => m.id === methodId);

        if (methodToDeactivate?.razorpay_fund_account_id) {
            try {
                await razorpay.fundAccounts.update(methodToDeactivate.razorpay_fund_account_id, { active: false });
            } catch (razorpayError: any) {
                console.warn("Could not deactivate fund account on Razorpay, may already be inactive:", razorpayError.error?.description);
            }
        }
        
        const updatedMethods = methods.filter(m => m.id !== methodId);
        
        if (methods.find(m => m.id === methodId)?.isPrimary && updatedMethods.length > 0) {
            updatedMethods[0].isPrimary = true;
        }
        
        await ownerDocRef.update({
            'subscription.payoutMethods': updatedMethods,
        });
        
        const updatedDoc = await ownerDocRef.get();
        return { success: true, updatedUser: updatedDoc.data() as User };
    } catch(error: any) {
        console.error("Error in deletePayoutMethod", error);
        return { success: false, error: error.message || 'Could not unlink account.' };
    }
}

export async function setPrimaryPayoutMethod({ ownerId, methodId }: { ownerId: string; methodId: string }): Promise<{ success: boolean, updatedUser?: User, error?: string }> {
    try {
        const adminDb = await getAdminDb();
        const ownerDocRef = adminDb.collection('users').doc(ownerId);
        const ownerDoc = await ownerDocRef.get();
        if (!ownerDoc.exists()) throw new Error("Owner not found.");

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
        return { success: false, error: error.message || 'Could not update primary method.' };
    }
}
