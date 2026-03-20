
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

  // Handle case where permissions is already the granular FeaturePermissions (for staff)
  // or it's the RolePermissions map indexed by role.
  let featurePerms: FeatureActions | undefined;
  
  if (role && (permissions as any)[role]) {
      // It's RolePermissions map
      featurePerms = (permissions as RolePermissions)[role]?.[feature];
  } else {
      // It's likely FeaturePermissions already
      featurePerms = (permissions as FeaturePermissions)[feature];
  }

  if (!featurePerms) return false;
  return !!featurePerms[action];
}

/**
 * Checks if a user can view a feature (for navigation/sidebar).
 */
export function canViewFeature(
  permissions: RolePermissions | FeaturePermissions | null | undefined,
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
