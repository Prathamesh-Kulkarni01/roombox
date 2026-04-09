
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
import { 
  Home, 
  Users, 
  CircleDollarSign, 
  MessageSquare, 
  Utensils, 
  UserCog, 
  Globe, 
  Zap, 
  FileCheck 
} from 'lucide-react';

export interface PermissionAction {
  id: string;
  label: string;
}

export interface FeatureConfig {
  featureId: string;
  featureName: string;
  icon: any;
  actions: PermissionAction[];
}

export const featurePermissionConfig: FeatureConfig[] = [
  {
    featureId: 'properties',
    featureName: 'Properties',
    icon: Home,
    actions: [
      { id: 'view', label: "View Property Layout" },
      { id: 'add', label: "Add Floors/Rooms/Beds" },
      { id: 'edit', label: "Edit Floors/Rooms/Beds" },
      { id: 'delete', label: "Delete Floors/Rooms/Beds" },
      { id: 'sharedCharge', label: "Manage Shared Charges" },
    ]
  },
  {
    featureId: 'guests',
    featureName: 'Guests',
    icon: Users,
    actions: [
      { id: 'view', label: "View Guest Details" },
      { id: 'add', label: "Add/Onboard New Guests" },
      { id: 'edit', label: "Edit Guest Info" },
      { id: 'delete', label: "Initiate/Finalize Exit" }
    ]
  },
  {
    featureId: 'finances',
    featureName: 'Financials',
    icon: CircleDollarSign,
    actions: [
      { id: 'view', label: "View Passbook & Expenses" },
      { id: 'add', label: "Collect Rent & Add Expenses" },
    ]
  },
  {
    featureId: 'complaints',
    featureName: 'Complaints',
    icon: MessageSquare,
    actions: [
      { id: 'view', label: "View Complaints" },
      { id: 'edit', label: "Update Complaint Status" },
      { id: 'add', label: "Raise a new complaint" }
    ]
  },
  {
    featureId: 'food',
    featureName: 'Food Menu',
    icon: Utensils,
    actions: [
      { id: 'view', label: "View Menu" },
      { id: 'edit', label: "Edit Menu" }
    ]
  },
  {
    featureId: 'staff',
    featureName: 'Staff Management',
    icon: UserCog,
    actions: [
      { id: 'view', label: "View Staff List" },
      { id: 'add', label: "Add New Staff" },
      { id: 'edit', label: "Edit Staff Details" },
      { id: 'delete', label: "Delete Staff" },
    ]
  },
  {
    featureId: 'website',
    featureName: 'Website Builder',
    icon: Globe,
    actions: [
      { id: 'view', label: "View Site Details" },
      { id: 'edit', label: "Edit & Publish Site" },
    ]
  },
  {
    featureId: 'seo',
    featureName: 'AI SEO Generator',
    icon: Zap,
    actions: [
      { id: 'use', label: "Use the AI SEO tool" },
    ]
  },
  {
    featureId: 'kyc',
    featureName: 'KYC Verification',
    icon: FileCheck,
    actions: [
      { id: 'view', label: 'View KYC Status & Docs' },
      { id: 'edit', label: 'Approve/Reject KYC' },
      { id: 'add', label: 'Request KYC from Tenant' },
    ],
  },
];

// Type definition for a single feature's permissions
export type FeatureActions = { [key: string]: boolean };

// Type definition for all feature permissions
export type FeaturePermissions = { [key: string]: FeatureActions };

// This maps a UserRole to a full set of feature permissions
export type RolePermissions = Record<UserRole, FeaturePermissions | null>;

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

  // Robustly distinguish between RolePermissions (map of roles) and FeaturePermissions (map of features)
  // FeaturePermissions: { [feature]: { [action]: boolean } }
  // RolePermissions: { [role]: { [feature]: { [action]: boolean } } }
  
  const firstKey = Object.keys(permissions)[0];
  if (!firstKey) return false;
  
  const firstVal = (permissions as any)[firstKey];
  if (!firstVal || typeof firstVal !== 'object') return false;
  
  // Check if the structure is RolePermissions or FeaturePermissions
  // We look at the depth: if firstVal's values are booleans, it's FeaturePermissions.
  // If firstVal's values are objects, it's RolePermissions.
  const subKeys = Object.keys(firstVal);
  if (subKeys.length === 0) {
    // Empty feature set for a role or empty action set for a feature.
    // If we can't tell, we try both paths safely.
    if ((permissions as any)[role] && (permissions as any)[role][feature]) {
       return !!(permissions as any)[role][feature][action];
    }
    return !!(permissions as any)[feature]?.[action];
  }

  const isFeaturePerms = typeof firstVal[subKeys[0]] === 'boolean';
  
  let featurePerms: FeatureActions | undefined;
  if (!isFeaturePerms && (permissions as any)[role]) {
      // It's RolePermissions map indexed by role
      featurePerms = (permissions as RolePermissions)[role]?.[feature];
  } else {
      // It's already the granular FeaturePermissions for the current user
      featurePerms = (permissions as FeaturePermissions)[feature];
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

  const firstKey = Object.keys(permissions)[0];
  if (!firstKey) return undefined;
  
  const firstVal = (permissions as any)[firstKey];
  if (!firstVal || typeof firstVal !== 'object') return undefined;
  
  const subKeys = Object.keys(firstVal);
  if (subKeys.length === 0) {
    if ((permissions as any)[role] && (permissions as any)[role][feature]) {
       return (permissions as any)[role][feature];
    }
    return (permissions as any)[feature];
  }

  const isFeaturePerms = typeof firstVal[subKeys[0]] === 'boolean';
  
  if (!isFeaturePerms && (permissions as any)[role]) {
      return (permissions as RolePermissions)[role]?.[feature];
  } else {
      return (permissions as FeaturePermissions)[feature];
  }
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
  '/dashboard/subscription': { feature: 'finances', action: 'view' },
  '/dashboard/complaints': { feature: 'complaints', action: 'view' },
  '/dashboard/food': { feature: 'food', action: 'view' },
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
};

export type PlanFeatureActions = { [action: string]: boolean };
export type PlanPermissions = { [feature: string]: PlanFeatureActions };

/**
 * Matrix of allowed actions per feature for each plan
 */
export const planPermissionConfig: Record<string, PlanPermissions> = {
  free: {
    properties: { view: true, add: true, edit: true, delete: true, sharedCharge: true },
    guests: { view: true, add: true, edit: true, delete: true },
    finances: { view: true, add: true },
    complaints: { view: true, edit: true, add: true },
    food: { view: true, edit: true },
    staff: { view: true, add: true, edit: true, delete: true },
    website: { view: true, edit: true },
    seo: { use: false },
    kyc: { view: true, edit: true, add: true },
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
export const planLimitsConfig: Record<string, { pgs: number | 'unlimited', floors: number | 'unlimited', guests: number | 'unlimited' }> = {
  free: { pgs: 10, floors: 15, guests: 100 },
  pro: { pgs: 'unlimited', floors: 'unlimited', guests: 'unlimited' },
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
