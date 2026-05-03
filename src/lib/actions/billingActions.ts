
'use server'

import Razorpay from 'razorpay'
import crypto from 'crypto'
import type { 
  User, PremiumFeatures, BillingDetails, BillingCycleDetails, BillingDiscount,
  MonthlyInvoice, BillingLedgerEntry, BillingPlanType
} from '../types'
import { getAdminDb } from '../firebaseAdmin'
import { PRICING_CONFIG } from '../constants'
import { debitWallet, addBillingLedgerEntry } from './walletActions'


/**
 * Applies a discount to a raw bill amount.
 * Order: Base + tenant → apply discount → final bill
 */
function applyDiscount(baseAmount: number, baseFee: number, tenantCharge: number, discount?: BillingDiscount | null): { discountedAmount: number; discountValue: number } {
  const safeBaseAmount = isNaN(baseAmount) ? 0 : baseAmount;
  const safeBaseFee = isNaN(baseFee) ? 0 : baseFee;

  let discountValue = 0;
  if (discount) {
    switch (discount.type) {
      case 'flat':
        discountValue = Math.min(discount.value, safeBaseAmount);
        break;
      case 'percentage':
        discountValue = Math.round(safeBaseAmount * (discount.value / 100));
        break;
      case 'free_base':
        // Only charge per-tenant, waive base fee
        discountValue = safeBaseFee;
        break;
    }
  }

  const finalDiscountValue = isNaN(discountValue) ? 0 : discountValue;

  return {
    discountedAmount: Math.max(0, safeBaseAmount - finalDiscountValue),
    discountValue: finalDiscountValue,
  };
}

/**
 * Counts unique tenants who were active at any point during the billing month.
 * Rule: A tenant is counted if they stayed at least 1 day in the billing cycle.
 */
export async function getUniqueTenantsForMonth(ownerId: string, monthIso: string): Promise<string[]> {
  const adminDb = await getAdminDb();
  const [year, month] = monthIso.split('-').map(Number);
  const startOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59));

  const guestsSnapshot = await adminDb
    .collection('users_data')
    .doc(ownerId)
    .collection('guests')
    .get();

  const uniquePhoneNumbers = new Set<string>();
  const billableTenantIds: string[] = [];

  guestsSnapshot.docs.forEach(doc => {
    const data = doc.data();
    const joinDate = new Date(data.moveInDate || data.createdAt || 0);
    const exitDate = data.isVacated ? new Date(data.exitDate) : null;

    // Logic: Active if joinDate <= endOfMonth AND (exitDate is null OR exitDate >= startOfMonth)
    const wasActive = joinDate <= endOfMonth && (!exitDate || exitDate >= startOfMonth);

    if (wasActive) {
      const phone = data.phone || doc.id; // Fallback to doc ID if phone missing
      if (!uniquePhoneNumbers.has(phone)) {
        uniquePhoneNumbers.add(phone);
        billableTenantIds.push(doc.id);
      }
    }
  });

  return billableTenantIds;
}

/**
 * Calculates the billing details for a given owner for both the current and next cycle.
 */
