
'use server'

import crypto from 'crypto'
import { getAdminDb } from '../firebaseAdmin'
import { PRICING_CONFIG } from '../constants'
import { getVerifiedOwnerIdFromHeaders } from '../auth-server'
import type { 
  WalletTransaction, WalletTransactionType, LowBalanceStage, 
  BillingConfig, WalletInfo, User, PremiumFeatures, BillingDiscount,
  BillingLedgerEntry, LedgerEntryType
} from '../types'
import { FieldValue } from 'firebase-admin/firestore'

// ─── Wallet Balance ──────────────────────────────────────────────────────────

export async function getWalletBalance(ownerId: string): Promise<{ success: boolean; balance?: number; wallet?: WalletInfo; error?: string }> {
  try {
    const adminDb = await getAdminDb();
    const userDoc = await adminDb.collection('users').doc(ownerId).get();
    if (!userDoc.exists) return { success: false, error: 'Owner not found.' };

    const userData = userDoc.data() as User;
    const wallet = userData.wallet ?? { balance: 0, trialBalance: 0, rechargeBalance: 0, dues: 0 };
    return { success: true, balance: wallet.balance, wallet };
  } catch (error: any) {
    console.error('Error getting wallet balance:', error);
    return { success: false, error: error.message };
  }
}

// ─── Recharge ────────────────────────────────────────────────────────────────

/**
 * Initializes a new owner with trial credit.
 * Rule: ₹500 trial credit, expires in 90 days.
 */
export async function initializeOwnerTrial(ownerId: string): Promise<void> {
  const adminDb = await getAdminDb();
  const userRef = adminDb.collection('users').doc(ownerId);
  const trialExpiresAt = new Date();
  trialExpiresAt.setDate(trialExpiresAt.getDate() + PRICING_CONFIG.trial.durationDays);

  await adminDb.runTransaction(async (transaction) => {
    transaction.update(userRef, {
      'wallet.trialBalance': PRICING_CONFIG.trial.credit,
      'wallet.rechargeBalance': 0,
      'wallet.balance': PRICING_CONFIG.trial.credit,
      'wallet.dues': 0,
      'wallet.trialExpiresAt': trialExpiresAt.toISOString(),
      'subscription.status': 'trialing',
      'subscription.trialEndDate': trialExpiresAt.toISOString(),
    });

    // Log trial credit transaction
    const txnRef = userRef.collection('wallet_transactions').doc();
    const txn: Omit<WalletTransaction, 'id'> & { id: string } = {
      id: txnRef.id,
      type: 'admin_credit',
      walletType: 'trial',
      amount: PRICING_CONFIG.trial.credit,
      trialDeducted: 0,
      rechargeDeducted: 0,
      balanceAfter: PRICING_CONFIG.trial.credit,
      description: `Trial credit of ₹${PRICING_CONFIG.trial.credit} assigned (Valid for ${PRICING_CONFIG.trial.durationDays} days)`,
      createdAt: new Date().toISOString(),
    };
    transaction.set(txnRef, txn);

    // Add Ledger Entry for Trial Credit
    await addBillingLedgerEntry(transaction, ownerId, {
      type: 'TRIAL_CREDIT',
      amount: PRICING_CONFIG.trial.credit,
      description: `Initial trial credit (Valid for ${PRICING_CONFIG.trial.durationDays} days)`,
      month: new Date().toISOString().slice(0, 7),
      metadata: {
        transactionId: txnRef.id,
      }
    });
  });
}

/**
 * Checks if a Razorpay payment ID has already been used for a recharge.
 */
export async function isRazorpayIdUsed(ownerId: string, razorpayPaymentId: string): Promise<boolean> {
  const adminDb = await getAdminDb();
  const existingTxn = await adminDb
    .collection('users')
    .doc(ownerId)
    .collection('wallet_transactions')
    .where('razorpayPaymentId', '==', razorpayPaymentId)
    .limit(1)
    .get();
  
  return !existingTxn.empty;
}

