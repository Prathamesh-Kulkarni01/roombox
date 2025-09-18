
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Separator } from './ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { navItems, type NavItem } from '@/lib/mock-data';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from './ui/dropdown-menu';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { logoutUser } from '@/lib/slices/userSlice';
import { LogOut, Shield, BookOpen } from 'lucide-react';
import type { RolePermissions } from '@/lib/permissions';
import type { UserRole } from '@/lib/types';
import { canViewFeature } from '@/lib/permissions';

export default function DashboardSidebar() {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const { currentUser, currentPlan } = useAppSelector((state) => state.user);
  const { featurePermissions } = useAppSelector((state) => state.permissions);
  
  const trainingGuides = [
    { href: '/blog/creating-property', label: 'Creating a Property', icon: BookOpen },
    { href: '/blog/setting-up-layout', label: 'Setting up Floors & Rooms', icon: BookOpen },
    { href: '/blog/onboarding-guest', label: 'Onboarding a New Guest', icon: BookOpen },
    { href: '/blog/collecting-rent', label: 'Collecting Rent & Dues', icon: BookOpen },
    { href: '/blog/managing-staff', label: 'Managing Staff & Permissions', icon: BookOpen },
    { href: '/blog/expense-tracking', label: 'Using the Expense Tracker', icon: BookOpen },
    { href: '/blog/setting-up-payouts', label: 'Setting Up Bank Payouts', icon: BookOpen },
  ];

  if (!currentUser || !currentPlan) {
    return (
        <aside className="w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground hidden md:flex">
             <div className="flex-1 flex flex-col gap-y-2 p-4">
                <h2 className="text-xl font-bold text-primary font-headline">Owner Dashboard</h2>
             </div>
        </aside>
    );
  }

  const visibleNavItems = navItems.filter(item => {
    if (currentUser.role === 'owner' || currentUser.role === 'admin') return true;
    if (item.feature === 'core') return true; // Core items are always visible for staff
    return canViewFeature(featurePermissions, currentUser.role, item.feature!);
  });

  return (
    <aside className="w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground hidden md:flex">
      <div className="flex-1 flex flex-col gap-y-2">
        <div className="p-4">
            <h2 className="text-xl font-bold text-primary font-headline">Owner Dashboard</h2>
        </div>
        <nav className="flex flex-col gap-1 px-4">
          {visibleNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                data-tour={item.tourId}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground/80 transition-all hover:text-sidebar-primary hover:bg-sidebar-accent',
                  (pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))) && 'bg-sidebar-accent text-sidebar-primary'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
          ))}
          {currentUser.role === 'admin' && (
             <Link
                href="/admin/dashboard"
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground/80 transition-all hover:text-sidebar-primary hover:bg-sidebar-accent',
                  pathname.startsWith('/admin') && 'bg-sidebar-accent text-sidebar-primary'
                )}
              >
                <Shield className="h-4 w-4" />
                Admin Panel
              </Link>
          )}
        </nav>
        <Separator className="my-4 bg-sidebar-border" />
        <div className="flex flex-col gap-1 px-4">
            <h4 className="px-3 py-2 text-xs font-semibold text-sidebar-foreground/60">Guides &amp; Training</h4>
             {trainingGuides.map((guide) => (
                <Link
                    key={guide.href}
                    href={guide.href}
                    className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground/80 transition-all hover:text-sidebar-primary hover:bg-sidebar-accent text-sm',
                    )}
                    >
                    <guide.icon className="h-4 w-4" />
                    {guide.label}
                </Link>
            ))}
        </div>
      </div>
      <div className="p-4 mt-auto">
        <Separator className="my-4 bg-sidebar-border" />
         <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
                <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} />
                <AvatarFallback>{currentUser.name.slice(0,2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className='flex-1'>
                <p className="font-semibold text-sm truncate">{currentUser.name}</p>
                <p className="text-xs text-sidebar-foreground/70 capitalize">{currentUser.role} ({currentPlan.name})</p>
            </div>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7"><LogOut/></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-40 mb-2" align="end" forceMount>
                     <DropdownMenuItem onClick={() => dispatch(logoutUser())}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>
    </aside>
  );
}
