import { useAppSelector } from '@/lib/hooks';
import { usePermissionsStore } from '@/lib/stores/configStores';
import { getNavGroupsForMode, getBottomTabsForMode, type NavItem, type NavGroup, type BottomNavTab } from '@/lib/navigation';
import { canViewFeature } from '@/lib/permissions';
import { getCurrentPlan } from '../utils';
import { getActiveAppMode, getActiveAppConfig, type AppMode } from '@/core/config/app-mode';

/**
 * Enterprise Multi-Module Accessible Navigation Hook.
 * Dynamically resolves navigation groups and bottom tabs according to NEXT_PUBLIC_APP_MODE.
 * Standardizes access logic across Sidebar, Mobile Header, and Bottom Nav with 100% Rentsutra backward compatibility.
 */
export function useAccessibleNav() {
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const isBazarRoute = pathname.startsWith('/bazar');
  const isGymRoute = pathname.startsWith('/gym');

  // Auto-detect app mode from current route if in unified/ERP multi-app environment
  let appMode: AppMode = getActiveAppMode();
  if (isBazarRoute) {
    appMode = 'bazar';
  } else if (isGymRoute) {
    appMode = 'gym';
  }

  const appConfig = getActiveAppConfig();
  const { currentUser } = useAppSelector((state) => state.user);
  const currentPlan = getCurrentPlan(currentUser);
  const { pgs } = useAppSelector((state) => state.pgs);
  const { featurePermissions } = usePermissionsStore();

  const isOwner = currentUser?.role === 'owner';
  const isTrialEnded = isOwner && currentPlan?.id === 'trial' && 
                       currentUser?.subscription?.status !== 'active' && 
                       currentUser?.subscription?.status !== 'trialing';
  const hasNoProperties = isOwner && pgs.length === 0;

  const isItemAccessible = (item: NavItem) => {
    // If on Bazar merchant routes or no auth guard requested for store owner
    if (isBazarRoute) return true;

    if (!currentUser) return false;
    
    // Admin always sees everything
    if (currentUser.role === 'admin') return true;
    
    // 1. Handle Restricted States in Rent mode
    if (appMode === 'rent') {
      if (isTrialEnded) {
        return item.href === '/dashboard' || 
               item.href === '/dashboard/wallet' || 
               item.feature === 'core';
      }

      if (hasNoProperties) {
        return item.href === '/dashboard' || 
               item.href.startsWith('/dashboard/pg-management') || 
               item.feature === 'core' ||
               item.href === '/dashboard/training';
      }
    }

    // Unassigned users only see basic dashboard/profile
    if (currentUser.role === 'unassigned') {
      return item.href === appConfig.defaultRoute || item.feature === 'core';
    }

    // 2. Handle Role-Based Standard Access
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

  const { selectedPgId } = useAppSelector((state) => state.app);
  const rawNavGroups = getNavGroupsForMode(appMode);
  
  const accessibleNavGroups: NavGroup[] = rawNavGroups
    .map(group => ({
      ...group,
      items: group.items
        .filter(isItemAccessible)
        .map(item => {
          // If we are in Rent mode and have a selected property, direct 'Rooms' link to that property's management page
          if (appMode === 'rent' && item.href === '/dashboard/pg-management/rooms') {
            const targetPgId = selectedPgId || (pgs.length > 0 ? pgs[0].id : null);
            return {
              ...item,
              href: targetPgId ? `/dashboard/pg-management/${targetPgId}` : '/dashboard/pg-management'
            };
          }
          return item;
        })
    }))
    .filter(group => group.items.length > 0);

  const bottomNavTabs: BottomNavTab[] = getBottomTabsForMode(appMode);

  return {
    appMode,
    appConfig,
    accessibleNavGroups,
    bottomNavTabs,
    isItemAccessible,
    isTrialEnded,
    hasNoProperties,
    currentUser,
    currentPlan,
    pgs
  };
}
