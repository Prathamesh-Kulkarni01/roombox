
import type { UserRole } from './types';


// Type definition for a single feature's permissions
export type FeatureActions = { [key: string]: boolean };

// Type definition for all feature permissions
export type FeaturePermissions = { [key: string]: FeatureActions };

// This maps a UserRole to a full set of feature permissions
export type RolePermissions = Record<UserRole, FeaturePermissions | null>;

/**
 * Type guard for FeaturePermissions
 */
export function isFeaturePermissions(
  permissions: RolePermissions | FeaturePermissions | null | undefined
): permissions is FeaturePermissions {
  if (!permissions) return false;
  const firstKey = Object.keys(permissions)[0];
  if (!firstKey) return false;
  const firstValue = (permissions as Record<string, unknown>)[firstKey];
  // If the first value and its nested value are boolean, it's FeaturePermissions
  if (firstValue && typeof firstValue === 'object' && firstValue !== null) {
    const subValue = firstValue as Record<string, unknown>;
    const subKeys = Object.keys(subValue);
    if (subKeys.length > 0 && typeof subValue[subKeys[0]] === 'boolean') {
      return true;
    }
  }
  return false;
}

/**
 * Converts a flat array of "feature:action" strings into a FeaturePermissions object.
 */
export function parseStaffPermissions(perms: string[]): FeaturePermissions {
  const result: FeaturePermissions = {};
  perms.forEach(p => {
    const [feature, action] = p.split(':');
    if (feature && action) {
      if (!result[feature]) result[feature] = {};
      result[feature][action] = true;
    }
  });
  return result;
}

/**
 * Checks if a user has a specific action permission on a feature.
 * @param permissions The RolePermissions object OR granular FeaturePermissions for staff.
 * @param role The user's role.
 * @param feature The feature key (e.g., 'properties', 'guests').
 * @param action The action key (e.g., 'add', 'edit', 'delete', 'view').
 * @returns boolean
 */
export function canAccess(
  permissions: RolePermissions | FeaturePermissions | null | undefined,
  role?: UserRole,
  feature?: string,
  action?: string
): boolean {
  if (!role) return false;
  if (role === 'admin' || role === 'owner') return true;
  if (!permissions || !feature || !action) return false;

  let featurePerms: FeatureActions | undefined;

  if (isFeaturePermissions(permissions)) {
    // It's already the granular FeaturePermissions for the current user
    featurePerms = permissions[feature];
  } else if (role in permissions) {
    // It's RolePermissions map indexed by role
    featurePerms = (permissions as RolePermissions)[role]?.[feature];
  }

  if (!featurePerms) return false;
  return !!featurePerms[action];
}

/**
 * Checks if a user has ANY permission within a given feature module.
 * Used for sidebar/navigation visibility — a module should appear if the user
 * has any action permission in it, not just 'view'.
 */
export function hasAnyPermissionInModule(
  permissions: RolePermissions | FeaturePermissions | null | undefined,
  role?: UserRole,
  feature?: string
): boolean {
  if (!role) return false;
  if (role === 'admin' || role === 'owner') return true;
  if (!permissions || !feature) return false;

  // For staff users with flat permissions array (stored in user.permissions as "feature:action")
  // We need to resolve the FeaturePermissions from the RolePermissions or use it directly.
  const featurePerms = resolveFeatureActions(permissions, role, feature);
  if (!featurePerms) return false;
  
  return Object.values(featurePerms).some(v => v === true);
}

/**
 * Internal helper to resolve feature actions from either RolePermissions or FeaturePermissions.
 */
function resolveFeatureActions(
  permissions: RolePermissions | FeaturePermissions | null | undefined,
  role: UserRole,
  feature: string
): FeatureActions | undefined {
  if (!permissions) return undefined;

  if (isFeaturePermissions(permissions)) {
    return permissions[feature];
  } else if (role in permissions) {
    return (permissions as RolePermissions)[role]?.[feature];
  }

  return undefined;
}

/**
 * Validates and auto-fixes permission dependencies before saving.
 * 
 * Rule: Any write action (add, edit, delete, sharedCharge, use) on a feature
 * requires the 'view' action. This function enforces that by auto-granting
 * 'view' whenever any other action is enabled.
 * 
 * NOTE on Properties module: Delete controls on the [pgId] detail page
 * are only reachable inside "edit mode", which requires `properties:edit`.
 * This is an intentional UI-level coupling — the delete permission alone
 * won't show delete buttons on the property detail page without edit.
 * The property LIST page delete works independently (in the dropdown).
 * 
 * @param permissions The FeaturePermissions object to validate.
 * @returns The validated FeaturePermissions with dependencies auto-resolved.
 */
