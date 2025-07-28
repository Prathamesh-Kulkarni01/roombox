
import type { UserRole } from './types';

/**
 * # Plan Permissions Matrix
 *
 * | Plan        | Feature     | View | Add | Edit | Delete | Use (SEO) | PG Limit |
 * |-------------|-------------|------|-----|------|--------|-----------|----------|
 * | **free**    | properties  | ✅   | ✅  | ✅   | ✅     |           | 1        |
 * |             | guests      | ✅   | ✅  | ❌   | ❌     |           |          |
 * |             | finances    | ✅   | ❌  |      |        |           |          |
 * |             | complaints  | ✅   |     | ❌   |        |           |          |
 * |             | food        | ✅   |     | ❌   |        |           |          |
 * |             | staff       | ❌   | ❌  | ❌   | ❌     |           |          |
 * |             | website     | ❌   |     | ❌   |        |           |          |
 * |             | seo         |     |     |      |        | ❌        |          |
 * | **starter** | properties  | ✅   | ✅  | ✅   | ✅     |           | 1        |
 * |             | guests      | ✅   | ✅  | ✅   | ✅     |           |          |
 * |             | finances    | ✅   | ✅  |      |        |           |          |
 * |             | complaints  | ✅   |     | ✅   |        |           |          |
 * |             | food        | ✅   |     | ✅   |        |           |          |
 * |             | staff       | ✅   | ✅  | ✅   | ❌     |           |          |
 * |             | website     | ❌   |     | ❌   |        |           |          |
 * |             | seo         |     |     |      |        | ✅        |          |
 * | **pro**     | properties  | ✅   | ✅  | ✅   | ✅     |           | unlimited|
 * |             | guests      | ✅   | ✅  | ✅   | ✅     |           |          |
 * |             | finances    | ✅   | ✅  |      |        |           |          |
 * |             | complaints  | ✅   |     | ✅   |        |           |          |
 * |             | food        | ✅   |     | ✅   |        |           |          |
 * |             | staff       | ✅   | ✅  | ✅   | ✅     |           |          |
 * |             | website     | ✅   |     | ✅   |        |           |          |
 * |             | seo         |     |     |      |        | ✅        |          |
 * | **business**| properties  | ✅   | ✅  | ✅   | ✅     |           | unlimited|
 * |             | guests      | ✅   | ✅  | ✅   | ✅     |           |          |
 * |             | finances    | ✅   | ✅  |      |        |           |          |
 * |             | complaints  | ✅   |     | ✅   |        |           |          |
 * |             | food        | ✅   |     | ✅   |        |           |          |
 * |             | staff       | ✅   | ✅  | ✅   | ✅     |           |          |
 * |             | website     | ✅   |     | ✅   |        |           |          |
 * |             | seo         |     |     |      |        | ✅        |          |
 * | **enterprise**| properties| ✅   | ✅  | ✅   | ✅     |           | unlimited|
 * |             | guests      | ✅   | ✅  | ✅   | ✅     |           |          |
 * |             | finances    | ✅   | ✅  |      |        |           |          |
 * |             | complaints  | ✅   |     | ✅   |        |           |          |
 * |             | food        | ✅   |     | ✅   |        |           |          |
 * |             | staff       | ✅   | ✅  | ✅   | ✅     |           |          |
 * |             | website     | ✅   |     | ✅   |        |           |          |
 * |             | seo         |     |     |      |        | ✅        |          |
 *
 * Legend:
 *   - ✅ = Allowed
 *   - ❌ = Not allowed
 *   - Blank = Not applicable
 *   - PG Limit = Maximum number of properties (PGs) allowed for the plan
 *
 * Note: Plan feature/action permissions and plan limits are now managed in separate config objects for type safety.
 */
// This defines the structure and labels for permissions.
// It's used to build the UI on the Settings page.
export const featurePermissionConfig = {
  properties: {
    label: "Properties",
    actions: {
      view: "View Property Layout",
      add: "Add Floors/Rooms/Beds",
      edit: "Edit Floors/Rooms/Beds",
      delete: "Delete Floors/Rooms/Beds",
      sharedCharge: "Manage Shared Charges",
    }
  },
  guests: {
    label: "Guests",
    actions: {
      view: "View Guest Details",
      add: "Add/Onboard New Guests",
      edit: "Edit Guest Info",
      delete: "Initiate/Finalize Exit"
    }
  },
  finances: {
    label: "Financials",
    actions: {
      view: "View Passbook & Expenses",
      add: "Collect Rent & Add Expenses",
    }
  },
  complaints: {
    label: "Complaints",
    actions: {
      view: "View Complaints",
      edit: "Update Complaint Status"
    }
  },
  food: {
    label: "Food Menu",
    actions: {
      view: "View Menu",
      edit: "Edit Menu"
    }
  },
  staff: {
    label: "Staff Management",
    actions: {
      view: "View Staff List",
      add: "Add New Staff",
      edit: "Edit Staff Details",
      delete: "Delete Staff",
    }
  },
  website: {
    label: "Website Builder",
    actions: {
      view: "View Site Details",
      edit: "Edit & Publish Site",
    }
  },
  seo: {
    label: "AI SEO Generator",
    actions: {
      use: "Use the AI SEO tool",
    }
  },
  kyc: {
    label: 'KYC Verification',
    actions: {
        view: 'View KYC Status & Docs',
        edit: 'Approve/Reject KYC',
        add: 'Request KYC from Tenant',
    },
  },
};

