
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Separator } from './ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { allNavItems, type NavItem } from '@/lib/navigation';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from './ui/dropdown-menu';
import { useAppDispatch, useAppSelector } from '@/lib/hooks'
import { logoutUser } from '@/lib/slices/userSlice';
import { useState, useEffect } from 'react';
import { LogOut, Shield, BookOpen, BookUser, UserCircle, Globe, Copy, ExternalLink } from 'lucide-react';
import { useTranslation } from '@/context/language-context';
import { useAccessibleNav } from '@/lib/hooks/use-accessible-nav';
import { getSiteConfigForOwner } from '@/lib/actions/siteActions';
import { useToast } from '@/hooks/use-toast';

export default function DashboardSidebar() {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const { 
    currentUser, 
    currentPlan, 
    accessibleNavGroups 
  } = useAccessibleNav();

  const { toast } = useToast();
  const [brandedUrl, setBrandedUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchBrandedUrl = async () => {
      const ownerId = currentUser?.role === 'owner' || currentUser?.role === 'admin' ? currentUser.id : currentUser?.ownerId;
      if (!ownerId) return;

      try {
        const config = await getSiteConfigForOwner(ownerId);
        if (config?.subdomain) {
          const rawUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== "undefined" ? window.location.origin : "");
          let parsedHost = "";
          try {
            parsedHost = new URL(rawUrl).host;
          } catch(e) {
            parsedHost = typeof window !== "undefined" ? window.location.host : "";
          }

          let host = parsedHost;
          if (host.startsWith('www.')) host = host.substring(4);
          const protocol = typeof window !== 'undefined' ? window.location.protocol : 'https:';
          
          setBrandedUrl(`${protocol}//${config.subdomain}.${host}`);
        }
      } catch (error) {
        console.error('Failed to load branded URL for sidebar:', error);
      }
    };

    if (currentUser) {
      fetchBrandedUrl();
    }
  }, [currentUser]);
  
  if (!currentUser) return null;

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
                         (item.href === '/dashboard' || item.href === '/dashboard/pg-management' 
                           ? pathname === item.href 
                           : (pathname === item.href || pathname.startsWith(item.href))) && 'bg-muted text-primary'
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
        {brandedUrl && (
          <div className="mb-4 p-3 rounded-xl bg-primary/5 border border-primary/10 flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-primary text-xs font-bold">
              <Globe className="w-3.5 h-3.5" />
              <span>Your Branded App URL</span>
            </div>
            <div className="text-[10px] text-muted-foreground truncate font-mono">
              {brandedUrl.replace(/^https?:\/\//, '')}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Button
                variant="outline"
                size="sm"
                className="text-[10px] h-7 px-2 flex-1"
                onClick={() => {
                  navigator.clipboard.writeText(brandedUrl);
                  toast({
                    title: "Link Copied",
                    description: "Subdomain URL copied to clipboard.",
                  });
                }}
              >
                <Copy className="w-3 h-3 mr-1" /> Copy
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-[10px] h-7 px-2 flex-1"
                onClick={() => window.open(brandedUrl, '_blank')}
              >
                <ExternalLink className="w-3 h-3 mr-1" /> Visit
              </Button>
            </div>
          </div>
        )}
        <Separator className="my-4" />
         <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
                <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} />
                <AvatarFallback>{(currentUser.name || 'User').slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className='flex-1 min-w-0'>
                <p className="font-semibold text-sm truncate">{currentUser.name}</p>
                <p className="text-xs text-muted-foreground capitalize truncate">
                  {currentUser.role} {currentPlan ? `(${currentPlan.name})` : ''}
                </p>
            </div>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7"><LogOut/></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-48 mb-2" align="end" forceMount>
                    <DropdownMenuLabel>{t('my_account')}</DropdownMenuLabel>
                    <DropdownMenuItem asChild>
                        <Link href="/dashboard/profile" className="flex items-center w-full">
                            <UserCircle className="mr-2 h-4 w-4" />
                            {t('my_profile')}
                        </Link>
                    </DropdownMenuItem>
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

