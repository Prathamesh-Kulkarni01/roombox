
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HomeIcon, Building, Users, Wand2, UserCircle, LogOut, UtensilsCrossed, Wallet, Settings, MessageSquareWarning, Contact, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from './ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { useData } from '@/context/data-provider';
import { navPermissions } from '@/lib/permissions';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: HomeIcon },
  { href: '/dashboard/food', label: 'Food Management', icon: UtensilsCrossed },
  { href: '/dashboard/expense', label: 'Expense Tracking', icon: Wallet },
  { href: '/dashboard/pg-management', label: 'PG Management', icon: Building },
  { href: '/dashboard/tenant-management', label: 'Guest Management', icon: Users },
  { href: '/dashboard/complaints', label: 'Complaints', icon: MessageSquareWarning },
  { href: '/dashboard/staff', label: 'Staff Management', icon: Contact },
  { href: '/dashboard/seo-generator', label: 'AI SEO Generator', icon: Wand2 },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export default function DashboardSidebar() {
  const pathname = usePathname();
  const { currentUser, users, setCurrentUser } = useData();

  if (!currentUser) {
    // or a loading skeleton
    return (
        <aside className="w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground hidden md:flex">
             <div className="flex-1 flex flex-col gap-y-2 p-4">
                <h2 className="text-xl font-bold text-primary font-headline">Owner Dashboard</h2>
             </div>
        </aside>
    );
  }

  const allowedRoutes = navPermissions[currentUser.role] || [];
  const visibleNavItems = navItems.filter(item => allowedRoutes.includes(item.href));


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
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-between h-auto px-2 py-1.5 text-left">
                    <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                            <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} />
                            <AvatarFallback>{currentUser.name.slice(0,2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className='flex-1'>
                            <p className="font-semibold text-sm truncate">{currentUser.name}</p>
                            <p className="text-xs text-sidebar-foreground/70 capitalize">{currentUser.role}</p>
                        </div>
                    </div>
                     <ChevronsUpDown className="h-4 w-4 text-sidebar-foreground/70 shrink-0" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 mb-2" align="end" forceMount>
                <DropdownMenuLabel>Switch Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={currentUser.id} onValueChange={(id) => {
                    const userToSwitch = users.find(u => u.id === id);
                    if (userToSwitch) setCurrentUser(userToSwitch);
                }}>
                    {users.map(user => (
                        <DropdownMenuRadioItem key={user.id} value={user.id}>
                            {user.name} ({user.role})
                        </DropdownMenuRadioItem>
                    ))}
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                <Link href="/login">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                </Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
