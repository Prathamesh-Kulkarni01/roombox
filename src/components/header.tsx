
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Menu, HomeIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from './ui/skeleton';
import NotificationsPopover from './notifications-popover';
import InstallPWA from './install-pwa';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { logoutUser } from '@/lib/slices/userSlice';
import { setSelectedPgId } from '@/lib/slices/appSlice';
import { ThemeToggle } from './theme-toggle';

const navLinks = [
  { href: '/', label: 'Home', roles: ['all'] },
  { href: '/dashboard', label: 'Owner Dashboard', roles: ['owner', 'manager', 'cook', 'cleaner', 'security'] },
  { href: '/tenants/my-pg', label: 'My Dashboard', roles: ['tenant'] },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { pgs } = useAppSelector((state) => state.pgs);
  const { selectedPgId, isLoading } = useAppSelector((state) => state.app);
  const { currentUser } = useAppSelector((state) => state.user);

  const isDashboard = pathname.startsWith('/dashboard');
  const isTenantDashboard = pathname.startsWith('/tenants');

  const handleValueChange = (pgId: string) => {
    dispatch(setSelectedPgId(pgId === 'all' ? null : pgId));
  }

  const handleLogout = () => {
    dispatch(logoutUser());
    router.push('/login');
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 max-w-screen-2xl items-center justify-between px-4 gap-4">
        <div className="flex items-center gap-2 md:gap-4 flex-1 md:flex-none">
            <Link href="/" className="flex items-center gap-2 mr-2">
                <HomeIcon className="h-6 w-6 text-primary" />
                <span className="font-bold text-lg font-headline hidden sm:inline-block">RentVastu</span>
            </Link>
             {isDashboard && currentUser && (
                isLoading ? (
                    <Skeleton className="h-10 w-[120px] sm:w-[180px]" />
                ) : pgs.length > 0 ? (
                    <Select
                        value={selectedPgId || 'all'}
                        onValueChange={handleValueChange}
                    >
                        <SelectTrigger className="w-auto sm:w-[180px] flex-1 min-w-[120px]">
                            <SelectValue placeholder="Select a Property..." />
                        </SelectTrigger>
                        <SelectContent>
                             <SelectItem value="all">All Properties</SelectItem>
                            {pgs.map((pg) => (
                                <SelectItem key={pg.id} value={pg.id}>
                                    {pg.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                ) : null
             )}
        </div>


        <nav className="hidden md:flex items-center gap-6 text-sm absolute left-1/2 -translate-x-1/2">
          {navLinks.map((link) => {
            if (!currentUser && (link.roles.includes('tenant') || link.roles.includes('owner'))) return null;
            if (currentUser && !link.roles.includes('all') && !link.roles.includes(currentUser.role)) return null;
            
            return (
                <Link
                key={link.href}
                href={link.href}
                className={cn(
                    'transition-colors hover:text-foreground/80',
                    pathname.startsWith(link.href) && link.href !== '/' || pathname === '/' && link.href === '/' ? 'text-foreground' : 'text-muted-foreground'
                )}
                >
                {link.label}
                </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {currentUser && (isDashboard || isTenantDashboard) && <NotificationsPopover />}
           {pathname === '/' && (
            <div className="hidden md:flex">
              <InstallPWA />
            </div>
          )}
          {currentUser ? (
              <Button variant="outline" onClick={handleLogout} className="hidden md:flex">Logout</Button>
          ) : (
             <Button asChild className="hidden md:flex bg-primary hover:bg-primary/90">
                <Link href="/login">Login / Sign Up</Link>
            </Button>
          )}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader className="sr-only">
                <SheetTitle>Menu</SheetTitle>
                <SheetDescription>Main navigation</SheetDescription>
              </SheetHeader>
              <div className="flex flex-col gap-4 py-6">
                <Link href="/" className="flex items-center gap-2 mb-4">
                    <HomeIcon className="h-6 w-6 text-primary" />
                    <span className="font-bold text-lg font-headline">RentVastu</span>
                </Link>
                {navLinks.map((link) => {
                   if (!currentUser && (link.roles.includes('tenant') || link.roles.includes('owner'))) return null;
                   if (currentUser && !link.roles.includes('all') && !link.roles.includes(currentUser.role)) return null;
                   
                    return (
                        <Link
                        key={link.href}
                        href={link.href}
                        className={cn(
                            'text-lg font-medium transition-colors hover:text-primary',
                           pathname.startsWith(link.href) && link.href !== '/' || pathname === '/' && link.href === '/' ? 'text-primary' : 'text-muted-foreground'
                        )}
                        >
                        {link.label}
                        </Link>
                    )
                })}
                 {pathname === '/' && <InstallPWA />}
                  {currentUser ? (
                    <Button onClick={handleLogout} className="mt-4">Logout</Button>
                  ) : (
                    <Button asChild className="mt-4 bg-primary hover:bg-primary/90">
                        <Link href="/login">Login / Sign Up</Link>
                    </Button>
                  )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
