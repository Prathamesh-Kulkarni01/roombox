import type { ModuleManifest } from '@/core/registry';

export const bazarManifest: ModuleManifest = {
  id: 'bazar',
  name: 'Palus Local Bazar',
  description: 'Hyperlocal commerce and classifieds connecting local merchants, farmers, and consumers.',
  routePrefix: '/bazar',
  version: '1.0.0',
  schemaVersion: 1,
  collections: ['bazar_stores', 'bazar_products', 'bazar_orders', 'bazar_categories'],
  enabled: true,
  requiredRoles: ['merchant', 'customer', 'delivery'],
};

