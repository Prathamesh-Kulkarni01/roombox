
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { navItems as allNavItems, type NavItem, plans } from '@/lib/mock-data';
import { useAppSelector } from '@/lib/hooks';
import type { RolePermissions, FeaturePermissions } from '@/lib/permissions';
import type { UserRole } from '@/lib/types';


// Helper function to check if a user has any permission for a given feature
const hasAccessToFeature = (
  item: NavItem,
  permissions: RolePermissions | null | undefined,
  role: UserRole,
  plan: any
): boolean => {
  // Always show core items like settings
  if (item.feature === 'core') return true;
  
  // For Owners, visibility is determined by the feature existing,
  // the page itself will handle the subscription gate.
  if (role === 'owner') return true;

  // For Staff, visibility is determined by their specific permissions.
  // If they have no permissions for a feature, they shouldn't even see the link.
  if (!permissions) return false;

  const rolePermissions = permissions[role as keyof RolePermissions];
  if (!rolePermissions) return false;
  
  const featurePerms = rolePermissions[item.feature as keyof FeaturePermissions];
  if (!featurePerms) return false;
  
  // The user has access if any of the permissions for that feature are true
  return Object.values(featurePerms).some(value => value === true);
};


export default function DashboardBottomNav() {
  const pathname = usePathname();
  const { currentUser, currentPlan } = useAppSelector((state) => state.user);
  const { featurePermissions } = useAppSelector((state) => state.permissions);

  if (!currentUser || !currentPlan) return null;

  const mainNavItems = allNavItems.filter(item => ['/dashboard', '/dashboard/rent-passbook', '/dashboard/complaints', '/dashboard/expense'].includes(item.href));
  const moreNavItems = allNavItems.filter(item => !mainNavItems.some(mainItem => mainItem.href === item.href));
  
  const accessibleMainNavItems = mainNavItems.filter(item => hasAccessToFeature(item, featurePermissions, currentUser.role, currentPlan));
  const accessibleMoreNavItems = moreNavItems.filter(item => hasAccessToFeature(item, featurePermissions, currentUser.role, currentPlan));


  const showMoreTab = accessibleMoreNavItems.length > 0 || accessibleMainNavItems.length > 4;
  const mainItemsCount = showMoreTab ? 4 : 5;
  const visibleItems = accessibleMainNavItems.slice(0, mainItemsCount);
  const overflowItems = [...accessibleMainNavItems.slice(mainItemsCount), ...accessibleMoreNavItems];


  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-sidebar border-t border-sidebar-border z-50">
      <nav className="grid grid-cols-5 h-16 items-center">
        {visibleItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center justify-center gap-1 text-sidebar-foreground/70 transition-colors h-full',
              (pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))) 
                ? 'text-primary bg-sidebar-accent' 
                : 'hover:text-primary'
            )}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-xs font-medium">{item.label}</span>
          </Link>
        ))}
        
        {showMoreTab && (
          <Sheet>
            <SheetTrigger asChild>
              <button className="flex flex-col items-center justify-center gap-1 text-sidebar-foreground/70 transition-colors h-full hover:text-primary">
                <MoreHorizontal className="h-5 w-5" />
                <span className="text-xs font-medium">More</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-auto rounded-t-lg">
              <SheetHeader className="text-left mb-4">
                <SheetTitle>More Options</SheetTitle>
                <SheetDescription>
                  Navigate to other sections of your dashboard.
                </SheetDescription>
              </SheetHeader>
              <div className="flex flex-col gap-2">
                {overflowItems.map((item) => (
                  <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                          'flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium text-muted-foreground transition-all hover:text-primary hover:bg-primary/10',
                          (pathname.startsWith(item.href)) && 'bg-primary/10 text-primary'
                      )}
                      >
                      <item.icon className="h-5 w-5" />
                      {item.label}
                  </Link>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        )}
      </nav>
    </div>
  );
}
