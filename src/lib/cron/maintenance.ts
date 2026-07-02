import { randomUUID } from 'crypto';
import { signPayload, SignedPayload } from '@/lib/cryptoUtils';

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

export interface EnterpriseDispatchPayload {
  jobId: string;
  type: 'run-scheduled-jobs';
  targetDomain: string;
  tenantId: string;
  signedPayload?: SignedPayload;
}

export async function dispatchEnterpriseMaintenance(
  ownerDocs: Array<{ id: string; data: any }>,
  options?: {
    targetDomain?: string;
    send?: (payload: SignedPayload, tenantId: string) => Promise<any>;
  }
): Promise<EnterpriseDispatchPayload[]> {
  const payloads: EnterpriseDispatchPayload[] = [];
  const targetDomain = options?.targetDomain || process.env.NEXT_PUBLIC_APP_URL || 'https://rentsutra.in';
  const secret = process.env.CRON_SECRET || 'dev-secret';

  for (const ownerDoc of ownerDocs) {
    const ownerId = ownerDoc.id;
    const jobId = randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);
    const payload: Omit<SignedPayload, 'signature'> = {
      jobId,
      version: 1,
      issuedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      tenantId: ownerId,
      type: 'run-scheduled-jobs',
    };
    const signedPayload: SignedPayload = {
      ...payload,
      signature: signPayload(payload, secret),
    };

    const dispatchPayload: EnterpriseDispatchPayload = {
      jobId,
      type: 'run-scheduled-jobs',
      targetDomain,
      tenantId: ownerId,
      signedPayload,
    };

    payloads.push(dispatchPayload);

    if (options?.send) {
      await options.send(signedPayload, ownerId);
    }
  }

  return payloads;
}

export async function runMaintenanceCron(options?: { includeEnterprise?: boolean; maxStandardOwners?: number }) {
  const { getAdminDb } = await import('@/lib/firebaseAdmin');
  const { reconcileAllGuests } = await import('@/lib/actions/reconciliationActions');
  const { sendRemindersForOwner } = await import('@/lib/actions/reminderActions');
  const { runMonthlyBillingCron } = await import('@/lib/actions/subscriptionActions');

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
    const enterprisePayloads = await dispatchEnterpriseMaintenance(groups.enterprise, {
      targetDomain: process.env.NEXT_PUBLIC_APP_URL || 'https://rentsutra.in',
      send: async (signedPayload, tenantId) => {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://rentsutra.in';
        await fetch(`${baseUrl}/api/internal/jobs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-tenant-id': tenantId,
          },
          body: JSON.stringify(signedPayload),
        });
      },
    });
    results.enterprise.queued = enterprisePayloads.length;
    results.enterprise.jobIds = enterprisePayloads.map((payload) => payload.jobId);
  }

  return results;
}
