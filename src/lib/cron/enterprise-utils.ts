export interface EnterpriseOwnerEntry {
  id: string;
  data: Record<string, unknown>;
}

export interface DispatchableEnterpriseOwner extends EnterpriseOwnerEntry {
  targetDomain: string;
}

/**
 * Enterprise tenants must have an isolated Firebase project with credentials
 * before any guest data (reconciliation / reminders) is processed.
 */
export function hasEnterpriseDataIsolation(ownerData: Record<string, unknown>): boolean {
  const subscription = ownerData?.subscription as Record<string, unknown> | undefined;
  const enterpriseProject = subscription?.enterpriseProject as Record<string, unknown> | undefined;

  if (!enterpriseProject?.projectId) return false;

  return !!(enterpriseProject.serviceAccountJson || enterpriseProject.oauthTokens);
}

export function resolveEnterpriseTargetDomain(
  enterpriseProject: Record<string, unknown>,
  baseAppUrl?: string
): string | null {
  const base = baseAppUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://rentsutra.in';

  if (enterpriseProject.customDomain) {
    return `https://${enterpriseProject.customDomain}`;
  }

  const clientConfig = enterpriseProject.clientConfig as Record<string, unknown> | undefined;
  if (clientConfig?.subdomain) {
    const parsedBase = new URL(base);
    return `https://${clientConfig.subdomain}.${parsedBase.hostname}`;
  }

  return null;
}

async function resolveEnterpriseTargetDomainForOwner(
  ownerId: string,
  enterpriseProject: Record<string, unknown>,
  baseAppUrl?: string
): Promise<string | null> {
  const direct = resolveEnterpriseTargetDomain(enterpriseProject, baseAppUrl);
  if (direct) return direct;

  const base = (baseAppUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://rentsutra.in').replace(/\/+$/, '');
  const { getBrandedAppUrl } = await import('@/lib/actions/siteActions');
  const brandedUrl = (await getBrandedAppUrl(ownerId, base)).replace(/\/+$/, '');

  if (brandedUrl && brandedUrl !== base) {
    return brandedUrl;
  }

  return null;
}

/**
 * Blocks guest-data jobs on the central cron path for enterprise owners.
 * Enterprise reconciliation/reminders must run via signed tenant dispatch only.
 */
export async function isCentralGuestDataAccessBlocked(
  ownerId: string,
  tenantScheduled = false
): Promise<boolean> {
  if (tenantScheduled) return false;

  const { getAdminDb } = await import('@/lib/firebaseAdmin');
  const adminDb = await getAdminDb();
  const ownerDoc = await adminDb.collection('users').doc(ownerId).get();
  const subscription = ownerDoc.data()?.subscription as Record<string, unknown> | undefined;

  if (subscription?.planId === 'enterprise') {
    console.warn(
      `[Privacy] Blocked central-path guest-data access for enterprise owner ${ownerId}. Use tenant dispatcher.`
    );
    return true;
  }

  return false;
}

export async function filterDispatchableEnterpriseOwners(
  ownerEntries: EnterpriseOwnerEntry[],
  options?: { allowProdDomainsInDev?: boolean }
): Promise<DispatchableEnterpriseOwner[]> {
  const baseAppUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://rentsutra.in';
  const dispatchable: DispatchableEnterpriseOwner[] = [];

  for (const entry of ownerEntries) {
    const subscription = entry.data?.subscription as Record<string, unknown> | undefined;
    if (subscription?.planId !== 'enterprise') continue;

    if (!hasEnterpriseDataIsolation(entry.data)) {
      console.warn(
        `[Cron] Enterprise owner ${entry.id} is missing isolated project credentials. Skipping guest-data jobs.`
      );
      continue;
    }

    const enterpriseProject = subscription.enterpriseProject as Record<string, unknown>;
    const targetDomain = await resolveEnterpriseTargetDomainForOwner(
      entry.id,
      enterpriseProject,
      baseAppUrl
    );
    if (!targetDomain) {
      console.warn(`[Cron] Enterprise owner ${entry.id} has no tenant domain configured. Skipping.`);
      continue;
    }

    if (
      process.env.NODE_ENV !== 'production' &&
      !options?.allowProdDomainsInDev &&
      targetDomain.includes('rentsutra.in')
    ) {
      console.log(`[Cron] Local dev: would dispatch to ${targetDomain} for owner ${entry.id}`);
      continue;
    }

    dispatchable.push({ ...entry, targetDomain });
  }

  return dispatchable;
}