export async function processRecharge(data: {
  ownerId: string;
  amount: number;
  razorpayPaymentId?: string;
  description?: string;
}): Promise<{ success: boolean; newBalance?: number; error?: string }> {
  const { ownerId, amount, razorpayPaymentId, description } = data;

  if (amount <= 0) return { success: false, error: 'Amount must be positive.' };

  try {
    const adminDb = await getAdminDb();
    const userRef = adminDb.collection('users').doc(ownerId);

    const result = await adminDb.runTransaction(async (transaction) => {
      // 1. Idempotency Check: Prevent duplicate processing of the same payment
      if (razorpayPaymentId) {
        const used = await isRazorpayIdUsed(ownerId, razorpayPaymentId);
        if (used) {
          throw new Error('This payment has already been processed.');
        }
      }

      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) throw new Error('Owner not found.');

      const userData = userDoc.data() as User;
      const currentRechargeBalance = Number(userData.wallet?.rechargeBalance ?? 0);
      const trialBalance = Number(userData.wallet?.trialBalance ?? 0);
      
      const parsedAmount = Number(amount);
      const newRechargeBalance = currentRechargeBalance + parsedAmount;
      const combinedBalance = trialBalance + newRechargeBalance;

      // Update wallet balance
      transaction.update(userRef, {
        'wallet.rechargeBalance': newRechargeBalance,
        'wallet.balance': combinedBalance, // Keep combined balance for legacy display
        'wallet.lastRechargeAt': new Date().toISOString(),
        'wallet.lastRechargeAmount': amount,
      });

      // If owner was restricted, reactivate only if balance is now above threshold
      if (userData.subscription?.status === 'restricted' && combinedBalance > PRICING_CONFIG.lowBalance.restrictedThreshold) {
        transaction.update(userRef, {
          'subscription.status': 'active',
        });
      }

      // Log transaction
      const txnRef = userRef.collection('wallet_transactions').doc();
      const txn: Omit<WalletTransaction, 'id'> & { id: string } = {
        id: txnRef.id,
        type: 'recharge',
        walletType: 'recharge',
        amount,
        balanceAfter: combinedBalance,
        description: description || `Wallet recharge of ₹${amount}`,
        razorpayPaymentId,
        createdAt: new Date().toISOString(),
      };
      transaction.set(txnRef, txn);

      // Add Ledger Entry for Recharge
      await addBillingLedgerEntry(transaction, ownerId, {
        type: 'RECHARGE',
        amount,
        description: description || `Wallet recharge of ₹${amount}`,
        month: new Date().toISOString().slice(0, 7),
        metadata: {
          transactionId: txnRef.id,
        }
      });

      return combinedBalance;
    });

    return { success: true, newBalance: result };
  } catch (error: any) {
    console.error('Error processing recharge:', error);
    return { success: false, error: error.message };
  }
}

// ─── Ledger Helper ───────────────────────────────────────────────────────────

/**
 * Adds an entry to the billing ledger for audit purposes.
 * To be used WITHIN a Firestore transaction.
 */
export async function addBillingLedgerEntry(
  transaction: FirebaseFirestore.Transaction,
  ownerId: string,
  data: Omit<BillingLedgerEntry, 'id' | 'ownerId' | 'createdAt'>
): Promise<string> {
  const adminDb = (transaction as any)._firestore || (transaction as any).database; // Internal access to firestore instance if needed, but better to use userRef
  // Actually, we need the userRef to get the collection
  const ledgerRef = adminDb.collection('users').doc(ownerId).collection('billing_ledger').doc();
  
  const entry: BillingLedgerEntry = {
    id: ledgerRef.id,
    ownerId,
    ...data,
    createdAt: new Date().toISOString(),
  };

  transaction.set(ledgerRef, entry);
  return ledgerRef.id;
}

// ─── Razorpay Payment Verification & Credit ──────────────────────────────────

/**
 * Verifies a Razorpay payment signature and credits the wallet.
 * This is the primary credit path (called from client after Razorpay checkout success).
 * The webhook serves as a backup if this call fails due to network issues.
 */
