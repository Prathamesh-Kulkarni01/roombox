import type { ModuleManifest } from '@/core/registry';

export const rentManifest: ModuleManifest = {
  id: 'rent',
  name: 'RentSutra PG & Property Management',
  description: 'Hostel, PG, Flat & Tenant management suite with rent calculation, late fees, and auto-reminders.',
  routePrefix: '/rent',
  version: '1.0.0',
  schemaVersion: 3,
  collections: ['owners', 'properties', 'rooms', 'beds', 'tenants', 'payments', 'complaints', 'expenses', 'pgs', 'guests'],
  enabled: true,
  requiredRoles: ['owner', 'staff', 'tenant'],
};