// Type definition for a single feature's permissions
export type FeatureActions = { [key: string]: boolean };

// Type definition for all feature permissions
export type FeaturePermissions = { [key: string]: FeatureActions };

// This maps a UserRole to a full set of feature permissions
export type RolePermissions = Record<UserRole, FeaturePermissions | null>;

/**
 * Checks if a user has a specific action permission on a feature.
 * @param permissions The RolePermissions object (from Redux or backend).
 * @param role The user's role.
 * @param feature The feature key (e.g., 'properties', 'guests').
 * @param action The action key (e.g., 'add', 'edit', 'delete', 'view').
 * @param ownerHasAll (optional) If true, owner always has all permissions. If false, owner is checked like any other role.
 * @returns boolean
 */
export function canAccess(
  permissions: RolePermissions | null | undefined,
  role?: UserRole,
  feature?: string,
  action?: string,
  ownerHasAll: boolean = true
): boolean {
  if (!role) return false;
  if (role === 'owner' && ownerHasAll) return true;
  if (!permissions) return false;
  const rolePerms = permissions[role];
  if (!rolePerms) return false;
  const featurePerms = rolePerms[feature || ''];
  if (!featurePerms) return false;
  return !!featurePerms[action || ''];
}

/**
 * Checks if a user can view a feature (for navigation/sidebar).
 * @param permissions The RolePermissions object.
 * @param role The user's role.
 * @param feature The feature key.
 * @param ownerHasAll (optional) If true, owner always has all permissions.
 * @returns boolean
 */
export function canViewFeature(
  permissions: RolePermissions | null | undefined,
  role: UserRole,
  feature: string,
  ownerHasAll: boolean = true
): boolean {
  return canAccess(permissions, role, feature, 'view', ownerHasAll);
}

export type PlanFeatureActions = { [action: string]: boolean };
export type PlanPermissions = { [feature: string]: PlanFeatureActions };

/**
 * Matrix of allowed actions per feature for each plan
 */
export const planPermissionConfig: Record<string, PlanPermissions> = {
  free: {
    properties: { view: true, add: true, edit: true, delete: true, sharedCharge: false },
    guests: { view: true, add: true, edit: false, delete: false },
    finances: { view: true, add: false },
    complaints: { view: true, edit: false },
    food: { view: true, edit: false },
    staff: { view: false, add: false, edit: false, delete: false },
    website: { view: false, edit: false },
    seo: { use: false },
    kyc: { view: false, edit: false, add: false },
  },
  starter: {
    properties: { view: true, add: true, edit: true, delete: true, sharedCharge: false },
    guests: { view: true, add: true, edit: true, delete: true },
    finances: { view: true, add: true },
    complaints: { view: true, edit: true },
    food: { view: true, edit: true },
    staff: { view: true, add: true, edit: true, delete: false },
    website: { view: false, edit: false },
    seo: { use: false },
    kyc: { view: false, edit: false, add: false },
  },
  pro: {
    properties: { view: true, add: true, edit: true, delete: true, sharedCharge: true },
    guests: { view: true, add: true, edit: true, delete: true },
    finances: { view: true, add: true },
    complaints: { view: true, edit: true },
    food: { view: true, edit: true },
    staff: { view: true, add: true, edit: true, delete: true },
    website: { view: true, edit: true },
    seo: { use: true },
    kyc: { view: true, edit: true, add: true },
  },
  business: {
    properties: { view: true, add: true, edit: true, delete: true, sharedCharge: true },
    guests: { view: true, add: true, edit: true, delete: true },
    finances: { view: true, add: true },
    complaints: { view: true, edit: true },
    food: { view: true, edit: true },
    staff: { view: true, add: true, edit: true, delete: true },
    website: { view: true, edit: true },
    seo: { use: true },
    kyc: { view: true, edit: true, add: true },
  },
  enterprise: {
    properties: { view: true, add: true, edit: true, delete: true, sharedCharge: true },
    guests: { view: true, add: true, edit: true, delete: true },
    finances: { view: true, add: true },
    complaints: { view: true, edit: true },
    food: { view: true, edit: true },
    staff: { view: true, add: true, edit: true, delete: true },
    website: { view: true, edit: true },
    seo: { use: true },
    kyc: { view: true, edit: true, add: true },
  },
};

/**
 * Plan limits (e.g., max number of PGs per plan)
 */
export const planLimitsConfig: Record<string, { pgs: number | 'unlimited' }> = {
  free: { pgs: 1 },
  starter: { pgs: 1 },
  pro: { pgs: 'unlimited' },
  business: { pgs: 'unlimited' },
  enterprise: { pgs: 'unlimited' },
};

/**
 * Get a plan's limit for a given key (currently only 'pgs' is supported)
 */
export function getPlanLimit(planId: string | undefined, key: 'pgs'): number | 'unlimited' {
  if (!planId) return 0;
  const plan = planLimitsConfig[planId];
  if (!plan) return 0;
  return plan.pgs;
  // If you add more keys to planLimitsConfig, extend this function accordingly.
}

/**
 * Checks if a plan allows a specific action on a feature.
 * @param planId The plan id (e.g., 'free', 'starter')
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
