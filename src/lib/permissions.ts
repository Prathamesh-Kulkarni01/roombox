
import type { UserRole } from './types';

/**
 * # Plan Permissions Matrix
 *
 * This file defines the feature access rules for different subscription plans and user roles.
 *
 * ## Plan-Based Access (What features are unlocked for a subscription?)
 * - **Free Plan**: Core features for local management with strict limits.
 * - **Pro Plan (Subscribed Users)**: All features are unlocked. Billing is based on usage, not the plan itself.
 *
 * ## Role-Based Access (What can a specific user type do?)
 * - **Owner**: Has full control over all features enabled by their plan.
 * - **Staff (Manager, Cook, etc.)**: Permissions are granularly controlled by the owner on the Settings page. For example, a 'cook' can be given access to edit the 'food' menu but not view 'finances'.
 * - **Admin**: The super-admin for the entire application. Has access to all features across all user accounts.
 *
 * This dual system ensures both subscription tier limitations and fine-grained staff delegation are handled correctly.
 */
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
      edit: "Update Complaint Status",
      add: "Raise a new complaint"
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
 * @returns boolean
 */
export function canAccess(
  permissions: RolePermissions | null | undefined,
  role?: UserRole,
  feature?: string,
  action?: string
): boolean {
  if (!role) return false;
  if (role === 'admin' || role === 'owner') return true;
  if (!permissions) return false;
  const rolePerms = permissions[role];
  if (!rolePerms || !feature || !action) return false;
  const featurePerms = rolePerms[feature];
  if (!featurePerms) return false;
  return !!featurePerms[action];
}

/**
 * Checks if a user can view a feature (for navigation/sidebar).
 * @param permissions The RolePermissions object.
 * @param role The user's role.
 * @param feature The feature key.
 * @returns boolean
 */
export function canViewFeature(
  permissions: RolePermissions | null | undefined,
  role: UserRole,
  feature: string
): boolean {
  return canAccess(permissions, role, feature, 'view');
}

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
    complaints: { view: true, edit: true, add: true },
    food: { view: true, edit: true },
    staff: { view: false, add: false, edit: false, delete: false },
    website: { view: false, edit: false },
    seo: { use: false },
    kyc: { view: false, edit: false, add: false },
  },
  pro: { // 'pro' now represents any active subscription
    properties: { view: true, add: true, edit: true, delete: true, sharedCharge: true },
    guests: { view: true, add: true, edit: true, delete: true },
    finances: { view: true, add: true },
    complaints: { view: true, edit: true, add: true },
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
export const planLimitsConfig: Record<string, { pgs: number | 'unlimited', floors: number | 'unlimited' }> = {
  free: { pgs: 1, floors: 2 },
  pro: { pgs: 'unlimited', floors: 'unlimited' },
};

/**
 * Get a plan's limit for a given key
 */
export function getPlanLimit(planId: string | undefined, key: 'pgs' | 'floors'): number | 'unlimited' {
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
