

import type { UserRole } from './types';

export const navPermissions: Record<UserRole, string[]> = {
  owner: [
    '/dashboard',
    '/dashboard/food',
    '/dashboard/expense',
    '/dashboard/pg-management',
    '/dashboard/tenant-management',
    '/dashboard/complaints',
    '/dashboard/staff',
    '/dashboard/seo-generator',
    '/dashboard/settings',
  ],
  manager: [
    '/dashboard',
    '/dashboard/tenant-management',
    '/dashboard/complaints',
    '/dashboard/staff',
    '/dashboard/food',
    '/dashboard/expense',
  ],
  cook: ['/dashboard/food', '/dashboard/expense'],
  cleaner: ['/dashboard/complaints'],
  security: ['/dashboard/complaints', '/dashboard/tenant-management'],
  tenant: [
    '/tenants/my-pg',
    '/tenants/complaints',
    '/tenants/food',
    '/tenants/chatbot',
    '/tenants/kyc',
    '/tenants/profile',
  ],
  other: [],
};