export async function calculateOwnerBill(owner: User, monthIso?: string): Promise<BillingDetails> {
  const adminDb = await getAdminDb();
  const currentMonth = monthIso || new Date().toISOString().slice(0, 7);

  // Fetch unique tenants for the cycle
  const billableTenantIds = await getUniqueTenantsForMonth(owner.id, currentMonth);
  const billableTenantCount = billableTenantIds.length;

  // Fetch active properties (still needed for display)
  const pgsSnapshot = await adminDb
    .collection('users_data')
    .doc(owner.id)
    .collection('pgs')
    .get();
  const propertyCount = pgsSnapshot.docs.length;
  let totalBeds = 0;
  pgsSnapshot.docs.forEach(doc => {
    const data = doc.data();
    let pgBeds = data.totalBeds || 0;
    
    // If totalBeds is 0 or missing, calculate from floors and rooms
    if (pgBeds === 0 && data.floors) {
      data.floors.forEach((floor: any) => {
        if (floor.rooms) {
          floor.rooms.forEach((room: any) => {
            if (room.beds) {
              pgBeds += room.beds.length;
            } else if (room.capacity) {
              pgBeds += room.capacity;
            }
          });
        }
      });
    }
    totalBeds += pgBeds;
  });

  // Gracefully handle cases where subscription or premiumFeatures might not exist
  const subscription = owner.subscription as Record<string, any> | undefined;
  const premiumFeatures = (subscription?.premiumFeatures || {}) as PremiumFeatures;
  const isSubscribed = subscription?.status === 'active' || subscription?.status === 'trialing' || subscription?.status === 'restricted';

  // Use owner-specific billing config if set by admin, else defaults
  const billingConfig = owner.billingConfig;
  
  // Per-tenant fee based on plan type
  let perTenantFee = PRICING_CONFIG.monthly.perTenant;
  if (billingConfig?.planType === 'yearly') perTenantFee = PRICING_CONFIG.yearly.perTenant;
  else if (billingConfig?.planType === 'sixMonth') perTenantFee = PRICING_CONFIG.sixMonth.perTenant;
  else if (billingConfig?.planType === 'monthly') perTenantFee = PRICING_CONFIG.monthly.perTenant;
  else if (billingConfig?.planType === 'trial') perTenantFee = PRICING_CONFIG.monthly.perTenant; // Trial uses monthly rates if credit runs out
  else if (billingConfig?.planType === 'enterprise') perTenantFee = 0; // Enterprise usually has custom flat pricing or per-tenant logic handled via overrides

  // Admin Override
  if (billingConfig?.perTenantFee !== undefined) perTenantFee = billingConfig.perTenantFee;
  
  const baseFee = billingConfig?.baseFee ?? PRICING_CONFIG.baseFee;
  const discount = billingConfig?.discount;

  const calculateCycleDetails = (features: PremiumFeatures): BillingCycleDetails => {
    const propertyCharge = isSubscribed ? baseFee : 0;
    const tenantCharge = isSubscribed ? billableTenantCount * perTenantFee : 0;

    let premiumCharge = 0;
    const premiumDetails: BillingCycleDetails['premiumFeaturesDetails'] = {};

    if (isSubscribed) {
      for (const [key, config] of Object.entries(PRICING_CONFIG.premiumFeatures)) {
        const featureKey = key as keyof PremiumFeatures;
        if (features[featureKey]?.enabled) {
          const configCharge = config.billingType === 'monthly' 
            ? (config.monthlyCharge || 0)
            : (billableTenantCount * (config.perTenantCharge || 0));
          
          const charge = isNaN(configCharge) ? 0 : configCharge;
          let description = `${config.name}`;

          if (config.billingType === 'monthly') {
            description = config.name;
          } else if (config.billingType === 'per_tenant') {
            description = `${config.name} (${billableTenantCount} tenants × ₹${config.perTenantCharge || 0})`;
          }

          premiumCharge += charge;
          premiumDetails[key] = { charge, description };
        }
      }
    }

    const rawTotal = (propertyCharge || 0) + (tenantCharge || 0) + (premiumCharge || 0);
    const safeRawTotal = isNaN(rawTotal) ? 0 : rawTotal;
    const { discountedAmount, discountValue } = applyDiscount(safeRawTotal, propertyCharge || 0, tenantCharge || 0, discount);

    return {
      totalAmount: discountedAmount,
      propertyCharge, 
      tenantCharge,
      tenantCount: billableTenantCount,
      perTenantFee,
      premiumFeaturesCharge: premiumCharge,
      premiumFeaturesDetails: premiumDetails,
      discountAmount: discountValue,
      discountDetails: discount || undefined,
    };
  };

  const currentCycle = calculateCycleDetails(premiumFeatures);
  const nextCycleEstimate = calculateCycleDetails(premiumFeatures);

  return {
    currentCycle,
    nextCycleEstimate,
    details: {
      propertyCount,
      billableTenantCount,
      totalBeds,
      billableTenantIds,
      billableTenantNames: [], // Can be populated if needed
      pricingConfig: PRICING_CONFIG as any,
    }
  };
}



