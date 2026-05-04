// Access.tsx
// Usage example:
// <Access feature="properties" action="add" limitKey="pgs" currentCount={pgs.length}><Button>Add Property</Button></Access>

import React from 'react';
import { useAppSelector } from '@/lib/hooks'
import { usePermissionsStore } from '@/lib/stores/configStores';
import { canAccess } from '@/lib/permissions';

/**
 * Props for Access
 * @param feature - Feature key (e.g., 'staff', 'complaints')
 * @param action - Action key (e.g., 'edit', 'add', 'view')
 * @param children - React children (should be a single element)
 * @param limitKey - (optional) plan limit key (e.g., 'pgs')
 * @param currentCount - (optional) current count for the limit
 */
export interface AccessProps {
  feature: string;
  action: string;
  children: React.ReactNode;
  limitKey?: 'pgs'; // Extend as needed
  currentCount?: number;
}

const Access: React.FC<AccessProps> = ({ feature, action, children }) => {
  const { currentUser } = useAppSelector((state) => state.user);
  const { featurePermissions } = usePermissionsStore();

  const roleAllows = canAccess(featurePermissions as any, currentUser?.role as any, feature, action);

  // If role does not allow access, hide the component completely
  if (!roleAllows) {
    return null;
  }

  // If role allows, render the children (ignore plan limits/permissions in the new model)
  return <>{children}</>;
};

export default Access;
