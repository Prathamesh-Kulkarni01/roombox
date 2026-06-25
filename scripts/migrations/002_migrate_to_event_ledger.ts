import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '../../src/lib/firebaseAdmin';
import type { FinancialEvent, FinancialEventType } from '../../src/lib/types';
import { randomUUID } from 'crypto';

export async function up() {
  console.log('Starting migration 002_migrate_to_event_ledger...');
  const adminDb = await getAdminDb();

  // Check if this migration has already run
  const migrationRef = adminDb.collection('system_migrations').doc('002_migrate_to_event_ledger');
  const doc = await migrationRef.get();
  if (doc.exists) {
    console.log('Migration 002 already executed. Skipping.');
    return;
  }

  const usersSnapshot = await adminDb.collection('users_data').get();
  let migratedGuestsCount = 0;
  let totalEventsCreated = 0;

  for (const userDoc of usersSnapshot.docs) {
    const ownerId = userDoc.id;
    const guestsSnapshot = await userDoc.ref.collection('guests').get();

    for (const guestDoc of guestsSnapshot.docs) {
      const guestData = guestDoc.data();
      const guestId = guestDoc.id;

      const ledgerArray = guestData.ledger || [];
      const paymentHistory = guestData.paymentHistory || [];
      
      let computedBalance = 0;
      let computedWallet = guestData.depositAmount || 0; // Initialize wallet with the initial security deposit

      if (ledgerArray.length > 0 || paymentHistory.length > 0) {
        // Run migration in a transaction per guest
        await adminDb.runTransaction(async (transaction) => {
          // 1. Create financial events for the legacy ledger
          for (const item of ledgerArray) {
            const eventRef = guestDoc.ref.collection('financial_events').doc();
            let type: FinancialEventType = 'other_charge';
            let amount = item.amount;
            
            if (item.type === 'credit') {
               type = 'payment_received';
               amount = -amount; // Credit is negative in new system
            } else if (item.type === 'debit') {
               type = 'rent_charge';
               // Debit is positive
            }
            
            const event: FinancialEvent = {
              id: eventRef.id,
              guestId,
              pgId: guestData.pgId || '',
              ownerId,
              type,
              amount,
              description: item.description || (type === 'payment_received' ? 'Payment' : 'Charge'),
              date: item.date || new Date().toISOString(),
              createdAt: new Date().toISOString(),
              createdBy: 'migration_script',
              schemaVersion: 1
            };
            
            transaction.set(eventRef, event);
            computedBalance += amount;
            totalEventsCreated++;
          }
          
          // Note: if paymentHistory existed but wasn't in ledger, we would add them here.
          // But historically paymentHistory is parallel or appended to ledger.
          // For safety, we just use the ledger array which has debit/credits.

          // 2. Add an initial event for the security deposit Escrow
          if (computedWallet > 0) {
            const depRef = guestDoc.ref.collection('financial_events').doc();
            const depEvent: FinancialEvent = {
              id: depRef.id,
              guestId,
              pgId: guestData.pgId || '',
              ownerId,
              type: 'deposit_received',
              amount: computedWallet, // Doesn't affect rent balance, only wallet
              description: 'Initial Security Deposit recorded',
              date: guestData.moveInDate || new Date().toISOString(),
              createdAt: new Date().toISOString(),
              createdBy: 'migration_script',
              schemaVersion: 1
            };
            transaction.set(depRef, depEvent);
            totalEventsCreated++;
          }

          // 3. Update guest document, deprecating the array
          transaction.update(guestDoc.ref, {
            balance: computedBalance,
            walletBalance: computedWallet,
            ledger: FieldValue.delete(), // delete the old field if possible, else just ignore. Actually better to keep it null
            schemaVersion: 2 // upgrade guest schema
          });
        });
        
        migratedGuestsCount++;
      } else {
        // Just update schema version and wallet if they have a deposit but no ledger
        if (guestData.depositAmount > 0) {
            const depRef = guestDoc.ref.collection('financial_events').doc();
            const depEvent: FinancialEvent = {
              id: depRef.id,
              guestId,
              pgId: guestData.pgId || '',
              ownerId,
              type: 'deposit_received',
              amount: guestData.depositAmount, 
              description: 'Initial Security Deposit recorded',
              date: guestData.moveInDate || new Date().toISOString(),
              createdAt: new Date().toISOString(),
              createdBy: 'migration_script',
              schemaVersion: 1
            };
            await depRef.set(depEvent);
            totalEventsCreated++;
        }
        await guestDoc.ref.update({
           schemaVersion: 2,
           walletBalance: guestData.depositAmount || 0,
           balance: guestData.balance || 0 // Keep as is
        });
      }
    }
  }

  // Mark migration as done
  await migrationRef.set({
    name: '002_migrate_to_event_ledger',
    executedAt: new Date().toISOString(),
    migratedGuestsCount,
    totalEventsCreated,
    schemaVersionTarget: 2
  });

  console.log(`Migration complete. Migrated ${migratedGuestsCount} guests with ${totalEventsCreated} events.`);
}

// To run via CLI
if (require.main === module) {
  up().then(() => process.exit(0)).catch(console.error);
}
