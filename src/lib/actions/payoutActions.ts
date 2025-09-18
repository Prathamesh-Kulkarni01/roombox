
'use server'

import { getAdminDb } from '../firebaseAdmin';
import { z } from 'zod';
import type { User } from '../types';
import { v4 as uuidv4 } from 'uuid';

// The schema remains the same for form validation on the client and server action.
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
        throw new Error("Invalid account details provided.");
    }
    
    try {
        const adminDb = await getAdminDb();
        const ownerDocRef = adminDb.collection('users').doc(ownerId);
        const ownerDoc = await ownerDocRef.get();
        
        if (!ownerDoc.exists) {
            throw new Error("Owner not found.");
        }
        const owner = ownerDoc.data() as User;

        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/pg-owner`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'X-Idempotency-Key': uuidv4(),
             },
            body: JSON.stringify({
                name: owner.name,
                email: owner.email,
                phone: owner.phone,
                upi: validation.data.vpa,
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(`Failed to link account via API route. Status: ${response.status}. Response: ${JSON.stringify(result)}`);
        }
        
        const payoutDetails = validation.data.payoutMethod === 'vpa'
            ? { type: 'vpa', vpa_address: validation.data.vpa }
            : {
                type: 'bank_account',
                name: validation.data.name,
                account_number_last4: validation.data.account_number?.slice(-4),
              };

        await ownerDocRef.update({
            'subscription.razorpay_contact_id': result.contactId,
            'subscription.razorpay_fund_account_id': result.fundAccountId,
            'subscription.payoutDetails': payoutDetails,
        });

        return { success: true, fundAccountId: result.fundAccountId };
    } catch (error: any) {
        console.error('Error in createOrUpdatePayoutAccount action:', error);
        throw new Error(error.message || "Failed to link payout account.");
    }
}

export async function getPayoutAccountDetails(ownerId: string) {
    const adminDb = await getAdminDb();
    const ownerDoc = await adminDb.collection('users').doc(ownerId).get();
    if (!ownerDoc.exists) return null;
    return ownerDoc.data()?.subscription?.payoutDetails || null;
}
