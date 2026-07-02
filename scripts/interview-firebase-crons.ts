// import { setTimeout as delay } from 'timers/promises';

// process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8081';
// process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
// process.env.FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'roombox-test';
// process.env.NEXT_PUBLIC_USE_EMULATOR = 'true';

// async function main() {
//   const [{ getAdminDb, getAdminAuth }, { reconcileAllGuests }, {  }, { runMonthlyBillingCron }, { PropertyService }, { initializeOwnerTrial }] = await Promise.all([
//     import('../src/lib/firebaseAdmin'),
//     import('../src/lib/actions/reconciliationActions'),
//     import('../src/lib/actions/walletActions'),
//   ]);
//   const db = await getAdminDb();
//   const auth = await getAdminAuth();
//   const ownerId = 'interview-owner';

//   console.log('Creating dummy owner, property, rooms, beds, and guest data...');

//   await db.collection('users').doc(ownerId).set({
//     role: 'owner',
//     name: 'Interview Owner',
//     email: 'interview-owner@example.com',
//     subscription: { planId: 'free', status: 'active', whatsappCredits: 100 },
//     wallet: { balance: 1000, trialBalance: 0, rechargeBalance: 1000, dues: 0 },
//     createdAt: new Date().toISOString(),
//   });

//   await initializeOwnerTrial(ownerId);

//   const performer = { name: 'Interview Harness', role: 'system', id: 'system' };
//   const createdProperty = await PropertyService.createProperty(db, {
//     ownerId,
//     name: 'Interview PG',
//     location: 'Localhost',
//     city: 'Bengaluru',
//     gender: 'unisex',
//     autoSetup: true,
//     floorCount: 1,
//     roomsPerFloor: 1,
//     bedsPerRoom: 2,
//     planId: 'trial',
//   }, performer as any);

//   const pgId = createdProperty.id;
//   const pgSnap = await db.collection('users_data').doc(ownerId).collection('pgs').doc(pgId).get();
//   if (!pgSnap.exists) {
//     throw new Error('Property was not created.');
//   }

//   const pgData = pgSnap.data() as any;
//   const room = pgData.floors?.[0]?.rooms?.[0];
//   const bedId = room?.beds?.[0]?.id;
//   const roomId = room?.id;

//   if (!room || !bedId) {
//     throw new Error('Expected generated room and bed were not created.');
//   }

//   const guestId = 'interview-guest';
//   await db.collection('users_data').doc(ownerId).collection('guests').doc(guestId).set({
//     id: guestId,
//     name: 'Interview Guest',
//     phone: '919999999999',
//     pgId,
//     ownerId,
//     roomId,
//     bedId,
//     roomName: room.name,
//     pgName: pgData.name,
//     rentAmount: 5000,
//     depositAmount: 10000,
//     balance: 0,
//     rentStatus: 'paid',
//     isVacated: false,
//     rentCycleUnit: 'months',
//     rentCycleValue: 1,
//     dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
//     moveInDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
//     createdAt: new Date().toISOString(),
//     ledger: [],
//   });

//   console.log('Seeded ownerId=', ownerId, 'pgId=', pgId, 'roomId=', roomId, 'bedId=', bedId, 'guestId=', guestId);

//   console.log('Running reconciliation cron...');
//   const reconcileResult = await reconcileAllGuests(10, new Date());
//   console.log('reconcileResult', reconcileResult);

//   console.log('Running reminder cron...');
//   const reminderResult = await sendRemindersForOwner(ownerId, new Date());
//   console.log('reminderResult', reminderResult);

//   console.log('Running billing cron...');
//   const billingResult = await runMonthlyBillingCron();
//   console.log('billingResult', billingResult);

//   const userDoc = await db.collection('users').doc(ownerId).get();
//   console.log('owner snapshot', userDoc.data());

//   const guestDoc = await db.collection('users_data').doc(ownerId).collection('guests').doc(guestId).get();
//   console.log('guest snapshot', guestDoc.data());

//   const queuedJobs = await db.collection('system_jobs').get();
//   console.log('system_jobs count', queuedJobs.size);

//   await delay(1000);
//   console.log('Interview cron validation complete.');
// }

// main().catch((error) => {
//   console.error(error);
//   process.exit(1);
// });