export async function getBillingDetails(ownerId: string): Promise<{ success: boolean; data?: BillingDetails; error?: string }> {
  const adminDb = await getAdminDb();
  try {
    const ownerDoc = await adminDb.collection('users').doc(ownerId).get();
    if (!ownerDoc.exists) {
      return { success: false, error: "Owner not found." };
    }

    const owner = { ...ownerDoc.data(), id: ownerDoc.id } as User;
    const billingData = await calculateOwnerBill(owner);
    return { success: true, data: billingData };
  } catch (error: any) {
    console.error('Error in getBillingDetails:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Creates a base subscription for a new user on Razorpay.
 * This subscription has a ₹0 cost and serves as the anchor for monthly addons.
 */
export async function createRazorpaySubscription(userId: string) {
  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  });
  try {
    const BASE_PLAN_ID = process.env.RAZORPAY_BASE_PLAN_ID || 'plan_base_monthly';
    // Check if the base plan exists on Razorpay
    try {
      await razorpay.plans.fetch(BASE_PLAN_ID);
    } catch (fetchError: any) {
      if (fetchError.statusCode === 404) {
        console.error(`FATAL: Razorpay plan with ID "${BASE_PLAN_ID}" not found. Please create it in your Razorpay dashboard.`);
        return { success: false, error: 'Base subscription plan is not configured.' };
      }
      throw fetchError;
    }

    const subscription = await razorpay.subscriptions.create({
      plan_id: BASE_PLAN_ID,
      customer_notify: 1,
      quantity: 1,
      total_count: 120, // Keep it long-running, e.g., 10 years
      notes: {
        userId: userId,
        type: 'base_subscription'
      },
    });

    return { success: true, subscription };
  } catch (error: any) {
    console.error('Razorpay base subscription creation failed:', error);
    return { success: false, error: 'Could not create base subscription on payment gateway.' };
  }
}

/**
 * Verifies the initial base subscription payment and updates the user record.
 */
export async function verifySubscriptionPayment(data: {
  razorpay_payment_id: string
  razorpay_subscription_id: string
  razorpay_signature: string
  userId: string
}) {
  const { userId, razorpay_subscription_id, razorpay_payment_id, razorpay_signature } = data;

  const generated_signature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
    .update(razorpay_payment_id + '|' + razorpay_subscription_id)
    .digest('hex');

  if (generated_signature !== razorpay_signature) {
    return { success: false, error: 'Payment verification failed. Signature mismatch.' };
  }

  // Signature is valid, update user's subscription in Firestore
  try {
    const adminDb = await getAdminDb();
    // Use Admin SDK syntax: adminDb.doc() not client SDK doc()
    await adminDb.doc(`users/${userId}`).update({
      'subscription.status': 'active',
      'subscription.planId': 'pro',
      'subscription.razorpay_subscription_id': razorpay_subscription_id,
      'subscription.razorpay_payment_id': razorpay_payment_id,
    });
    return { success: true };
  } catch (error) {
    console.error("Error updating user subscription:", error);
    return { success: false, error: 'Failed to update subscription status in our system.' };
  }
}

/**
 * Updates the user's commitment tier and per-tenant rate.
 */
export async function updateCommitmentTier(ownerId: string, planType: BillingPlanType) {
    try {
        const adminDb = await getAdminDb();
        const userRef = adminDb.collection('users').doc(ownerId);
        
        // Per-tenant fee based on plan type from PRICING_CONFIG
        let perTenantFee = PRICING_CONFIG.monthly.perTenant;
        if (planType === 'yearly') perTenantFee = PRICING_CONFIG.yearly.perTenant;
        else if (planType === 'sixMonth') perTenantFee = PRICING_CONFIG.sixMonth.perTenant;
        else if (planType === 'monthly') perTenantFee = PRICING_CONFIG.monthly.perTenant;

        await userRef.update({
            'billingConfig.planType': planType,
            'billingConfig.perTenantFee': perTenantFee,
            'subscription.planId': 'pro' // Ensure it's marked as pro (usage-based)
        });

        return { success: true };
    } catch (error: any) {
        console.error('Error updating commitment tier:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Generates the final monthly invoice, deducts from wallet, and records ledger entries.
 * This creates the "Immutable Snapshot" for the billing cycle.
 */
export async function generateMonthlyInvoice(ownerId: string, monthIso: string): Promise<{ success: boolean; invoiceId?: string; error?: string }> {
  try {
    const adminDb = await getAdminDb();
    const userRef = adminDb.collection('users').doc(ownerId);
    
    // 1. Check if invoice already exists (Idempotency)
    const existingInvoice = await userRef.collection('monthly_invoices').doc(monthIso).get();
    if (existingInvoice.exists) {
      return { success: false, error: `Invoice for ${monthIso} already exists.` };
    }

    const result = await adminDb.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) throw new Error('Owner not found.');
      const owner = { ...userDoc.data(), id: userDoc.id } as User;

      // 2. Calculate Bill
      const billingData = await calculateOwnerBill(owner, monthIso);
      const cycle = billingData.currentCycle;

      // 3. Record Ledger Entries
      const ledgerEntryIds: string[] = [];

      // Base Fee
      if (cycle.propertyCharge > 0) {
        ledgerEntryIds.push(await addBillingLedgerEntry(transaction, ownerId, {
          type: 'BASE_FEE',
          amount: -cycle.propertyCharge,
          description: 'Base platform fee',
          month: monthIso,
          metadata: { planId: owner.billingConfig?.planType || 'monthly' }
        }));
      }

      // Tenant Usage
      if (cycle.tenantCharge > 0) {
        ledgerEntryIds.push(await addBillingLedgerEntry(transaction, ownerId, {
          type: 'TENANT_USAGE',
          amount: -cycle.tenantCharge,
          description: `Usage for ${cycle.tenantCount} active tenants`,
          month: monthIso,
          metadata: { 
            tenantCount: cycle.tenantCount,
            tenantIds: billingData.details.billableTenantIds || []
          }
        }));
      }

      // Premium Features
      for (const [key, details] of Object.entries(cycle.premiumFeaturesDetails || {})) {
        if (details.charge > 0) {
          ledgerEntryIds.push(await addBillingLedgerEntry(transaction, ownerId, {
            type: 'PREMIUM_FEATURE',
            amount: -details.charge,
            description: details.description,
            month: monthIso,
            metadata: { featureId: key }
          }));
        }
      }

      // Discounts
      const discountAmount = cycle.discountAmount ?? 0;
      if (discountAmount > 0) {
        ledgerEntryIds.push(await addBillingLedgerEntry(transaction, ownerId, {
          type: 'DISCOUNT',
          amount: discountAmount, // Positive because it's a credit to the bill
          description: cycle.discountDetails?.reason || 'Monthly discount',
          month: monthIso,
          metadata: { discountId: cycle.discountDetails?.type }
        }));
      }

      // 4. Deduct from Wallet
      const wallet = owner.wallet || { trialBalance: 0, rechargeBalance: 0, balance: 0, dues: 0 };
      let remainingToDeduct = cycle.totalAmount;
      let trialDeducted = 0;
      let rechargeDeducted = 0;
      let duesIncurred = 0;

      if (wallet.trialBalance > 0) {
        const canDeduct = Math.min(wallet.trialBalance, remainingToDeduct);
        trialDeducted = canDeduct;
        remainingToDeduct -= canDeduct;
      }
      if (remainingToDeduct > 0 && wallet.rechargeBalance > 0) {
        const canDeduct = Math.min(wallet.rechargeBalance, remainingToDeduct);
        rechargeDeducted = canDeduct;
        remainingToDeduct -= canDeduct;
      }
      if (remainingToDeduct > 0) {
        duesIncurred = remainingToDeduct;
        remainingToDeduct = 0;
      }

      const newTrialBalance = (wallet.trialBalance ?? 0) - trialDeducted;
      const newRechargeBalance = (wallet.rechargeBalance ?? 0) - rechargeDeducted;
      const newDues = (wallet.dues ?? 0) + duesIncurred;
      const newCombinedBalance = newTrialBalance + newRechargeBalance;

      transaction.update(userRef, {
        'wallet.trialBalance': newTrialBalance,
        'wallet.rechargeBalance': newRechargeBalance,
        'wallet.balance': newCombinedBalance,
        'wallet.dues': newDues,
        'billingConfig.lastBilledAt': new Date().toISOString(),
      });

      // Wallet Transaction log
      const txnRef = userRef.collection('wallet_transactions').doc();
      const txn = {
        id: txnRef.id,
        type: 'debit',
        walletType: trialDeducted > 0 && rechargeDeducted > 0 ? 'mixed' : (trialDeducted > 0 ? 'trial' : 'recharge'),
        amount: cycle.totalAmount,
        trialDeducted,
        rechargeDeducted,
        duesIncurred,
        balanceAfter: newCombinedBalance,
        description: `Monthly billing for ${monthIso}`,
        invoiceMonth: monthIso,
        createdAt: new Date().toISOString(),
      };
      transaction.set(txnRef, txn);

      // 5. Create Immutable Invoice Snapshot
      const invoiceRef = userRef.collection('monthly_invoices').doc(monthIso);
      const invoice: MonthlyInvoice = {
        id: monthIso,
        month: monthIso,
        baseFee: cycle.propertyCharge,
        tenantCount: cycle.tenantCount ?? 0,
        tenantCharge: cycle.tenantCharge,
        premiumCharges: cycle.premiumFeaturesCharge,
        discount: cycle.discountAmount ?? 0,
        totalAmount: cycle.totalAmount,
        walletDeducted: true,
        status: newDues > 0 ? 'due' : 'paid',
        createdAt: new Date().toISOString(),
        breakdown: {
          tenantIds: billingData.details.billableTenantIds || [],
          premiumDetails: cycle.premiumFeaturesDetails,
          discountDetails: cycle.discountDetails || undefined,
          ledgerIds: ledgerEntryIds,
        },
      };
      transaction.set(invoiceRef, invoice);

      return { invoiceId: monthIso };
    });

    return { success: true, invoiceId: result.invoiceId };
  } catch (error: any) {
    console.error('Error generating monthly invoice:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Retrieves all monthly invoices for an owner.
 */
export async function getMonthlyInvoices(ownerId: string): Promise<{ success: boolean; data?: MonthlyInvoice[]; error?: string }> {
  try {
    const adminDb = await getAdminDb();
    const invoicesSnapshot = await adminDb
      .collection('users')
      .doc(ownerId)
      .collection('monthly_invoices')
      .orderBy('month', 'desc')
      .get();

    const invoices = invoicesSnapshot.docs.map(doc => doc.data() as MonthlyInvoice);
    return { success: true, data: invoices };
  } catch (error: any) {
    console.error('Error fetching monthly invoices:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Retrieves ledger entries for a specific invoice.
 */
export async function getInvoiceLedger(ownerId: string, invoiceId: string): Promise<{ success: boolean; data?: BillingLedgerEntry[]; error?: string }> {
  try {
    const adminDb = await getAdminDb();
    // We can either filter by month or by IDs stored in the invoice
    const ledgerSnapshot = await adminDb
      .collection('users')
      .doc(ownerId)
      .collection('billing_ledger')
      .where('month', '==', invoiceId)
      .orderBy('createdAt', 'asc')
      .get();

    const ledger = ledgerSnapshot.docs.map(doc => doc.data() as BillingLedgerEntry);
    return { success: true, data: ledger };
  } catch (error: any) {
    console.error('Error fetching invoice ledger:', error);
    return { success: false, error: error.message };
  }
}
