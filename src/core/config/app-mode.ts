export type AppMode = 'rent' | 'bazar' | 'gym' | 'unified';

export interface AppModeConfig {
  id: AppMode;
  name: string;
  shortName: string;
  description: string;
  defaultRoute: string;
  scopeLabel: string; // e.g. "Property" vs "Store" vs "Gym"
  scopeSelectorPlaceholder: string;
  routesPrefix?: string;
}

export const APP_MODE_CONFIGS: Record<AppMode, AppModeConfig> = {
  rent: {
    id: 'rent',
    name: 'Rentsutra PG & Hostel Management',
    shortName: 'Rentsutra',
    description: 'Enterprise PG, hostel, and rental property management platform.',
    defaultRoute: '/dashboard',
    scopeLabel: 'Property',
    scopeSelectorPlaceholder: 'Select Property',
    routesPrefix: '/dashboard',
  },
  bazar: {
    id: 'bazar',
    name: 'Palus Local Bazar & Grocery',
    shortName: 'Bazar',
    description: 'Hyperlocal grocery, kirana, and regional marketplace platform.',
    defaultRoute: '/bazar/dashboard',
    scopeLabel: 'Store / Outlet',
    scopeSelectorPlaceholder: 'Select Store',
    routesPrefix: '/bazar',
  },
  gym: {
    id: 'gym',
    name: 'FitPulse Gym & Fitness Management',
    shortName: 'Gym',
    description: 'Gym memberships, attendance, trainer, and workout platform.',
    defaultRoute: '/gym/dashboard',
    scopeLabel: 'Branch',
    scopeSelectorPlaceholder: 'Select Branch',
    routesPrefix: '/gym',
  },
  unified: {
    id: 'unified',
    name: 'Roombox Enterprise Platform',
    shortName: 'Roombox',
    description: 'Unified multi-vertical management platform.',
    defaultRoute: '/dashboard',
    scopeLabel: 'Workspace',
    scopeSelectorPlaceholder: 'Select Workspace',
  },
};

/**
 * Returns active app mode safely from environment variables.
 * Defaults strictly to 'rent' so Rentsutra functionality is 100% backward compatible.
 */
export function getActiveAppMode(): AppMode {
  const envMode = process.env.NEXT_PUBLIC_APP_MODE?.toLowerCase().trim();
  if (envMode && envMode in APP_MODE_CONFIGS) {
    return envMode as AppMode;
  }
  return 'rent';
}

export function getActiveAppConfig(): AppModeConfig {
  return APP_MODE_CONFIGS[getActiveAppMode()];
}

export function isAppMode(mode: AppMode): boolean {
  const current = getActiveAppMode();
  if (current === 'unified') return true;
  return current === mode;
}

export function isBazarActive(): boolean {
  return isAppMode('bazar');
}

export function isRentActive(): boolean {
  return isAppMode('rent');
}

export function isGymActive(): boolean {
  return isAppMode('gym');
}

