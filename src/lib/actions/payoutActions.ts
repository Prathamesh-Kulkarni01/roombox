
'use server'

import Razorpay from 'razorpay';
import { getAdminDb } from '../firebaseAdmin';
import { z } from 'zod';
import type { User } from '../types';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

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

export async function createOrUpdatePayoutAccount(ownerId: string, accountDetails: z.infer<typeof payoutAccountSchema>) {
    const validation = payoutAccountSchema.safeParse(accountDetails);
    if (!validation.success) {
        return { success: false, error: "Invalid account details provided." };
    }
    
    try {
        const adminDb = await getAdminDb();
        const ownerDocRef = adminDb.collection('users').doc(ownerId);
        const ownerDoc = await ownerDocRef.get();
        
        if (!ownerDoc.exists) {
            return { success: false, error: "Owner not found." };
        }
        const owner = ownerDoc.data() as User;

        let accountPayload;
        let payoutDetailsToSave;

        if (validation.data.payoutMethod === 'vpa') {
            accountPayload = {
                type: 'vpa' as const,
                details: {
                    address: validation.data.vpa!,
                }
            };
            payoutDetailsToSave = {
                type: 'vpa',
                vpa_address: validation.data.vpa!,
            };
        } else {
            accountPayload = {
                type: 'bank_account' as const,
                details: {
                    name: validation.data.name!,
                    account_number: validation.data.account_number!,
                    ifsc: validation.data.ifsc!,
                }
            };
             payoutDetailsToSave = {
                type: 'bank_account',
                name: validation.data.name!,
                account_number_last4: validation.data.account_number!.slice(-4),
            };
        }
        
        const linkedAccountPayload = {
            email: owner.email || `${owner.id}@rentvastu.com`,
            name: owner.name,
            type: 'customer' as const,
            account: accountPayload,
        };

        const linkedAccount = await razorpay.linkedAccount.create(linkedAccountPayload);
        
        await ownerDocRef.update({
            'subscription.razorpay_linked_account_id': linkedAccount.id,
            'subscription.payoutDetails': payoutDetailsToSave
        });

        return { success: true, linkedAccountId: linkedAccount.id };
    } catch (error: any) {
        console.error('Error creating Razorpay Linked Account:', error);
        return { success: false, error: error.message || "Failed to link payout account." };
    }
}

export async function getPayoutAccountDetails(ownerId: string) {
    const adminDb = await getAdminDb();
    const ownerDoc = await adminDb.collection('users').doc(ownerId).get();
    if (!ownerDoc.exists) return null;
    return ownerDoc.data()?.subscription?.payoutDetails || null;
}