export async function verifyAndProcessWalletRecharge(data: {
  razorpay_payment_id: string
  razorpay_order_id: string
  razorpay_signature: string
  amount: number
  description?: string
}, token?: string): Promise<{ success: boolean; newBalance?: number; error?: string }> {
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature, amount, description } = data;

  try {
    // 1. Authenticate the caller
    const { ownerId, error: authError } = await getVerifiedOwnerIdFromHeaders(token);
    if (!ownerId) return { success: false, error: authError || 'Unauthorized' };

    // 2. Verify Razorpay signature (HMAC-SHA256)
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      console.error('[WalletRecharge] RAZORPAY_KEY_SECRET is not set.');
      return { success: false, error: 'Payment verification unavailable.' };
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      console.warn(`[WalletRecharge] Signature mismatch for payment ${razorpay_payment_id}. Possible tampering.`);
      return { success: false, error: 'Payment verification failed. Signature mismatch.' };
    }

    // 3. Idempotency check
    const alreadyUsed = await isRazorpayIdUsed(ownerId, razorpay_payment_id);
    if (alreadyUsed) {
      console.log(`[WalletRecharge] Payment ${razorpay_payment_id} already processed for ${ownerId}. Returning current balance.`);
      const balanceResult = await getWalletBalance(ownerId);
      return { success: true, newBalance: balanceResult.balance ?? 0 };
    }

    // 4. Credit the wallet
    const result = await processRecharge({
      ownerId,
      amount,
      razorpayPaymentId: razorpay_payment_id,
      description: description || `Wallet recharge via Razorpay (Order: ${razorpay_order_id})`,
    });

    if (result.success) {
      console.log(`[WalletRecharge] Successfully credited ₹${amount} to ${ownerId}. Payment: ${razorpay_payment_id}`);
    }

    return result;
  } catch (error: any) {
    console.error('[WalletRecharge] Error:', error.message || error);
    return { success: false, error: 'An error occurred while processing your payment. If money was deducted, it will be credited automatically.' };
  }
}

// ─── Debit (Monthly Bill) ────────────────────────────────────────────────────

/**
 * Deducts amount from wallets with priority:
 * 1. Trial Balance
 * 2. Recharge Balance
 * 3. Remaining goes to Dues
 */
