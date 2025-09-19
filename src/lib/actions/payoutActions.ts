
'use server'

import { getAdminDb } from '../firebaseAdmin';
import { z } from 'zod';
import type { User, PaymentMethod, BankPaymentMethod, UpiPaymentMethod } from '../types';
import { produce } from 'immer';
import { FieldValue } from 'firebase-admin/firestore';

const payoutAccountSchema = z.object({
  payoutMethod: z.enum(['bank_account', 'vpa']),
  name: z.string().optional(),
  account_number: z.string().min(5, "Account number is required.").regex(/^\d+$/, "Account number must contain only digits.").optional(),
  ifsc: z.string().length(11, "IFSC code must be 11 characters.").regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC code format.").optional(),
  vpa: z.string().regex(/^[\w.-]+@[\w.-]+$/, "Invalid UPI ID format.").optional(),
  pan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN format.").min(10),
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

export async function addPayoutMethod(ownerId: string, accountDetails: z.infer<typeof payoutAccountSchema>): Promise<{ success: boolean, updatedUser?: User, error?: string }> {
    const validation = payoutAccountSchema.safeParse(accountDetails);
    if (!validation.success) {
        const firstError = validation.error.errors[0];
        return { success: false, error: `${firstError.path.join('.')}: ${firstError.message}` };
    }
    const data = validation.data;

    try {
        const adminDb = await getAdminDb();
        const ownerDocRef = adminDb.collection('users').doc(ownerId);
        const ownerDoc = await ownerDocRef.get();
        
        if (!ownerDoc.exists) {
            return { success: false, error: "Owner not found." };
        }
        const owner = ownerDoc.data() as User;
        
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.URL || 'http://localhost:9002';
        
        const res = await fetch(`${appUrl}/api/payout/onboard`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ owner, accountDetails: data })
        });

        const result = await res.json();
        if (!res.ok || !result.success) {
            throw new Error(result.error || `Failed to link account. Status: ${res.status}.`);
        }
        
        const { linkedAccountId, fundAccountId } = result;

        const newMethod: PaymentMethod = {
          id: linkedAccountId, // This is the Razorpay Linked Account ID (acc_...)
          name: data.name || (data.payoutMethod === 'vpa' ? data.vpa! : owner.name),
          isActive: true,
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
        if (!ownerDoc.exists) throw new Error("Owner not found.");
        
        const owner = ownerDoc.data() as User;
        let methods = owner.subscription?.payoutMethods || [];
        
        let wasPrimary = false;
        const updatedMethods = methods.filter(m => {
            if (m.id === methodId) {
                wasPrimary = m.isPrimary;
                return false;
            }
            return true;
        });
        
        if (wasPrimary && updatedMethods.length > 0) {
            const nextPrimary = updatedMethods.find(m => m.isActive);
            if (nextPrimary) {
                const index = updatedMethods.findIndex(m => m.id === nextPrimary.id);
                updatedMethods[index].isPrimary = true;
            } else if (updatedMethods.length > 0) {
                updatedMethods[0].isPrimary = true;
            }
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
        return { success: false, error: error.message || 'Could not update primary method.' };
    }
}
