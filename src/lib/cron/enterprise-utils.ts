import { isEnterpriseIsolated, isEnterprisePlan } from '@/lib/enterprise/isolation';

export {
  isEnterpriseIsolated,
  isEnterprisePlan,
  getEnterpriseProject,
  hasEnterpriseDataIsolation,
} from '@/lib/enterprise/isolation';

export interface EnterpriseOwnerEntry {
  id: string;
  data: Record<string, unknown>;
}

export interface DispatchableEnterpriseOwner extends EnterpriseOwnerEntry {
  targetDomain: string;
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
 * Blocks guest-data jobs on the central cron path for isolated enterprise owners.
 * Enterprise reconciliation/reminders must run via signed tenant dispatch only.
 */
export async function isCentralGuestDataAccessBlocked(
  ownerId: string,
  tenantScheduled = false,
  knownIsolationStatus?: boolean
): Promise<boolean> {
  if (tenantScheduled) return false;

  let isIsolated = knownIsolationStatus;

  if (isIsolated === undefined) {
    const { getAdminDb } = await import('@/lib/firebaseAdmin');
    const adminDb = await getAdminDb();
    const ownerDoc = await adminDb.collection('users').doc(ownerId).get();
    isIsolated = isEnterpriseIsolated(ownerDoc.data() as Record<string, unknown>);
  }

  if (isIsolated) {
    console.warn(
      `[Privacy] Blocked central-path guest-data access for isolated enterprise owner ${ownerId}. Use tenant dispatcher.`
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
    if (!isEnterpriseIsolated(entry.data)) {
      if (isEnterprisePlan(entry.data)) {
        console.warn(
          `[Cron] Enterprise-plan owner ${entry.id} is missing isolated project credentials. Skipping guest-data jobs.`
        );
      }
      continue;
    }

    const subscription = entry.data?.subscription as Record<string, unknown> | undefined;
    const enterpriseProject = subscription?.enterpriseProject as Record<string, unknown>;
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
