
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Separator } from './ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { allNavItems, type NavItem } from '@/lib/mock-data';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from './ui/dropdown-menu';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { logoutUser } from '@/lib/slices/userSlice';
import { LogOut, Shield, BookOpen, BookUser } from 'lucide-react';
import type { RolePermissions } from '@/lib/permissions';
import type { UserRole } from '@/lib/types';
import { canViewFeature } from '@/lib/permissions';
import { useTranslation } from '@/context/language-context';

export default function DashboardSidebar() {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const { currentUser, currentPlan } = useAppSelector((state) => state.user);
  const { featurePermissions } = useAppSelector((state) => state.permissions);
  const { t } = useTranslation();
  
  if (!currentUser || !currentPlan) {
    return (
        <aside className="w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground hidden md:flex">
             <div className="flex-1 flex flex-col gap-y-2 p-4">
                <h2 className="text-xl font-bold text-primary font-headline">Owner Dashboard</h2>
             </div>
        </aside>
    );
  }
  
  const accessibleNavGroups = allNavItems
    .map(group => ({
      ...group,
      items: group.items.filter(item => {
          if (currentUser.role === 'owner' || currentUser.role === 'admin') return true;
          if (item.feature === 'core') return true; // Core items are always visible for staff
          return canViewFeature(featurePermissions, currentUser.role, item.feature!);
      })
    }))
    .filter(group => group.items.length > 0);


  return (
    <aside className="w-64 flex-col border-r bg-card hidden md:flex">
      <div className="flex-1 flex flex-col gap-y-2">
        <div className="p-4">
            <h2 className="text-xl font-bold text-primary font-headline">{t('nav_owner_dashboard')}</h2>
        </div>
        <nav className="flex flex-col gap-1 px-4">
          {accessibleNavGroups.map((group, index) => (
            <div key={group.title}>
              {index > 0 && <Separator className="my-2" />}
               <h4 className="px-3 py-2 text-xs font-semibold text-muted-foreground">{t(group.title as any)}</h4>
               {group.items.map(item => (
                   <Link
                      key={item.href}
                      href={item.href}
                      data-tour={item.tourId}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-foreground/80 transition-all hover:text-primary hover:bg-muted',
                        (pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))) && 'bg-muted text-primary'
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {t(item.label as any)}
                    </Link>
               ))}
            </div>
          ))}
          {currentUser.role === 'admin' && (
             <Link
                href="/admin/dashboard"
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-foreground/80 transition-all hover:text-primary hover:bg-muted',
                  pathname.startsWith('/admin') && 'bg-muted text-primary'
                )}
              >
                <Shield className="h-4 w-4" />
                {t('nav_admin_panel')}
              </Link>
          )}
        </nav>
      </div>
      <div className="p-4 mt-auto">
        <Separator className="my-4" />
         <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
                <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} />
                <AvatarFallback>{currentUser.name.slice(0,2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className='flex-1'>
                <p className="font-semibold text-sm truncate">{currentUser.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{currentUser.role} ({currentPlan.name})</p>
            </div>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7"><LogOut/></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-40 mb-2" align="end" forceMount>
                     <DropdownMenuItem onClick={() => dispatch(logoutUser())}>
                        <LogOut className="mr-2 h-4 w-4" />
                        {t('logout')}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>
    </aside>
  );
}
