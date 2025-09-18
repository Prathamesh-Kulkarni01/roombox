
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Menu, HomeIcon, Building2, BookOpen, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from './ui/skeleton';
import NotificationsPopover from './notifications-popover';
import InstallPWA from './install-pwa';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { logoutUser } from '@/lib/slices/userSlice';
import { setSelectedPgId } from '@/lib/slices/appSlice';
import { ThemeToggle } from './theme-toggle';
import { Separator } from './ui/separator';

const navLinks = [
  { href: '/', label: 'Home', roles: ['all'] },
  { href: '/dashboard', label: 'Owner Dashboard', roles: ['owner', 'manager', 'cook', 'cleaner', 'security'] },
  { href: '/tenants/my-pg', label: 'My Dashboard', roles: ['tenant'] },
];

const trainingGuides = [
    { href: '/blog/creating-property', title: 'Creating a Property', description: 'Learn how to add your first property listing.' },
    { href: '/blog/setting-up-layout', title: 'Setting up Layout', description: 'Visually create floors, rooms, and beds.' },
    { href: '/blog/onboarding-guest', title: 'Onboarding a Guest', description: 'Add new guests and manage their details.' },
    { href: '/blog/collecting-rent', title: 'Collecting Rent', description: 'Track payments and manage dues.' },
    { href: '/blog/managing-staff', title: 'Managing Staff', description: 'Add staff and set permissions.' },
    { href: '/blog/expense-tracking', title: 'Tracking Expenses', description: 'Log and categorize your property expenses.' },
    { href: '/blog/setting-up-payouts', title: 'Setting Up Payouts', description: 'Link your bank account to receive payments.' },
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
  const isLandingPage = pathname === '/';

  const handleValueChange = (pgId: string) => {
    dispatch(setSelectedPgId(pgId === 'all' ? null : pgId));
  }

  const handleLogout = () => {
    dispatch(logoutUser());
    router.push('/login');
  }
  
  if (isLandingPage) {
      return null;
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 max-w-screen-2xl items-center justify-between px-4 gap-4">
        <div className="flex items-center gap-2 md:gap-4 flex-1 md:flex-none">
            <Link href="/" className="flex items-center gap-2 mr-2">
                <div className="w-8 h-8 bg-gradient-saffron rounded-lg flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-white" />
                </div>
                <span className="font-bold text-lg font-headline hidden sm:inline-block">RentSutra</span>
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
                            {pgs.map((pg, index) => (
                                <SelectItem key={`${pg.id}-${index}`} value={pg.id}>
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
              <div className="flex flex-col h-full">
                <div className="flex-1 overflow-y-auto">
                    <Link href="/" className="flex items-center gap-2 mb-4 p-4">
                        <div className="w-8 h-8 bg-gradient-saffron rounded-lg flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-white" />
                        </div>
                        <span className="font-bold text-lg font-headline">RentSutra</span>
                    </Link>
                    <div className="flex flex-col gap-4 py-6 px-4">
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
                    </div>
                    
                    <Separator className="my-4"/>

                    <div className="flex flex-col gap-1 px-4">
                        <h4 className="px-3 py-2 text-sm font-semibold text-muted-foreground">Guides &amp; Training</h4>
                        <div className="space-y-2">
                          {trainingGuides.map((guide) => (
                              <Link
                                  key={guide.href}
                                  href={guide.href}
                                  className='block p-3 rounded-lg hover:bg-muted'
                                  >
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="font-semibold">{guide.title}</p>
                                      <p className="text-sm text-muted-foreground">{guide.description}</p>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                                  </div>
                              </Link>
                          ))}
                        </div>
                    </div>
                </div>

                <div className="mt-auto p-4 border-t">
                    {pathname === '/' && <InstallPWA />}
                    {currentUser ? (
                        <Button onClick={handleLogout} className="w-full mt-4">Logout</Button>
                    ) : (
                        <Button asChild className="w-full mt-4 bg-primary hover:bg-primary/90">
                            <Link href="/login">Login / Sign Up</Link>
                        </Button>
                    )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
