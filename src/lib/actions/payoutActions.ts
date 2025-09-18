
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

        // Step 1: Create or fetch Razorpay Contact
        let contactId = owner.subscription?.razorpay_contact_id;
        if (!contactId) {
            const contact = await razorpay.contacts.create({
                name: owner.name,
                email: owner.email || `${owner.id}@rentvastu.com`,
                contact: owner.phone,
                type: 'vendor',
                reference_id: `owner_${owner.id}`
            });
            contactId = contact.id;
        }

        // Step 2: Create Fund Account (Bank or VPA)
        let fundAccountPayload;
        let payoutDetailsToSave;

        if (validation.data.payoutMethod === 'vpa') {
            fundAccountPayload = {
                contact_id: contactId!,
                account_type: 'vpa' as const,
                vpa: {
                    address: validation.data.vpa!,
                }
            };
            payoutDetailsToSave = {
                type: 'vpa',
                vpa_address: validation.data.vpa!,
            };
        } else { // bank_account
            fundAccountPayload = {
                contact_id: contactId!,
                account_type: 'bank_account' as const,
                bank_account: {
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

        const fundAccount = await razorpay.fund_accounts.create(fundAccountPayload);

        // Step 3: Save Contact ID and Fund Account ID to Firestore
        await ownerDocRef.update({
            'subscription.razorpay_contact_id': contactId,
            'subscription.razorpay_fund_account_id': fundAccount.id,
            'subscription.payoutDetails': payoutDetailsToSave
        });

        return { success: true, fundAccountId: fundAccount.id };
    } catch (error: any) {
        console.error('Error creating Razorpay Contact/Fund Account:', error);
        return { success: false, error: error.message || "Failed to link payout account." };
    }
}

export async function getPayoutAccountDetails(ownerId: string) {
    const adminDb = await getAdminDb();
    const ownerDoc = await adminDb.collection('users').doc(ownerId).get();
    if (!ownerDoc.exists) return null;
    return ownerDoc.data()?.subscription?.payoutDetails || null;
}
