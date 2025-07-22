
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Building, Users, Wand2, UserCircle, LogOut, UtensilsCrossed, Wallet, Settings, MessageSquareWarning, Contact, ChevronsUpDown, Globe, BookUser } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from './ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { navPermissions } from '@/lib/permissions';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { logoutUser } from '@/lib/slices/userSlice';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';


const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home, feature: 'core', tourId: 'dashboard-nav' },
  { href: '/dashboard/food', label: 'Food Management', icon: UtensilsCrossed, feature: 'core' },
  { href: '/dashboard/expense', label: 'Expense Tracking', icon: Wallet, feature: 'core' },
  { href: '/dashboard/rent-passbook', label: 'Rent Passbook', icon: BookUser, feature: 'core' },
  { href: '/dashboard/pg-management', label: 'Property Management', icon: Building, feature: 'core', tourId: 'pg-management-nav' },
  { href: '/dashboard/tenant-management', label: 'Guest Management', icon: Users, feature: 'core' },
  { href: '/dashboard/complaints', label: 'Complaints', icon: MessageSquareWarning, feature: 'hasComplaints' },
  { href: '/dashboard/staff', label: 'Staff Management', icon: Contact, feature: 'hasStaffManagement' },
  { href: '/dashboard/seo-generator', label: 'AI SEO Generator', icon: Wand2, feature: 'hasSeoGenerator' },
  { href: '/dashboard/website', label: 'Website Builder', icon: Globe, feature: 'hasWebsiteBuilder' },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings, feature: 'core' },
];

export default function DashboardSidebar() {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const { currentUser, currentPlan } = useAppSelector((state) => state.user);

  if (!currentUser || !currentPlan) {
    return (
        <aside className="w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground hidden md:flex">
             <div className="flex-1 flex flex-col gap-y-2 p-4">
                <h2 className="text-xl font-bold text-primary font-headline">Owner Dashboard</h2>
             </div>
        </aside>
    );
  }

  const allowedRoutes = navPermissions[currentUser.role] || [];
  
  const visibleNavItems = navItems.filter(item => {
    if (!allowedRoutes.includes(item.href)) return false;
    if (item.feature !== 'core' && !currentPlan[item.feature as keyof typeof currentPlan]) {
        return false;
    }
    return true;
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
        </nav>
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
