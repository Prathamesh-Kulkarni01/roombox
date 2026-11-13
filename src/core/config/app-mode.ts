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
  authLabels: {
    title: string;
    description: string;
    primaryTab: string; // e.g. "Tenant" vs "Customer" vs "Member"
    managerTab: string; // e.g. "Owner" vs "Merchant" vs "Trainer / Admin"
    managerPortalText: string;
    createAccountText: string;
  };
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
    authLabels: {
      title: 'RentSutra',
      description: 'Authenticate to continue',
      primaryTab: 'Tenant',
      managerTab: 'Owner',
      managerPortalText: 'Sign in to owner portal',
      createAccountText: 'Create an owner account',
    },
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
    authLabels: {
      title: 'Palus Local Bazar',
      description: 'स्थानिक बाजार आणि किराणा पोर्टल',
      primaryTab: 'ग्राहक (Customer)',
      managerTab: 'दुकानदार (Merchant)',
      managerPortalText: 'दुकानदार पोर्टलमध्ये लॉगिन करा',
      createAccountText: 'नवीन दुकान नोंदणी करा (Register Shop)',
    },
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
    authLabels: {
      title: 'FitPulse Gym',
      description: 'Gym memberships & fitness portal',
      primaryTab: 'Member',
      managerTab: 'Manager',
      managerPortalText: 'Sign in to gym manager portal',
      createAccountText: 'Create a gym manager account',
    },
  },
  unified: {
    id: 'unified',
    name: 'Roombox Enterprise Platform',
    shortName: 'Roombox',
    description: 'Unified multi-vertical management platform.',
    defaultRoute: '/dashboard',
    scopeLabel: 'Workspace',
    scopeSelectorPlaceholder: 'Select Workspace',
    authLabels: {
      title: 'Roombox Enterprise',
      description: 'Unified multi-vertical access portal',
      primaryTab: 'End User',
      managerTab: 'Manager / Owner',
      managerPortalText: 'Sign in to workspace manager portal',
      createAccountText: 'Create a manager account',
    },
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

