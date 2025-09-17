
'use server'

import Razorpay from 'razorpay';
import { getAdminDb } from '../firebaseAdmin';
import { z } from 'zod';
import type { User } from '../types';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

const bankAccountSchema = z.object({
  name: z.string().min(3, "Account holder name is required."),
  account_number: z.string().min(5, "Account number is required."),
  ifsc: z.string().length(11, "IFSC code must be 11 characters."),
});

export async function createOrUpdatePayoutAccount(ownerId: string, accountDetails: z.infer<typeof bankAccountSchema>) {
    const validation = bankAccountSchema.safeParse(accountDetails);
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
        
        const linkedAccountPayload = {
            email: owner.email || `${owner.id}@rentvastu.com`,
            name: owner.name,
            type: 'customer' as const,
            account: {
                ...validation.data,
                type: 'bank_account' as const,
            }
        };

        const linkedAccount = await razorpay.linkedAccount.create(linkedAccountPayload);
        
        await ownerDocRef.update({
            'subscription.razorpay_linked_account_id': linkedAccount.id,
            'subscription.payoutDetails': {
                name: validation.data.name,
                account_number_last4: validation.data.account_number.slice(-4),
            }
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