export async function debitWallet(data: {
  ownerId: string;
  amount: number;
  description: string;
  invoiceMonth?: string;
  additionalUpdates?: Record<string, any>;
}): Promise<{ success: boolean; newBalance?: number; error?: string }> {
  const { ownerId, amount, description, invoiceMonth, additionalUpdates } = data;

  if (amount <= 0) return { success: false, error: 'Amount must be positive.' };

  try {
    const adminDb = await getAdminDb();
    const userRef = adminDb.collection('users').doc(ownerId);

    const result = await adminDb.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) throw new Error('Owner not found.');

      const userData = userDoc.data() as User;
      const wallet = userData.wallet || { trialBalance: 0, rechargeBalance: 0, balance: 0, dues: 0 };
      
      let remainingToDeduct = amount;
      let trialDeducted = 0;
      let rechargeDeducted = 0;
      let duesIncurred = 0;

      // 1. Trial Balance
      if (wallet.trialBalance > 0) {
        const canDeduct = Math.min(wallet.trialBalance, remainingToDeduct);
        trialDeducted = canDeduct;
        remainingToDeduct -= canDeduct;
      }

      // 2. Recharge Balance
      if (remainingToDeduct > 0 && wallet.rechargeBalance > 0) {
        const canDeduct = Math.min(wallet.rechargeBalance, remainingToDeduct);
        rechargeDeducted = canDeduct;
        remainingToDeduct -= canDeduct;
      }

      // 3. Dues
      if (remainingToDeduct > 0) {
        duesIncurred = remainingToDeduct;
        remainingToDeduct = 0;
      }

      const newTrialBalance = (wallet.trialBalance ?? 0) - trialDeducted;
      const newRechargeBalance = (wallet.rechargeBalance ?? 0) - rechargeDeducted;
      const newDues = (wallet.dues ?? 0) + duesIncurred;
      const newCombinedBalance = newTrialBalance + newRechargeBalance;

      // Prepare updates
      const updates: Record<string, any> = {
        'wallet.trialBalance': newTrialBalance,
        'wallet.rechargeBalance': newRechargeBalance,
        'wallet.balance': newCombinedBalance,
        'wallet.dues': newDues,
        ...additionalUpdates,
      };

      // Restriction Logic: If dues exist or balance <= 0
      if (newDues > 0 || newCombinedBalance <= PRICING_CONFIG.lowBalance.restrictedThreshold) {
        updates['subscription.status'] = 'restricted';
      }

      transaction.update(userRef, updates);

      // Log transaction
      const txnRef = userRef.collection('wallet_transactions').doc();
      const walletType: WalletTransaction['walletType'] = 
        trialDeducted > 0 && rechargeDeducted > 0 ? 'mixed' :
        trialDeducted > 0 ? 'trial' :
        rechargeDeducted > 0 ? 'recharge' : 'dues';

      // Build descriptive description for multi-wallet debits
      const breakdown = [];
      if (trialDeducted > 0) breakdown.push(`₹${trialDeducted} trial`);
      if (rechargeDeducted > 0) breakdown.push(`₹${rechargeDeducted} recharge`);
      if (duesIncurred > 0) breakdown.push(`₹${duesIncurred} dues`);
      
      const finalDescription = breakdown.length > 0 
        ? `${description} (Deducted: ${breakdown.join(', ')})`
        : description;

      const txn: Omit<WalletTransaction, 'id'> & { id: string } = {
        id: txnRef.id,
        type: 'debit',
        walletType,
        amount,
        trialDeducted,
        rechargeDeducted,
        duesIncurred,
        balanceAfter: newCombinedBalance,
        description: finalDescription,
        invoiceMonth,
        createdAt: new Date().toISOString(),
      };
      transaction.set(txnRef, txn);

      // The caller (e.g. generateMonthlyInvoice) is responsible for adding 
      // specific ledger entries (BASE_FEE, TENANT_USAGE) before/after this debit.
      // However, if this is a manual or generic debit, we should at least log the adjustment.
      if (!invoiceMonth) {
         await addBillingLedgerEntry(transaction, ownerId, {
           type: 'ADJUSTMENT',
           amount: -amount, // Negative for debit in ledger
           description: description,
           month: new Date().toISOString().slice(0, 7),
           metadata: {
             transactionId: txnRef.id,
           }
         });
      }

      return newCombinedBalance;
    });

    return { success: true, newBalance: result };
  } catch (error: any) {
    console.error('Error debiting wallet:', error);
    return { success: false, error: error.message };
  }
}

// ─── Transaction History ─────────────────────────────────────────────────────

export async function getWalletTransactions(
  ownerId: string, 
  limit: number = 10
): Promise<{ success: boolean; transactions?: WalletTransaction[]; error?: string }> {
  try {
    const adminDb = await getAdminDb();
    const snapshot = await adminDb
      .collection('users')
      .doc(ownerId)
      .collection('wallet_transactions')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    const transactions = snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
    })) as WalletTransaction[];

    return { success: true, transactions };
  } catch (error: any) {
    console.error('Error fetching wallet transactions:', error);
    return { success: false, error: error.message };
  }
}



// ─── Balance Runway Estimator ────────────────────────────────────────────────

