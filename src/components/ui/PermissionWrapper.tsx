// Access.tsx
// Usage example:
// <Access feature="properties" action="add" limitKey="pgs" currentCount={pgs.length}><Button>Add Property</Button></Access>

import React from 'react';
import { useAppSelector } from '@/lib/hooks';
import { canAccess, canPlanAccess, getPlanLimit } from '@/lib/permissions';
import { Badge } from './badge';

/**
 * Props for Access
 * @param feature - Feature key (e.g., 'staff', 'complaints')
 * @param action - Action key (e.g., 'edit', 'add', 'view')
 * @param children - React children (should be a single element)
 * @param limitKey - (optional) plan limit key (e.g., 'pgs')
 * @param currentCount - (optional) current count for the limit (e.g., pgs.length)
 */
export interface AccessProps {
  feature: string;
  action: string;
  children: React.ReactNode;
  limitKey?: 'pgs'; // Extend as needed
  currentCount?: number;
}

const Access: React.FC<AccessProps> = ({ feature, action, children, limitKey, currentCount }) => {
  const { currentUser, currentPlan } = useAppSelector((state) => state.user);
  const { featurePermissions } = useAppSelector((state) => state.permissions);

  const planId = currentPlan?.id;
  const planAllows = canPlanAccess(planId, feature, action);
  const roleAllows = canAccess(featurePermissions, currentUser?.role, feature, action);

  // Limit logic
  let limitReached = false;
  if (limitKey && typeof currentCount === 'number') {
    const planLimit = getPlanLimit(planId, limitKey);
    if (planLimit !== 'unlimited' && currentCount >= planLimit) {
      limitReached = true;
    }
  }

  // If limit reached, show badge and disable
  if (limitReached) {
    if (React.isValidElement(children)) {
      return (
        <div style={{ position: 'relative', display: 'inline-block' }}>
          {React.cloneElement(children as React.ReactElement<any>, { disabled: true })}
          <Badge
            variant="secondary"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'orange',
              gap: 4,
            }}
          >
            Upgrade
          </Badge>
        </div>
      );
    }
    return (
      <div style={{ position: 'relative', display: 'inline-block' }}>
        {children}
        <Badge variant="outline" style={{ position: 'absolute', top: 0, right: 0, zIndex: 2 }}>Pro plan</Badge>
      </div>
    );
  }
if(action==='sharedCharge'){
console.log('sharedCharge',planAllows,roleAllows)
}
  // If denied by plan (but not by role), show badge
  if (!planAllows && roleAllows) {
    return (
      <div style={{ position: 'relative', display: 'inline-block' }}>
        {children}
        <div
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(255, 255, 255, 0.7)',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 8,
          pointerEvents: 'none',
        }}
      >
        <Badge
          variant="outline"
          style={{
            fontSize: 18,
            padding: '0.75em 1.5em',
            background: 'linear-gradient(90deg, #fbbf24 0%, #f59e42 100%)',
            color: '#fff',
            border: 'none',
            boxShadow: '0 2px 12px rgba(251,191,36,0.15)',
            letterSpacing: 1,
            fontWeight: 600,
            borderRadius: 24,
          }}
        >
         Upgrade Plan
        </Badge>
      </div>
      </div>
    );
  }

  // If denied by role (but plan allows), hide
  if (planAllows && !roleAllows) {
    return null;
  }

  // If both allow, show children
  if (planAllows && roleAllows) {
    return <>{children}</>;
  }

  // If both deny, treat as plan denial (show badge)
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {children}
      <div
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(255, 255, 255, 0.7)',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 8,
          pointerEvents: 'none',
        }}
      >
        <Badge
          variant="outline"
          style={{
            fontSize: 18,
            padding: '0.75em 1.5em',
            background: 'linear-gradient(90deg, #fbbf24 0%, #f59e42 100%)',
            color: '#fff',
            border: 'none',
            boxShadow: '0 2px 12px rgba(251,191,36,0.15)',
            letterSpacing: 1,
            fontWeight: 600,
            borderRadius: 24,
          }}
        >
         Upgrade Plan
        </Badge>
      </div>
    </div>
  );
};

export default Access; 