
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MoreHorizontal, Home, BookUser, MessageSquareWarning, Wallet, CreditCard, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { navItems as allNavItems } from '@/lib/mock-data';
import { useAppSelector } from '@/lib/hooks';
import type { UserRole } from '@/lib/types';
import { canViewFeature } from '@/lib/permissions';

export default function DashboardBottomNav() {
  const pathname = usePathname();
  const { currentUser, currentPlan } = useAppSelector((state) => state.user);
  const { featurePermissions } = useAppSelector((state) => state.permissions);
  const { complaints } = useAppSelector((state) => state.complaints);

  const unreadComplaints = complaints.filter(c => c.status === 'open').length;

  if (!currentUser || !currentPlan) return null;

  const mainNavItems = [
    { href: '/dashboard', label: 'Dashboard', icon: Home, feature: 'properties' },
    { href: '/dashboard/rent-passbook', label: 'Rentbook', icon: BookUser, feature: 'finances' },
    { href: '/dashboard/complaints', label: 'Complaints', icon: MessageSquareWarning, feature: 'complaints', badge: unreadComplaints > 0 ? unreadComplaints : undefined },
    { href: '/dashboard/subscription', label: 'Billing', icon: CreditCard, feature: 'core' },
  ];
  
  const moreNavItems = allNavItems.filter(item => !mainNavItems.some(mainItem => mainItem.href === item.href) && item.href !== '/dashboard');

  const accessibleMainNavItems = mainNavItems.filter(item => item.feature === 'core' || (typeof item.feature === 'string' && canViewFeature(featurePermissions, currentUser.role, item.feature)));
  const accessibleMoreNavItems = moreNavItems.filter(item => item.feature === 'core' || (typeof item.feature === 'string' && canViewFeature(featurePermissions, currentUser.role, item.feature)));

  const visibleItems = accessibleMainNavItems.slice(0, 4);

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <nav className="grid grid-cols-5 h-16 items-center">
        {visibleItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center justify-center gap-1 text-muted-foreground transition-colors h-full relative',
              (pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))) 
                ? 'text-primary bg-primary/10' 
                : 'hover:text-primary'
            )}
          >
            {item.badge && item.badge > 0 && (
              <span className="absolute top-1 right-3.5 text-xs bg-destructive text-destructive-foreground rounded-full h-5 w-5 flex items-center justify-center">
                {item.badge}
              </span>
            )}
            <item.icon className="h-5 w-5" />
            <span className="text-xs font-medium">{item.label}</span>
          </Link>
        ))}
        
        <Sheet>
            <SheetTrigger asChild>
              <button className="flex flex-col items-center justify-center gap-1 text-muted-foreground transition-colors h-full hover:text-primary">
                <MoreHorizontal className="h-5 w-5" />
                <span className="text-xs font-medium">More</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-auto max-h-[80dvh] flex flex-col rounded-t-lg">
              <SheetHeader className="text-left pb-2">
                <SheetTitle>More Options</SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto">
                <div className="flex flex-col gap-1">
                  {accessibleMoreNavItems.map((item) => (
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
              </div>
            </SheetContent>
          </Sheet>
      </nav>
    </div>
  );
}
