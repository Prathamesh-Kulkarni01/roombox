export const PERMISSIONS = {
  properties: {
    view: "properties.view",
    create: "properties.create",
    edit: "properties.edit",
    delete: "properties.delete",
    manageCharges: "properties.manage_charges"
  },
  tenants: {
    view: "tenants.view",
    create: "tenants.create",
    edit: "tenants.edit",
    delete: "tenants.delete",
    vacate: "tenants.vacate",
  },
  payments: {
    view: "payments.view",
    record: "payments.record",
    edit: "payments.edit",
    delete: "payments.delete",
    verify: "payments.verify",
  },
  complaints: {
    view: "complaints.view",
    create: "complaints.create",
    resolve: "complaints.resolve",
    delete: "complaints.delete",
  }
} as const;

// Utility type to extract all string values from the deeply nested PERMISSIONS object
type ObjectValues<T> = T[keyof T];
export type Permission = ObjectValues<{
    [K in keyof typeof PERMISSIONS]: ObjectValues<typeof PERMISSIONS[K]>
}>;

export const ROLES = {
  PROPERTY_MANAGER: [
    PERMISSIONS.properties.view, PERMISSIONS.properties.create, PERMISSIONS.properties.edit, PERMISSIONS.properties.delete, PERMISSIONS.properties.manageCharges,
    PERMISSIONS.tenants.view, PERMISSIONS.tenants.create, PERMISSIONS.tenants.edit, PERMISSIONS.tenants.vacate,
    PERMISSIONS.payments.view, PERMISSIONS.payments.record, 
    PERMISSIONS.complaints.view, PERMISSIONS.complaints.create, PERMISSIONS.complaints.resolve,
  ],
  ACCOUNTANT: [
    PERMISSIONS.properties.view,
    PERMISSIONS.tenants.view,
    PERMISSIONS.payments.view, PERMISSIONS.payments.record, PERMISSIONS.payments.edit, PERMISSIONS.payments.delete, PERMISSIONS.payments.verify
  ],
  STAFF_RECEPTIONIST: [
    PERMISSIONS.properties.view,
    PERMISSIONS.tenants.view, PERMISSIONS.tenants.create,
    PERMISSIONS.payments.record,
    PERMISSIONS.complaints.view, PERMISSIONS.complaints.create
  ],
};

export type RolePermissions = typeof ROLES;

export interface AuditLog {
  userId: string;
  action: Permission;
  module: 'properties' | 'tenants' | 'payments' | 'complaints';
  severity: "LOW" | "HIGH" | "CRITICAL";
  status: "DENIED" | "SUCCESS";
  timestamp: string;
}