export function validateAndEnforceDependencies(permissions: FeaturePermissions): FeaturePermissions {
  const result = { ...permissions };

  for (const feature of Object.keys(result)) {
    const actions = result[feature];
    if (!actions) continue;

    // Check if any non-view action is enabled
    const hasAnyWriteAction = Object.entries(actions).some(
      ([action, enabled]) => action !== 'view' && enabled === true
    );

    // If any write action exists, 'view' must be enabled
    if (hasAnyWriteAction && !actions['view']) {
      result[feature] = { ...actions, view: true };
    }
  }

  return result;
}

/**
 * Checks if a user can view a feature (for navigation/sidebar).
 * Shows the module if the user has ANY permission in it.
 */
export function canViewFeature(
  permissions: RolePermissions | FeaturePermissions | null | undefined,
  role: UserRole,
  feature: string
): boolean {
  return hasAnyPermissionInModule(permissions, role, feature);
}

/**
 * Route-to-permission mapping for client-side route protection.
 * Each dashboard route maps to the minimum permission required to access it.
 */
export const ROUTE_PERMISSION_MAP: Record<string, { feature: string; action: string }> = {
  '/dashboard/pg-management': { feature: 'properties', action: 'view' },
  '/dashboard/tenant-management': { feature: 'guests', action: 'view' },
  '/dashboard/rent-passbook': { feature: 'finances', action: 'view' },
  '/dashboard/expense': { feature: 'finances', action: 'view' },
  '/dashboard/payouts': { feature: 'finances', action: 'view' },
  '/dashboard/wallet': { feature: 'finances', action: 'view' },
  '/dashboard/complaints': { feature: 'complaints', action: 'view' },
  '/dashboard/food': { feature: 'food', action: 'view' },
  '/dashboard/attendance': { feature: 'attendance', action: 'view' },
  '/dashboard/staff': { feature: 'staff', action: 'view' },
  '/dashboard/website': { feature: 'website', action: 'view' },
  '/dashboard/kyc': { feature: 'kyc', action: 'view' },
};

/**
 * API route + method to permission mapping for server-side enforcement.
 * Format: "METHOD /api/path" or "METHOD /api/path:action" for discriminated unions.
 */
export const API_PERMISSION_MAP: Record<string, { feature: string; action: string }> = {
  // Guests
  'GET /api/guests': { feature: 'guests', action: 'view' },
  'POST /api/guests': { feature: 'guests', action: 'add' },
  'PATCH /api/guests:update': { feature: 'guests', action: 'edit' },
  'PATCH /api/guests:initiate-exit': { feature: 'guests', action: 'delete' },
  'PATCH /api/guests:vacate': { feature: 'guests', action: 'delete' },
  'PATCH /api/guests:kyc-status': { feature: 'kyc', action: 'edit' },
  'PATCH /api/guests:kyc-submit': { feature: 'kyc', action: 'add' },
  'PATCH /api/guests:kyc-reset': { feature: 'kyc', action: 'edit' },
  'PATCH /api/guests:add-charge': { feature: 'properties', action: 'sharedCharge' },
  'PATCH /api/guests:remove-charge': { feature: 'properties', action: 'sharedCharge' },
  'PATCH /api/guests:shared-charge': { feature: 'properties', action: 'sharedCharge' },
  'PATCH /api/guests:record-payment': { feature: 'finances', action: 'add' },
  'PATCH /api/guests:transfer': { feature: 'guests', action: 'edit' },
  'DELETE /api/guests': { feature: 'guests', action: 'delete' },
  // Complaints
  'GET /api/complaints': { feature: 'complaints', action: 'view' },
  'POST /api/complaints': { feature: 'complaints', action: 'add' },
  'PATCH /api/complaints': { feature: 'complaints', action: 'edit' },
  // Staff
  'GET /api/staff': { feature: 'staff', action: 'view' },
  'POST /api/staff/manage': { feature: 'staff', action: 'edit' },
  'PATCH /api/staff': { feature: 'staff', action: 'edit' },
  'DELETE /api/staff': { feature: 'staff', action: 'delete' },
  // Properties
  'GET /api/properties': { feature: 'properties', action: 'view' },
  'POST /api/properties': { feature: 'properties', action: 'add' },
  'POST /api/properties/bulk-setup': { feature: 'properties', action: 'add' },
  'PATCH /api/properties': { feature: 'properties', action: 'edit' },
  'DELETE /api/properties': { feature: 'properties', action: 'delete' },
  // Rent / Finances
  'GET /api/rent': { feature: 'finances', action: 'view' },
  'POST /api/rent': { feature: 'finances', action: 'add' },
  // Expenses
  'GET /api/expenses': { feature: 'finances', action: 'view' },
  'POST /api/expenses': { feature: 'finances', action: 'add' },
  'PATCH /api/expenses': { feature: 'finances', action: 'add' },
  'DELETE /api/expenses': { feature: 'finances', action: 'add' },
  // Attendance
  'GET /api/attendance': { feature: 'attendance', action: 'view' },
  'POST /api/attendance': { feature: 'attendance', action: 'add' },
};

export type PlanFeatureActions = { [action: string]: boolean };
export type PlanPermissions = { [feature: string]: PlanFeatureActions };

