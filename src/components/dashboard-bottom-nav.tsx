
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Building, Users, Wallet, MoreHorizontal, UtensilsCrossed, Wand2, Settings, MessageSquareWarning, Contact, Globe, BookUser } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { navPermissions } from '@/lib/permissions';
import { useAppSelector } from '@/lib/hooks';

const allMainNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home, feature: 'core' },
  { href: '/dashboard/expense', label: 'Expenses', icon: Wallet, feature: 'core' },
  { href: '/dashboard/rent-passbook', label: 'Passbook', icon: BookUser, feature: 'core' },
  { href: '/dashboard/complaints', label: 'Complaints', icon: MessageSquareWarning, feature: 'hasComplaints' },
  { href: '/dashboard/food', label: 'Food', icon: UtensilsCrossed, feature: 'core' },
];

const allMoreNavItems = [
  { href: '/dashboard/pg-management', label: 'Properties', icon: Building, feature: 'core' },
  { href: '/dashboard/tenant-management', label: 'Guest Management', icon: Users, feature: 'core' },
  { href: '/dashboard/staff', label: 'Staff Management', icon: Contact, feature: 'hasStaffManagement' },
  { href: '/dashboard/seo-generator', label: 'AI SEO Generator', icon: Wand2, feature: 'hasSeoGenerator' },
  { href: '/dashboard/website', label: 'Website', icon: Globe, feature: 'hasWebsiteBuilder' },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings, feature: 'core' },
]

export default function DashboardBottomNav() {
  const pathname = usePathname();
  const { currentUser, currentPlan } = useAppSelector((state) => state.user);

  if (!currentUser || !currentPlan) return null;

  const allowedRoutes = navPermissions[currentUser.role] || [];
  
  const filterByPermissions = (item: typeof allMainNavItems[0]) => {
      if (!allowedRoutes.includes(item.href)) return false;
      if (item.feature !== 'core' && !currentPlan[item.feature as keyof typeof currentPlan]) {
          return false;
      }
      return true;
  }

  const mainNavItems = allMainNavItems.filter(filterByPermissions);
  const moreNavItems = allMoreNavItems.filter(filterByPermissions);

  const showMoreTab = moreNavItems.length > 0;
  const mainItemsCount = showMoreTab ? 4 : 5;
  const visibleMainNavItems = mainNavItems.slice(0, mainItemsCount);
  const overflowItems = [...mainNavItems.slice(mainItemsCount), ...moreNavItems];


  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-sidebar border-t border-sidebar-border z-50">
      <nav className="grid grid-cols-5 h-16 items-center">
        {visibleMainNavItems.map((item) => (
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
        
        {overflowItems.length > 0 && (
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
