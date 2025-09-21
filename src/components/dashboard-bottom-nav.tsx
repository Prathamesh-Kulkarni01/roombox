
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { MoreHorizontal, Home, BookUser, MessageSquareWarning, CreditCard, ChevronRight, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { allNavItems } from '@/lib/mock-data';
import { useAppSelector } from '@/lib/hooks';
import { canViewFeature } from '@/lib/permissions';
import { Badge } from '@/components/ui/badge';

export default function DashboardBottomNav() {
  const pathname = usePathname();
  const { currentUser, currentPlan } = useAppSelector((state) => state.user);
  const { featurePermissions } = useAppSelector((state) => state.permissions);
  const { complaints } = useAppSelector((state) => state.complaints);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const unreadComplaints = complaints.filter(c => c.status === 'open').length;

  if (!currentUser || !currentPlan) return null;

  const mainNavItems = [
    { href: '/dashboard', label: 'Dashboard', icon: Home, feature: 'properties' },
    { href: '/dashboard/rent-passbook', label: 'Rentbook', icon: BookUser, feature: 'finances' },
    { href: '/dashboard/complaints', label: 'Complaints', icon: MessageSquareWarning, feature: 'complaints', badge: unreadComplaints > 0 ? unreadComplaints : undefined },
    { href: '/dashboard/expense', label: 'Expenses', icon: Wallet, feature: 'finances' },
  ];
  
  const accessibleMoreNavGroups = allNavItems
    .map(group => ({
      ...group,
      items: group.items.filter(item => 
        !mainNavItems.some(mainItem => mainItem.href === item.href) &&
        item.href !== '/dashboard' &&
        (item.feature === 'core' || canViewFeature(featurePermissions, currentUser.role, item.feature!))
      )
    }))
    .filter(group => group.items.length > 0);

  const visibleItems = mainNavItems.filter(item => item.feature === 'core' || (typeof item.feature === 'string' && canViewFeature(featurePermissions, currentUser.role, item.feature)));

  const handleLinkClick = () => {
    setIsSheetOpen(false);
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <nav className="grid grid-cols-5 h-16 items-center">
        {visibleItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={handleLinkClick}
            className={cn(
              'flex flex-col items-center justify-center gap-1 text-muted-foreground transition-colors h-full relative',
              (pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))) 
                ? 'text-primary bg-primary/10' 
                : 'hover:text-primary'
            )}
          >
            {item.badge && item.badge > 0 && (
              <Badge variant="destructive" className="absolute top-1 right-2.5 h-4 w-4 flex items-center justify-center rounded-full p-0 text-xs">
                {item.badge}
              </Badge>
            )}
            <item.icon className="h-5 w-5" />
            <span className="text-xs font-medium">{item.label}</span>
          </Link>
        ))}
        
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <button className="flex flex-col items-center justify-center gap-1 text-muted-foreground transition-colors h-full hover:text-primary">
                <MoreHorizontal className="h-5 w-5" />
                <span className="text-xs font-medium">More</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-auto max-h-[80dvh] flex flex-col rounded-t-lg p-0">
               <SheetHeader className="p-4 border-b text-left">
                <SheetTitle>More Options</SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto p-2">
                {accessibleMoreNavGroups.map(group => (
                  <div key={group.title} className="py-2">
                    <h4 className="px-2 mb-2 text-sm font-semibold text-muted-foreground">{group.title}</h4>
                    <div className="space-y-1">
                      {group.items.map((item) => (
                         <Link
                            key={item.href}
                            href={item.href}
                            onClick={handleLinkClick}
                            className={cn(
                                'flex items-center gap-4 rounded-lg p-3 text-left transition-all',
                                (pathname.startsWith(item.href)) 
                                    ? 'bg-primary/10 text-primary' 
                                    : 'text-foreground/80 hover:text-primary hover:bg-muted'
                            )}
                            >
                            <div className={cn("flex items-center justify-center w-10 h-10 rounded-lg shrink-0", 
                                (pathname.startsWith(item.href)) ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                            )}>
                              <item.icon className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-sm">{item.label}</p>
                              <p className="text-xs text-muted-foreground">{item.description}</p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-muted-foreground ml-auto" />
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </SheetContent>
          </Sheet>
      </nav>
    </div>
  );
}