/**
 * Matrix of allowed actions per feature for each plan
 */
export const planPermissionConfig: Record<string, PlanPermissions> = {
  free: {
    properties: { view: true, add: true, edit: true, delete: true, sharedCharge: false },
    guests: { view: true, add: true, edit: true, delete: true },
    finances: { view: true, add: true },
    complaints: { view: true, edit: true, add: true, delete: true },
    food: { view: true, edit: false },
    attendance: { view: true, edit: true, add: true },
    staff: { view: true, add: false, edit: false, delete: false },
    website: { view: true, edit: false },
    seo: { use: false },
    kyc: { view: true, edit: false, add: false },
  },
  trial: { 
    properties: { view: true, add: true, edit: true, delete: true, sharedCharge: true },
    guests: { view: true, add: true, edit: true, delete: true },
    finances: { view: true, add: true },
    complaints: { view: true, edit: true, add: true, delete: true },
    food: { view: true, edit: true },
    attendance: { view: true, edit: true, add: true },
    staff: { view: true, add: true, edit: true, delete: true },
    website: { view: true, edit: true },
    seo: { use: true },
    kyc: { view: true, edit: true, add: true },
  },
  monthly: { 
    properties: { view: true, add: true, edit: true, delete: true, sharedCharge: true },
    guests: { view: true, add: true, edit: true, delete: true },
    finances: { view: true, add: true },
    complaints: { view: true, edit: true, add: true, delete: true },
    food: { view: true, edit: true },
    attendance: { view: true, edit: true, add: true },
    staff: { view: true, add: true, edit: true, delete: true },
    website: { view: true, edit: true },
    seo: { use: true },
    kyc: { view: true, edit: true, add: true },
  },
  sixMonth: { 
    properties: { view: true, add: true, edit: true, delete: true, sharedCharge: true },
    guests: { view: true, add: true, edit: true, delete: true },
    finances: { view: true, add: true },
    complaints: { view: true, edit: true, add: true, delete: true },
    food: { view: true, edit: true },
    attendance: { view: true, edit: true, add: true },
    staff: { view: true, add: true, edit: true, delete: true },
    website: { view: true, edit: true },
    seo: { use: true },
    kyc: { view: true, edit: true, add: true },
  },
  yearly: { 
    properties: { view: true, add: true, edit: true, delete: true, sharedCharge: true },
    guests: { view: true, add: true, edit: true, delete: true },
    finances: { view: true, add: true },
    complaints: { view: true, edit: true, add: true, delete: true },
    food: { view: true, edit: true },
    attendance: { view: true, edit: true, add: true },
    staff: { view: true, add: true, edit: true, delete: true },
    website: { view: true, edit: true },
    seo: { use: true },
    kyc: { view: true, edit: true, add: true },
  },
  enterprise: { 
    properties: { view: true, add: true, edit: true, delete: true, sharedCharge: true },
    guests: { view: true, add: true, edit: true, delete: true },
    finances: { view: true, add: true },
    complaints: { view: true, edit: true, add: true, delete: true },
    food: { view: true, edit: true },
    attendance: { view: true, edit: true, add: true },
    staff: { view: true, add: true, edit: true, delete: true },
    website: { view: true, edit: true },
    seo: { use: true },
    kyc: { view: true, edit: true, add: true },
  },
};

/**
 * Plan limits (e.g., max number of PGs per plan)
 */
export const planLimitsConfig: Record<string, { pgs: number | 'unlimited', floors: number | 'unlimited', guests: number | 'unlimited' }> = {
  free: { pgs: 1, floors: 1, guests: 10 },
  trial: { pgs: 'unlimited', floors: 'unlimited', guests: 'unlimited' },
  monthly: { pgs: 'unlimited', floors: 'unlimited', guests: 'unlimited' },
  sixMonth: { pgs: 'unlimited', floors: 'unlimited', guests: 'unlimited' },
  yearly: { pgs: 'unlimited', floors: 'unlimited', guests: 'unlimited' },
  enterprise: { pgs: 'unlimited', floors: 'unlimited', guests: 'unlimited' },
};

/**
 * Get a plan's limit for a given key
 */
export function getPlanLimit(planId: string | undefined, key: 'pgs' | 'floors' | 'guests'): number | 'unlimited' {
  if (!planId) return 0;
  const plan = planLimitsConfig[planId];
  if (!plan) return 0;
  return plan[key];
}


/**
 * Checks if a plan allows a specific action on a feature.
 * @param planId The plan id (e.g., 'free', 'pro')
 * @param feature The feature key
 * @param action The action key
 * @returns boolean
 */
export function canPlanAccess(planId: string | undefined, feature: string, action: string): boolean {
  if (!planId) return false;
  const planPerms = planPermissionConfig[planId];
  if (!planPerms) return false;
  const featurePerms = planPerms[feature];
  if (!featurePerms) return false;
  return !!featurePerms[action];
}
