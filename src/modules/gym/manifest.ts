import type { ModuleManifest } from '@/core/registry';

export const gymManifest: ModuleManifest = {
  id: 'gym',
  name: 'Fitness & Gym Management',
  description: 'Member subscriptions, biometric/QR check-in, trainer allocation, and fee reminders.',
  routePrefix: '/gym',
  version: '1.0.0',
  schemaVersion: 1,
  collections: ['gym_members', 'gym_plans', 'gym_attendance', 'gym_equipment'],
  enabled: true,
  requiredRoles: ['gym_owner', 'trainer', 'gym_member'],
};

