
import { getAdminDb } from '../src/lib/firebaseAdmin';
import { PRICING_CONFIG } from '../src/lib/constants';
import { 
  initializeOwnerTrial, 
  processRecharge, 
  debitWallet, 
  getWalletTransactions,
  getWalletBalance
} from '../src/lib/actions/walletActions';
import { calculateOwnerBill } from '../src/lib/actions/billingActions';

// Set emulator env vars
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8081';
process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
process.env.FIREBASE_PROJECT_ID = 'roombox-test';

async function verifyBillingSystem() {
  console.log('--- Verifying Billing & Wallet System ---');
  
  const db = await getAdminDb();
  const ownerId = `owner_verify_${Date.now()}`;
  const pgId = `pg_verify_${Date.now()}`;

  // 1. Initialize Owner with Trial Credit
  console.log('\n1. Initializing Owner Trial Credit...');
  await db.collection('users').doc(ownerId).set({
    id: ownerId,
    name: 'Verify Owner',
    role: 'owner',
    email: 'verify@test.com',
    createdAt: new Date().toISOString()
  });

  await initializeOwnerTrial(ownerId);
  
  const { wallet } = await getWalletBalance(ownerId);
  console.log('Wallet Status:', JSON.stringify(wallet, null, 2));

  if (wallet?.trialBalance === PRICING_CONFIG.trial.credit && wallet?.rechargeBalance === 0) {
    console.log('✅ Trial credit initialized correctly.');
  } else {
    console.error('❌ Trial credit initialization failed.');
  }

  // 2. Test Deduction Priority (Trial First)
  console.log('\n2. Testing Deduction Priority (Trial First)...');
  const deduction1 = 200; // Base Fee
  await debitWallet({
    ownerId,
    amount: deduction1,
    description: 'Monthly Base Fee (Test)'
  });

  const { wallet: wallet2 } = await getWalletBalance(ownerId);
  console.log(`Deducted ₹${deduction1}. New Trial Balance: ${wallet2?.trialBalance}`);

  if (wallet2?.trialBalance === PRICING_CONFIG.trial.credit - deduction1 && wallet2?.rechargeBalance === 0) {
    console.log('✅ Trial balance deducted first.');
  } else {
    console.error('❌ Trial balance deduction failed.');
  }

  // 3. Test Recharge & Idempotency
  console.log('\n3. Testing Recharge & Idempotency...');
  const rechargeAmount = 1000;
  const paymentId = `pay_${Date.now()}`;
  
  console.log(`Processing recharge of ₹${rechargeAmount} (ID: ${paymentId})...`);
  await processRecharge({
    ownerId,
    amount: rechargeAmount,
    razorpayPaymentId: paymentId,
    description: 'Test Recharge'
  });

  const { wallet: wallet3 } = await getWalletBalance(ownerId);
  console.log(`New Recharge Balance: ${wallet3?.rechargeBalance}, Combined: ${wallet3?.balance}`);

  if (wallet3?.rechargeBalance === rechargeAmount) {
    console.log('✅ Recharge successful.');
  } else {
    console.error('❌ Recharge failed.');
  }

  console.log('Testing idempotency (sending same payment ID again)...');
  try {
    const retry = await processRecharge({
      ownerId,
      amount: rechargeAmount,
      razorpayPaymentId: paymentId,
      description: 'Duplicate Recharge'
    });
    if (!retry.success) {
      console.log('✅ Idempotency check PASSED (Duplicate blocked).');
    } else {
      console.error('❌ Idempotency check FAILED (Duplicate allowed!).');
    }
  } catch (e) {
    console.log('✅ Idempotency check PASSED (Error thrown on duplicate).');
  }

  // 4. Test Mixed Deduction (Trial -> Recharge)
  console.log('\n4. Testing Mixed Deduction (Trial -> Recharge)...');
  // Current trial: 300, Current recharge: 1000. Total: 1300.
  // Let's deduct 500. Expected: trial 0, recharge 800.
  const currentTrial = wallet3?.trialBalance || 0;
  const deduction2 = currentTrial + 200;
  
  await debitWallet({
    ownerId,
    amount: deduction2,
    description: 'Large Deduction (Mixed)'
  });

  const { wallet: wallet4 } = await getWalletBalance(ownerId);
  console.log(`Deducted ₹${deduction2}. New Trial: ${wallet4?.trialBalance}, New Recharge: ${wallet4?.rechargeBalance}`);

  if (wallet4?.trialBalance === 0 && wallet4?.rechargeBalance === 800) {
    console.log('✅ Mixed deduction priority correct.');
  } else {
    console.error('❌ Mixed deduction failed.');
  }

  // 5. Test Dues & Restriction
  console.log('\n5. Testing Dues & Restriction...');
  // Current combined: 800. Let's deduct 1000. Expected: trial 0, recharge 0, dues 200, status restricted.
  await debitWallet({
    ownerId,
    amount: 1000,
    description: 'Excessive Deduction (Dues)'
  });

  const { wallet: wallet5 } = await getWalletBalance(ownerId);
  const userDoc = await db.collection('users').doc(ownerId).get();
  const userData = userDoc.data();
  
  console.log(`New Dues: ${wallet5?.dues}, Combined Balance: ${wallet5?.balance}, Status: ${userData?.subscription?.status}`);

  if (wallet5?.dues === 200 && userData?.subscription?.status === 'restricted') {
    console.log('✅ Dues and Restriction logic correct.');
  } else {
    console.error('❌ Dues/Restriction failed.');
  }

  // 6. Test Billing Calculation (Live Bill)
  console.log('\n6. Testing Billing Calculation (Live Bill)...');
  // Setup PG and 2 tenants
  await db.collection('users_data').doc(ownerId).collection('pgs').doc(pgId).set({
    id: pgId,
    name: 'Verify PG',
    ownerId
  });

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  
  for(let i=1; i<=2; i++) {
    await db.collection('users_data').doc(ownerId).collection('guests').doc(`tenant_${i}`).set({
      id: `tenant_${i}`,
      name: `Tenant ${i}`,
      pgId,
      ownerId,
      moveInDate: startOfMonth,
      isVacated: false
    });
  }

  const bill = await calculateOwnerBill(userData as any);
  console.log('Calculated Bill Breakdown:', JSON.stringify(bill.currentCycle, null, 2));
  
  // Base fee 200 + (2 tenants * 30) = 260
  if (bill.currentCycle.totalAmount === 260) {
    console.log('✅ Bill calculation correct (200 base + 2*30 tenants).');
  } else {
    console.error(`❌ Bill calculation incorrect. Expected 260, got ${bill.currentCycle.totalAmount}`);
  }

  console.log('\n--- VERIFICATION COMPLETE ---');
}

verifyBillingSystem().catch(console.error);
