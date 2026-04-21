import type { FeaturePermissions } from './permissions';

/**
 * Converts a flat array of "feature:action" strings into a FeaturePermissions object.
 *
 * Kept in a small standalone module to avoid bundler/export edge-cases when importing
 * from the larger `permissions.ts` config module.
 */
export function parseStaffPermissions(perms: string[]): FeaturePermissions {
  const result: FeaturePermissions = {};
  perms.forEach((p) => {
    const [feature, action] = p.split(':');
    if (feature && action) {
      if (!result[feature]) result[feature] = {};
      result[feature][action] = true;
    }
  });
  return result;
}

