import { randomUUID } from 'crypto';

export interface MaintenanceOwnerGroup {
  standard: string[];
  enterprise: string[];
}

export function categorizeOwners(ownerDocs: Array<{ id: string; data: any }>): MaintenanceOwnerGroup {
  return ownerDocs.reduce<MaintenanceOwnerGroup>(
    (acc, ownerDoc) => {
      const planId = ownerDoc.data?.subscription?.planId;
      if (planId === 'enterprise') {
        acc.enterprise.push(ownerDoc.id);
      } else {
        acc.standard.push(ownerDoc.id);
      }
      return acc;
    },
    { standard: [], enterprise: [] }
  );
}

export async function runMaintenanceCron(options?: { includeEnterprise?: boolean; maxStandardOwners?: number }) {
  const { getAdminDb } = await import('@/lib/firebaseAdmin');
  const { reconcileAllGuests } = await import('@/lib/actions/reconciliationActions');
  const { sendRemindersForOwner } = await import('@/lib/actions/reminderActions');
  const { runMonthlyBillingCron } = await import('@/lib/actions/subscriptionActions');
  const { FirestoreJobQueue } = await import('@/lib/queue/FirestoreJobQueue');

  const adminDb = await getAdminDb();
  const ownerDocs = await adminDb.collection('users').where('role', '==', 'owner').get();
  const ownerEntries = ownerDocs.docs.map((doc) => ({ id: doc.id, data: doc.data() }));
  const groups = categorizeOwners(ownerEntries);

  const results: Record<string, any> = {
    standard: {
      billing: null as any,
      reconciliation: null as any,
      reminders: null as any,
    },
    enterprise: {
      queued: 0,
      jobIds: [] as string[],
    },
  };

  const standardOwners = options?.maxStandardOwners ? groups.standard.slice(0, options.maxStandardOwners) : groups.standard;

  if (standardOwners.length > 0) {
    results.standard.billing = await runMonthlyBillingCron();
    results.standard.reconciliation = await reconcileAllGuests(undefined, new Date());

    const reminderResults = [] as Array<{ ownerId: string; result: any }>;
    for (const ownerId of standardOwners) {
      reminderResults.push({ ownerId, result: await sendRemindersForOwner(ownerId, new Date()) });
    }
    results.standard.reminders = reminderResults;
  }

  if (options?.includeEnterprise !== false && groups.enterprise.length > 0) {
    const queue = new FirestoreJobQueue();
    const enqueuePromises: Promise<void>[] = [];
    for (const ownerId of groups.enterprise) {
      const jobId = randomUUID();
      enqueuePromises.push(queue.enqueue({
        jobId,
        type: 'run-scheduled-jobs',
        targetDomain: process.env.NEXT_PUBLIC_APP_URL || 'https://rentsutra.in',
        ownerId,
      }));
      results.enterprise.jobIds.push(jobId);
      results.enterprise.queued += 1;
    }
    await Promise.allSettled(enqueuePromises);
  }

  return results;
}
