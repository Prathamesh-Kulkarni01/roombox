import { Permission, PERMISSIONS } from '../types/permissions';

export class InvalidPermissionConfig extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidPermissionConfig';
  }
}

/**
 * Validates if the given user permissions array contains the required permission.
 * This should be used strictly with a resolved flat array of user permissions.
 */
export function can(userPermissions: Permission[] | undefined | null, requiredPermission: Permission): boolean {
  if (!userPermissions || !Array.isArray(userPermissions)) return false;
  return userPermissions.includes(requiredPermission);
}

/**
 * Validates assigned roles/permissions to ensure rule dependencies are met.
 * Should be called when assigning new roles to a user in the DB.
 */
export function validateRoleAssignment(rolePermissions: Permission[]): void {
  // Properties dependencies
  const mutatingPropertyActions = [
    PERMISSIONS.properties.create,
    PERMISSIONS.properties.edit,
    PERMISSIONS.properties.delete,
    PERMISSIONS.properties.manageCharges
  ];
  
  if (mutatingPropertyActions.some(p => rolePermissions.includes(p)) && !rolePermissions.includes(PERMISSIONS.properties.view)) {
     throw new InvalidPermissionConfig("Executing property actions requires property view permissions.");
  }

  // Tenants dependencies
  const mutatingTenantActions = [
    PERMISSIONS.tenants.create,
    PERMISSIONS.tenants.edit,
    PERMISSIONS.tenants.delete,
    PERMISSIONS.tenants.vacate
  ];

  if (mutatingTenantActions.some(p => rolePermissions.includes(p)) && !rolePermissions.includes(PERMISSIONS.tenants.view)) {
    throw new InvalidPermissionConfig("Executing tenant actions requires tenant view permissions.");
  }
  
  // Cross module dependencies
  if (rolePermissions.includes(PERMISSIONS.tenants.create) && !rolePermissions.includes(PERMISSIONS.properties.view)) {
    throw new InvalidPermissionConfig("Onboarding tenants requires property view permissions to allocate beds.");
  }

  // Payments dependencies
  const mutatingPaymentActions = [
    PERMISSIONS.payments.record,
    PERMISSIONS.payments.edit,
    PERMISSIONS.payments.delete,
    PERMISSIONS.payments.verify
  ];

  if (mutatingPaymentActions.some(p => rolePermissions.includes(p)) && !rolePermissions.includes(PERMISSIONS.payments.view)) {
     throw new InvalidPermissionConfig("Executing payment actions requires payment view permissions.");
  }
  
  // Complaints dependencies
  const mutatingComplaintActions = [
    PERMISSIONS.complaints.create,
    PERMISSIONS.complaints.resolve,
    PERMISSIONS.complaints.delete
  ];

  if (mutatingComplaintActions.some(p => rolePermissions.includes(p)) && !rolePermissions.includes(PERMISSIONS.complaints.view)) {
    throw new InvalidPermissionConfig("Executing complaint actions requires complaint view permissions.");
  }
}
