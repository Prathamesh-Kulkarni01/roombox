
'use server'

import { getAdminDb } from '../firebaseAdmin';
import { z } from 'zod';
import type { User, PaymentMethod } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { produce } from 'immer';
import { FieldValue } from 'firebase-admin/firestore';

const payoutAccountSchema = z.object({
  payoutMethod: z.enum(['bank_account', 'vpa']),
  name: z.string().min(3, "Account holder name is required.").optional(),
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

export async function addPayoutMethod(ownerId: string, accountDetails: z.infer<typeof payoutAccountSchema>): Promise<{ success: boolean, updatedUser?: User, error?: string }> {
    const validation = payoutAccountSchema.safeParse(accountDetails);
    if (!validation.success) {
        return { success: false, error: "Invalid account details provided." };
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
        
        const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/payout/methods`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                owner,
                accountDetails: data
            })
        });

        const result = await res.json();
        if (!res.ok) {
            throw new Error(result.error || `Failed to link account. Status: ${res.status}`);
        }

        const newMethod: PaymentMethod = {
          id: result.fundAccountId,
          razorpay_fund_account_id: result.fundAccountId,
          type: data.payoutMethod,
          name: data.payoutMethod === 'vpa' ? data.vpa! : data.name!,
          isActive: true,
          isPrimary: !(owner.subscription?.payoutMethods?.some(m => m.isPrimary)),
          createdAt: new Date().toISOString(),
          ...(data.payoutMethod === 'vpa' ? { vpaAddress: data.vpa! } : {
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


export async function deletePayoutMethod({ ownerId, methodId }: { ownerId: string; methodId: string }): Promise<User> {
    const adminDb = await getAdminDb();
    const ownerDocRef = adminDb.collection('users').doc(ownerId);
    
    const ownerDoc = await ownerDocRef.get();
    if (!ownerDoc.exists) {
        throw new Error("Owner not found.");
    }
    const owner = ownerDoc.data() as User;
    const methods = owner.subscription?.payoutMethods || [];
    const methodToDelete = methods.find(m => m.id === methodId);
    
    if (!methodToDelete) {
        throw new Error("Payout method not found.");
    }

    const updatedMethods = methods.filter(m => m.id !== methodId);
    
    // If the deleted method was the primary one, and there are other methods left,
    // make the first one in the remaining list the new primary.
    if (methodToDelete.isPrimary && updatedMethods.length > 0) {
        updatedMethods[0].isPrimary = true;
    }

    await ownerDocRef.update({
        'subscription.payoutMethods': updatedMethods,
    });
    
    const updatedDoc = await ownerDocRef.get();
    return updatedDoc.data() as User;
}

export async function setPrimaryPayoutMethod({ ownerId, methodId }: { ownerId: string; methodId: string }) {
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
    return updatedOwnerDoc.data() as User;
}