export async function estimateBalanceRunway(ownerId: string): Promise<{
  success: boolean;
  daysLeft?: number;
  monthlyBill?: number;
  error?: string;
}> {
  try {
    const adminDb = await getAdminDb();
    const userDoc = await adminDb.collection('users').doc(ownerId).get();
    if (!userDoc.exists) return { success: false, error: 'Owner not found.' };

    const owner = userDoc.data() as User;
    const balance = owner.wallet?.balance ?? 0;
    const billingConfig = owner.billingConfig;

    // Get tenant count
    const guestsSnapshot = await adminDb
      .collection('users_data')
      .doc(ownerId)
      .collection('guests')
      .where('isVacated', '==', false)
      .get();

    const tenantCount = guestsSnapshot.docs.length;

    // Calculate monthly bill
    const baseFee = billingConfig?.baseFee ?? PRICING_CONFIG.baseFee;
    // Per-tenant fee based on plan type
    let perTenantFee = PRICING_CONFIG.monthly.perTenant;
    if (billingConfig?.planType === 'yearly') perTenantFee = PRICING_CONFIG.yearly.perTenant;
    else if (billingConfig?.planType === 'sixMonth') perTenantFee = PRICING_CONFIG.sixMonth.perTenant;
    else if (billingConfig?.planType === 'monthly') perTenantFee = PRICING_CONFIG.monthly.perTenant;

    // Admin Override
    if (billingConfig?.perTenantFee !== undefined) perTenantFee = billingConfig.perTenantFee;

    let monthlyBill = baseFee + (tenantCount * perTenantFee);

    // Apply discount if exists
    const discount = billingConfig?.discount;
    if (discount) {
      if (discount.type === 'flat') {
        monthlyBill = Math.max(0, monthlyBill - discount.value);
      } else if (discount.type === 'percentage') {
        monthlyBill = Math.max(0, monthlyBill * (1 - discount.value / 100));
      } else if (discount.type === 'free_base') {
        monthlyBill = tenantCount * perTenantFee;
      }
    }

    // Apply premium feature charges
    const premiumFeatures = owner.subscription?.premiumFeatures;
    if (premiumFeatures) {
      const featuresConfig = PRICING_CONFIG.premiumFeatures as any;
      for (const key of Object.keys(featuresConfig)) {
        const featureKey = key as keyof PremiumFeatures;
        const config = featuresConfig[key];
        if (premiumFeatures[featureKey]?.enabled) {
          if (config.billingType === 'monthly') {
            monthlyBill += config.monthlyCharge;
          } else if (config.billingType === 'per_tenant') {
            monthlyBill += tenantCount * config.perTenantCharge;
          }
        }
      }
    }

    const dailyCost = monthlyBill / 30;
    let daysLeft = dailyCost > 0 ? Math.floor(balance / dailyCost) : Infinity;

    if (isNaN(daysLeft)) daysLeft = 999;

    return {
      success: true,
      daysLeft: daysLeft === Infinity ? 999 : daysLeft,
      monthlyBill: Math.round(monthlyBill) || 0,
    };
  } catch (error: any) {
    console.error('Error estimating balance runway:', error);
    return { success: false, error: error.message };
  }
}

// ─── Admin: Credit / Debit Wallet ────────────────────────────────────────────

export async function adminWalletAdjustment(data: {
  ownerId: string;
  type: 'admin_credit' | 'admin_debit';
  amount: number;
  reason: string;
  adminId: string;
}): Promise<{ success: boolean; newBalance?: number; error?: string }> {
  const { ownerId, type, amount, reason, adminId } = data;

  if (amount <= 0) return { success: false, error: 'Amount must be positive.' };

  try {
    const adminDb = await getAdminDb();
    const userRef = adminDb.collection('users').doc(ownerId);

    const result = await adminDb.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) throw new Error('Owner not found.');

      const userData = userDoc.data() as User;
      const currentBalance = userData.wallet?.balance ?? 0;
      const newBalance = type === 'admin_credit'
        ? currentBalance + amount
        : currentBalance - amount;

      const updates: Record<string, any> = {
        'wallet.balance': newBalance,
      };

      // Handle status flip
      if (newBalance <= PRICING_CONFIG.lowBalance.restrictedThreshold) {
        updates['subscription.status'] = 'restricted';
      } else if (userData.subscription?.status === 'restricted' && newBalance > PRICING_CONFIG.lowBalance.restrictedThreshold) {
        updates['subscription.status'] = 'active';
      }

      transaction.update(userRef, updates);

      const txnRef = userRef.collection('wallet_transactions').doc();
      const txn: Omit<WalletTransaction, 'id'> & { id: string } = {
        id: txnRef.id,
        type,
        walletType: 'mixed',
        amount,
        balanceAfter: newBalance,
        description: `${type === 'admin_credit' ? 'Credit' : 'Debit'} by admin: ${reason}`,
        createdAt: new Date().toISOString(),
      };
      transaction.set(txnRef, txn);

      // Add Ledger Entry for Admin Adjustment
      await addBillingLedgerEntry(transaction, ownerId, {
        type: 'ADJUSTMENT',
        amount: type === 'admin_credit' ? amount : -amount,
        description: `${type === 'admin_credit' ? 'Credit' : 'Debit'} by admin: ${reason}`,
        month: new Date().toISOString().slice(0, 7),
        metadata: {
          transactionId: txnRef.id,
          adjustmentReason: reason,
          performedBy: adminId,
        }
      });

      return newBalance;
    });

    return { success: true, newBalance: result };
  } catch (error: any) {
    console.error('Error adjusting wallet:', error);
    return { success: false, error: error.message };
  }
}


