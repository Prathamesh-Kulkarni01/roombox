/**
 * Canonical enterprise isolation checks.
 *
 * Owner subscription metadata always lives on central `users/{ownerId}`.
 * Guest/PG operational data for isolated owners lives on the BYODB shard.
 *
 * Use `isEnterpriseIsolated()` everywhere — not `planId === 'enterprise'` alone.
 */

export function getEnterpriseProject(
  ownerData: Record<string, unknown> | null | undefined
): Record<string, unknown> | null {
  const subscription = ownerData?.subscription as Record<string, unknown> | undefined;
  const enterpriseProject = subscription?.enterpriseProject as Record<string, unknown> | undefined;
  return enterpriseProject ?? null;
}

/**
 * Owner has a BYODB shard with credentials — guest data must not touch central DB.
 */
export function isEnterpriseIsolated(ownerData: Record<string, unknown> | null | undefined): boolean {
  const enterpriseProject = getEnterpriseProject(ownerData);
  if (!enterpriseProject?.projectId) return false;
  return !!(enterpriseProject.serviceAccountJson || enterpriseProject.oauthTokens);
}

/** Owner is on the enterprise billing tier (may not yet have isolated credentials). */
export function isEnterprisePlan(ownerData: Record<string, unknown> | null | undefined): boolean {
  const subscription = ownerData?.subscription as Record<string, unknown> | undefined;
  return subscription?.planId === 'enterprise';
}

/** @deprecated Use isEnterpriseIsolated */
export const hasEnterpriseDataIsolation = isEnterpriseIsolated;
