
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Menu, HomeIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useData } from '@/context/data-provider';
import { Skeleton } from './ui/skeleton';
import NotificationsPopover from './notifications-popover';
import InstallPWA from './install-pwa';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/tenants/complaints', label: 'Complaints' },
];

export default function Header() {
  const pathname = usePathname();
  const { pgs, selectedPgId, setSelectedPgId, isLoading, currentUser } = useData();
  const isDashboard = pathname.startsWith('/dashboard');

  const handleValueChange = (pgId: string) => {
    if (setSelectedPgId) {
        setSelectedPgId(pgId === 'all' ? null : pgId)
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 max-w-screen-2xl items-center justify-between px-4 gap-4">
        <div className="flex items-center gap-2 md:gap-4 flex-1 md:flex-none">
            <Link href="/" className="flex items-center gap-2 mr-2">
                <HomeIcon className="h-6 w-6 text-primary" />
                <span className="font-bold text-lg font-headline hidden sm:inline-block">PGOasis</span>
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
                            <SelectValue placeholder="Select a PG..." />
                        </SelectTrigger>
                        <SelectContent>
                             <SelectItem value="all">All PGs</SelectItem>
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
            if (link.href === '/dashboard' && !currentUser) return null;
            return (
                <Link
                key={link.href}
                href={link.href}
                className={cn(
                    'transition-colors hover:text-foreground/80',
                    pathname === link.href ? 'text-foreground' : 'text-muted-foreground'
                )}
                >
                {link.label}
                </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-2">
          {currentUser && isDashboard && <NotificationsPopover />}
           {pathname === '/' && (
            <div className="hidden md:flex">
              <InstallPWA />
            </div>
          )}
          <Button asChild className="hidden md:flex bg-primary hover:bg-primary/90">
            <Link href={currentUser ? "/dashboard" : "/login"}>{currentUser ? "Go to Dashboard" : "Login"}</Link>
          </Button>
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
                    <span className="font-bold text-lg font-headline">PGOasis</span>
                </Link>
                {navLinks.map((link) => (
                    <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                        'text-lg font-medium transition-colors hover:text-primary',
                        pathname === link.href ? 'text-primary' : 'text-muted-foreground'
                    )}
                    >
                    {link.label}
                    </Link>
                ))}
                 {pathname === '/' && <InstallPWA />}
                 <Button asChild className="mt-4 bg-primary hover:bg-primary/90">
                    <Link href={currentUser ? "/dashboard" : "/login"}>{currentUser ? "Go to Dashboard" : "Login"}</Link>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