// ─── Tenant-Linked Adjustments (Internal Helpers for Service Layer) ──────────

/**
 * Deducts the per-tenant fee from the owner's wallet.
 * To be called INSIDE a Firestore transaction.
 */
/**
 * Monthly batch billing logic: Just records the action.
 * Money is deducted via cron at month-end based on active status during the cycle.
 */
export async function handleTenantAddition(
  transaction: FirebaseFirestore.Transaction,
  ownerId: string,
  guestId: string,
  guestName: string
): Promise<number> {
  // We no longer deduct money immediately.
  // This function can be used to log the event or verify if addition is allowed.
  
  const adminDb = await getAdminDb();
  const userRef = adminDb.collection('users').doc(ownerId);
  const userDoc = await transaction.get(userRef);
  if (!userDoc.exists) throw new Error('Owner not found.');

  const userData = userDoc.data() as User;
  
  // Restriction Check: If restricted, don't allow adding tenants
  if (userData.subscription?.status === 'restricted') {
    throw new Error('Account restricted due to low balance or dues. Please recharge to add tenants.');
  }

  return 0; // No immediate deduction
}

/**
 * Vacate handler: No immediate refund needed as charging happens at month-end 
 * only for the duration stayed (if >= 1 day).
 */
export async function handleTenantVacation(
  transaction: FirebaseFirestore.Transaction,
  ownerId: string,
  guestId: string,
  guestName: string,
  joinDate: string,
  onboardingFeeDeducted: number = 0
): Promise<{ refunded: boolean; newBalance: number }> {
  // No immediate refund in the monthly batch model.
  // The monthly cron will handle duration-based charging.
  return { refunded: false, newBalance: 0 };
}

// ─── Recharge Suggestion ─────────────────────────────────────────────────────

export async function getRechargeRecommendation(ownerId: string): Promise<{
  success: boolean;
  recommendation?: { amount: number; months: number; message: string };
  error?: string;
}> {
  const runway = await estimateBalanceRunway(ownerId);
  if (!runway.success || !runway.monthlyBill) {
    return { success: false, error: runway.error || 'Could not estimate.' };
  }

  const monthlyBill = runway.monthlyBill;

  // Find the best recharge option that covers 3+ months
  const targetMonths = 3;
  const targetAmount = monthlyBill * targetMonths;
  
  // Sort options by amount
  const sortedOptions = [...PRICING_CONFIG.rechargeOptions].sort((a, b) => a.amount - b.amount);
  
  // Find first option >= targetAmount, or use the largest one
  const bestOptionObj = sortedOptions.find(opt => opt.amount >= targetAmount) || sortedOptions[sortedOptions.length - 1];
  const bestOptionAmount = bestOptionObj.amount;

  const monthsCovered = Math.floor(bestOptionAmount / monthlyBill);

  return {
    success: true,
    recommendation: {
      amount: bestOptionAmount,
      months: monthsCovered,
      message: `Based on your usage, ₹${bestOptionAmount.toLocaleString('en-IN')} lasts ~${monthsCovered} months`,
    },
  };
}
