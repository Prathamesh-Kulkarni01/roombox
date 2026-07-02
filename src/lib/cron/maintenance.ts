import { randomUUID } from 'crypto';
import { signPayload, SignedPayload } from '@/lib/cryptoUtils';
import {
  DispatchableEnterpriseOwner,
  filterDispatchableEnterpriseOwners,
  type EnterpriseOwnerEntry,
} from '@/lib/cron/enterprise-utils';

export interface MaintenanceOwnerGroup {
  standard: string[];
  enterprise: string[];
}

export function categorizeOwners(ownerDocs: EnterpriseOwnerEntry[]): MaintenanceOwnerGroup {
  return ownerDocs.reduce<MaintenanceOwnerGroup>(
    (acc, ownerDoc) => {
      const subscription = ownerDoc.data?.subscription as Record<string, unknown> | undefined;
      const planId = subscription?.planId;
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
  signedPayload: SignedPayload;
}

export interface EnterpriseDispatchResult {
  tenantId: string;
  jobId: string;
  targetDomain: string;
  ok: boolean;
  status?: number;
  error?: string;
}

function getSigningSecret(): string {
  const secret = process.env.CRON_SECRET?.trim();
  if (process.env.NODE_ENV === 'production' && !secret) {
    throw new Error('CRON_SECRET is required for enterprise cron dispatch in production');
  }
  return secret || 'dev-secret';
}

export async function dispatchEnterpriseMaintenance(
  owners: DispatchableEnterpriseOwner[],
  options?: {
    send?: (
      signedPayload: SignedPayload,
      tenantId: string,
      targetDomain: string
    ) => Promise<Pick<EnterpriseDispatchResult, 'ok' | 'status' | 'error'>>;
  }
): Promise<{ payloads: EnterpriseDispatchPayload[]; results: EnterpriseDispatchResult[] }> {
  const secret = getSigningSecret();
  const payloads: EnterpriseDispatchPayload[] = [];
  const results: EnterpriseDispatchResult[] = [];

  for (const owner of owners) {
    const ownerId = owner.id;
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

    payloads.push({
      jobId,
      type: 'run-scheduled-jobs',
      targetDomain: owner.targetDomain,
      tenantId: ownerId,
      signedPayload,
    });

    let dispatchResult: Pick<EnterpriseDispatchResult, 'ok' | 'status' | 'error'> = { ok: true };
    if (options?.send) {
      dispatchResult = await options.send(signedPayload, ownerId, owner.targetDomain);
    }

    results.push({
      tenantId: ownerId,
      jobId,
      targetDomain: owner.targetDomain,
      ...dispatchResult,
    });
  }

  return { payloads, results };
}

export async function runMaintenanceCron(options?: { includeEnterprise?: boolean; maxStandardOwners?: number }) {
  const { getAdminDb } = await import('@/lib/firebaseAdmin');
  const { reconcileAllGuests } = await import('@/lib/actions/reconciliationActions');
  const { sendRemindersForOwner } = await import('@/lib/actions/reminderActions');
  const { runMonthlyBillingCron } = await import('@/lib/actions/subscriptionActions');

  const adminDb = await getAdminDb();
  const ownerDocs = await adminDb.collection('users').where('role', '==', 'owner').get();
  const ownerEntries: EnterpriseOwnerEntry[] = ownerDocs.docs.map((doc) => ({
    id: doc.id,
    data: doc.data() as Record<string, unknown>,
  }));
  const groups = categorizeOwners(ownerEntries);

  const results: Record<string, unknown> = {
    standard: {
      billing: null as unknown,
      reconciliation: null as unknown,
      reminders: null as unknown,
    },
    enterprise: {
      queued: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      jobIds: [] as string[],
      errors: [] as Array<{ tenantId: string; jobId: string; error: string }>,
    },
  };

  const standardOwners = options?.maxStandardOwners
    ? groups.standard.slice(0, options.maxStandardOwners)
    : groups.standard;

  if (standardOwners.length > 0) {
    results.standard = {
      billing: await runMonthlyBillingCron(),
      reconciliation: await reconcileAllGuests(undefined, new Date()),
      reminders: [] as Array<{ ownerId: string; result: unknown }>,
    };

    const reminderResults = (results.standard as { reminders: Array<{ ownerId: string; result: unknown }> })
      .reminders;
    for (const ownerId of standardOwners) {
      reminderResults.push({ ownerId, result: await sendRemindersForOwner(ownerId, new Date()) });
    }
  }

  const enterpriseCandidates = ownerEntries.filter((entry) => groups.enterprise.includes(entry.id));
  const skippedEnterprise = enterpriseCandidates.length;
  const dispatchableEnterprise = await filterDispatchableEnterpriseOwners(enterpriseCandidates);

  const enterpriseSummary = results.enterprise as {
    queued: number;
    succeeded: number;
    failed: number;
    skipped: number;
    jobIds: string[];
    errors: Array<{ tenantId: string; jobId: string; error: string }>;
  };

  enterpriseSummary.skipped = skippedEnterprise - dispatchableEnterprise.length;

  if (options?.includeEnterprise !== false && dispatchableEnterprise.length > 0) {
    const { payloads, results: dispatchResults } = await dispatchEnterpriseMaintenance(
      dispatchableEnterprise,
      {
        send: async (signedPayload, _tenantId, targetDomain) => {
          try {
            const response = await fetch(`${targetDomain}/api/internal/jobs`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(signedPayload),
            });

            if (!response.ok) {
              const text = await response.text().catch(() => '');
              return {
                ok: false,
                status: response.status,
                error: text || response.statusText,
              };
            }

            return { ok: true, status: response.status };
          } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Dispatch failed';
            return { ok: false, error: message };
          }
        },
      }
    );

    enterpriseSummary.queued = payloads.length;
    enterpriseSummary.jobIds = payloads.map((payload) => payload.jobId);
    enterpriseSummary.succeeded = dispatchResults.filter((result) => result.ok).length;
    enterpriseSummary.failed = dispatchResults.filter((result) => !result.ok).length;
    enterpriseSummary.errors = dispatchResults
      .filter((result) => !result.ok)
      .map((result) => ({
        tenantId: result.tenantId,
        jobId: result.jobId,
        error: result.error || `HTTP ${result.status ?? 'unknown'}`,
      }));
  }

  return results;
}
