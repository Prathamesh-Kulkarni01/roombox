// Access.tsx
// Usage example:
// <Access feature="properties" action="add" limitKey="pgs" currentCount={pgs.length}><Button>Add Property</Button></Access>

import React, { useState } from 'react';
import { useAppSelector } from '@/lib/hooks';
import { canAccess, canPlanAccess, getPlanLimit } from '@/lib/permissions';
import { Badge } from './badge';
import SubscriptionDialog from '../dashboard/dialogs/SubscriptionDialog';
import { Button } from './ui/button';
import { ShieldAlert } from 'lucide-react';

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

const GatedWrapper = ({ children, tooltipText }: { children: React.ReactNode, tooltipText: string }) => {
    const [isSubDialogOpen, setIsSubDialogOpen] = useState(false);
    return (
        <>
            <SubscriptionDialog open={isSubDialogOpen} onOpenChange={setIsSubDialogOpen} />
            <div 
                className="relative inline-block cursor-pointer"
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsSubDialogOpen(true);
                }}
                title={tooltipText}
            >
                <div style={{ pointerEvents: 'none' }}>
                    {React.isValidElement(children) ? React.cloneElement(children as React.ReactElement<any>, { disabled: true }) : children}
                </div>
                <div
                    style={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0, bottom: 0,
                        zIndex: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 'var(--radius)',
                        backgroundColor: 'hsla(var(--card)/0.6)',
                    }}
                >
                     <Badge
                        variant="default"
                        className="bg-gradient-to-r from-orange-400 to-amber-500 text-white border-none shadow-lg text-xs md:text-sm px-3 py-1.5"
                    >
                        Upgrade Plan
                    </Badge>
                </div>
            </div>
        </>
    );
};


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

  // If role does not allow access, hide the component completely
  if (!roleAllows) {
    return null;
  }

  // If role allows, but plan limit is reached, show the gated wrapper
  if (limitReached) {
      return <GatedWrapper tooltipText="You've reached the limit for your current plan.">{children}</GatedWrapper>;
  }

  // If role allows, but plan does not, show the gated wrapper
  if (!planAllows) {
      return <GatedWrapper tooltipText="This feature requires a higher plan.">{children}</GatedWrapper>;
  }

  // If both role and plan allow, and limit is not reached, render the children
  return <>{children}</>;
};

export default Access;
