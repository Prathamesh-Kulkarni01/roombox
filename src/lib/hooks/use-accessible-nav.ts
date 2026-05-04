
import { useAppSelector } from '@/lib/hooks';
import { usePermissionsStore } from '@/lib/stores/configStores';
import { allNavItems, type NavItem } from '@/lib/navigation';
import { canViewFeature } from '@/lib/permissions';

/**
 * Hook to manage navigation visibility based on user role, subscription state, and property status.
 * Standardizes access logic across Sidebar, Mobile Header, and Bottom Nav.
 */
export function useAccessibleNav() {
  const { currentUser, currentPlan } = useAppSelector((state) => state.user);
  const { pgs } = useAppSelector((state) => state.pgs);
  const { featurePermissions } = usePermissionsStore();

  const isOwner = currentUser?.role === 'owner';
  const isTrialEnded = isOwner && currentPlan?.id === 'trial' && 
                       currentUser?.subscription?.status !== 'active' && 
                       currentUser?.subscription?.status !== 'trialing';
  const hasNoProperties = isOwner && pgs.length === 0;

  const isItemAccessible = (item: NavItem) => {
    if (!currentUser) return false;
    
    // Admin always sees everything
    if (currentUser.role === 'admin') return true;
    
    // 1. Handle Restricted States
    
    // If subscription ended, allow Dashboard, Wallet (to pay), and Core (Settings/Profile)
    if (isTrialEnded) {
      return item.href === '/dashboard' || 
             item.href === '/dashboard/wallet' || 
             item.feature === 'core';
    }

    // If owner has no properties, guide them to create one (Dashboard, PG Management, Core, Training)
    if (hasNoProperties) {
      return item.href === '/dashboard' || 
             item.href === '/dashboard/pg-management' || 
             item.feature === 'core' ||
             item.href === '/dashboard/training';
    }

    // Unassigned users only see basic dashboard/profile
    if (currentUser.role === 'unassigned') {
      return item.href === '/dashboard' || item.feature === 'core';
    }

    // 2. Handle Role-Based Standard Access

    // Owners see everything (if not restricted by state above)
    if (isOwner) return true;

    // Tenants restricted view
    if (currentUser.role === 'tenant') {
      const tenantFeatures = ['core', 'complaints', 'food', 'finances'];
      return tenantFeatures.includes(item.feature || '') || item.href === '/dashboard';
    }

    // Staff see core + whatever they have permissions for
    if (item.feature === 'core') return true;
    return !!item.feature && canViewFeature(featurePermissions, currentUser.role, item.feature);
  };

  const accessibleNavGroups = allNavItems
    .map(group => ({
      ...group,
      items: group.items.filter(isItemAccessible)
    }))
    .filter(group => group.items.length > 0);

  return {
    accessibleNavGroups,
    isItemAccessible,
    isTrialEnded,
    hasNoProperties,
    currentUser,
    currentPlan,
    pgs
  };
}
