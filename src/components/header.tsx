
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Menu, HomeIcon, Building2, BookOpen, ChevronRight, Languages, ArrowLeft, Bell, User, MessageSquareWarning, Search, Plus, LogOut, Globe, Moon, Sun, Settings2, Sparkles, IndianRupee, Building, Wallet, CreditCard, Receipt, Users, ShieldCheck, Contact, UtensilsCrossed, MessageCircle, UserCircle, Settings, LayoutDashboard, ChevronDown, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from './ui/skeleton';
import NotificationsPopover from './notifications-popover';
import InstallPWA from './install-pwa';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { UserRole } from '@/lib/types';
import { logoutUser } from '@/lib/slices/userSlice';
import { setSelectedPgId } from '@/lib/slices/appSlice';
import { ThemeToggle } from './theme-toggle';
import { Separator } from './ui/separator';
import { trainingGuides } from '@/lib/blog-data';
import { useTranslation } from '@/context/language-context';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { allNavItems } from '@/lib/navigation';
import { canViewFeature } from '@/lib/permissions';
import { usePermissionsStore } from '@/lib/stores/configStores';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import RoleSwitcher from './RoleSwitcher';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ThemePicker } from './theme-picker';
import { useTheme } from 'next-themes';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";


type NavLink = {
  href: string;
  label: string;
  roles: (UserRole | 'all')[];
};

const navLinks: NavLink[] = [
  { href: '/', label: 'Home', roles: ['all'] },
  { href: '/dashboard', label: 'Owner Dashboard', roles: ['owner', 'manager', 'cook', 'cleaner', 'security'] },
  { href: '/tenants/my-pg', label: 'My Dashboard', roles: ['tenant'] },
  { href: '/download', label: 'Download App', roles: ['all'] },
];


export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { pgs } = useAppSelector((state) => state.pgs);
  const { selectedPgId, isLoading } = useAppSelector((state) => state.app);
  const { currentUser, currentPlan } = useAppSelector((state) => state.user);
  const isCustomDbConnected = !!currentUser?.subscription?.enterpriseProject?.projectId;
  const { language, setLanguage, t } = useTranslation();
  const { setTheme } = useTheme();
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const runCommand = useCallback((command: () => void) => {
    setOpen(false)
    command()
  }, [])

  // Insights data
  const { guests = [] } = useAppSelector((state) => state.guests || {});
  const { complaints = [] } = useAppSelector((state) => state.complaints || {});
  const { pgs: pgsList = [] } = useAppSelector((state) => state.pgs || {});
  const { staff = [] } = useAppSelector((state) => state.staff || {});
  const { expenses = [] } = useAppSelector((state) => state.expenses || {});

  const getInsightForHref = (href: string) => {
    if (!currentUser || (currentUser.role !== 'owner' && currentUser.role !== 'admin' && currentUser.role !== 'manager')) return null;
    
    const filteredGuests = selectedPgId ? guests.filter(g => g.pgId === selectedPgId) : guests;
    const filteredComplaints = selectedPgId ? complaints.filter(c => c.pgId === selectedPgId) : complaints;
    const filteredPgs = selectedPgId ? pgsList.filter(p => p.id === selectedPgId) : pgsList;
    const filteredStaff = selectedPgId ? staff.filter(s => s.pgIds?.includes(selectedPgId)) : staff;
    const filteredExpenses = selectedPgId ? expenses.filter(e => e.pgId === selectedPgId) : expenses;

    if (href === '/dashboard/tenant-management') {
      const activeCount = filteredGuests.filter(g => !g.isVacated).length;
      return activeCount > 0 ? { label: `${activeCount} Active`, variant: 'default' as const } : null;
    }
    if (href === '/dashboard/complaints') {
      const openCount = filteredComplaints.filter(c => c.status === 'open').length;
      return openCount > 0 ? { label: `${openCount} New`, variant: 'destructive' as const } : null;
    }
    if (href === '/dashboard/kyc') {
      const pendingKyc = filteredGuests.filter(g => !g.isVacated && g.kycStatus === 'pending').length;
      return pendingKyc > 0 ? { label: `${pendingKyc} Pending`, variant: 'warning' as const } : null;
    }
    if (href === '/dashboard/pg-management') {
      const totalRooms = (filteredPgs || []).reduce((acc, p) => acc + (p?.totalRooms || 0), 0);
      return totalRooms > 0 ? { label: `${totalRooms} Units`, variant: 'muted' as const } : null;
    }
    if (href === '/dashboard/staff') {
      const activeStaff = (filteredStaff || []).filter(s => s?.isActive).length;
      return activeStaff > 0 ? { label: `${activeStaff} Active`, variant: 'default' as const } : null;
    }
    if (href === '/dashboard/rent-passbook') {
      const totalDues = (filteredGuests || []).reduce((acc, g) => acc + (g?.balance || 0), 0);
      return totalDues > 0 ? { label: `₹${totalDues.toLocaleString()}`, variant: 'destructive' as const } : null;
    }
    if (href === '/dashboard/expense') {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const monthlyTotal = (filteredExpenses || [])
        .filter(e => e?.date?.startsWith(currentMonth))
        .reduce((acc, e) => acc + (e?.amount || 0), 0);
      return monthlyTotal > 0 ? { label: `₹${monthlyTotal.toLocaleString()}`, variant: 'muted' as const } : null;
    }
    if (href === '/dashboard/wallet') {
      const balance = currentUser?.wallet?.balance || 0;
      return { label: `₹${balance.toLocaleString()}`, variant: (balance < 100 ? 'destructive' : 'success') as any };
    }
    return null;
  };

  const isDashboard = pathname.startsWith('/dashboard');
  const isTenantDashboard = pathname.startsWith('/tenants');
  const isLandingPage = pathname === '/';

  const handleValueChange = (pgId: string) => {
    dispatch(setSelectedPgId(pgId === 'all' ? null : pgId));

    // If we're on a property management page, update the URL to match the selection
    if (pathname.includes('/dashboard/pg-management/')) {
      if (pgId === 'all') {
        router.push('/dashboard');
      } else {
        router.push(`/dashboard/pg-management/${pgId}`);
      }
    }

    // Tenant specific logic: if they switch PG, clarify their guestId in state or just let the dashboard use the new pgId
    if (isTenantDashboard) {
        router.push('/tenants/my-pg');
    }
  }

  const handleLogout = () => {
    dispatch(logoutUser());
    router.push('/login');
  }

  if (isLandingPage && !currentUser) { // Don't show header on landing page for logged-out users
    return null;
  }

  return (
    <header className="sticky top-0 z-40 w-full glass border-b border-border/40 shadow-sm transition-all duration-300 px-4">
      <div className="container mx-auto flex h-16 items-center justify-between gap-4 p-0">
        <div className="flex items-center gap-2 flex-1">
          {/* Mobile Menu Button - Left Aligned */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden rounded-full active:scale-90">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[85%] sm:w-[380px] p-0 border-r-0 glass flex flex-col h-full overflow-hidden">
              <div className="flex-1 overflow-y-auto scrollbar-hide flex flex-col">
                <div className="p-4 pt-8 space-y-6">
                  {/* 1. Header Card: Branding + Profile + Plan + Quick Settings */}
                  <div className="relative p-5 rounded-[2.5rem] bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 shadow-2xl overflow-hidden group">
                    {/* Subtle Accent */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[80px] -mr-16 -mt-16 rounded-full opacity-50" />
                    
                    <div className="relative z-10 space-y-4">
                      <div className="flex items-center justify-between">
                        <Link href="/" className="flex items-center gap-2" onClick={() => (document.querySelector('[data-state="open"]') as any)?.click()}>
                          <div className="w-9 h-9 bg-zinc-800/50 rounded-2xl flex items-center justify-center border border-zinc-700/50 backdrop-blur-sm">
                            <Building2 className="h-4.5 w-4.5 text-primary" />
                          </div>
                          <span className="font-black text-xl tracking-tighter text-white">RentSutra</span>
                        </Link>
                        
                        <Link href="/dashboard/settings" onClick={() => (document.querySelector('[data-state="open"]') as any)?.click()}>
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 border border-zinc-700/50">
                            <Settings2 className="h-4.5 w-4.5" />
                          </Button>
                        </Link>
                      </div>

                      {currentUser && (
                        <div className="flex items-center gap-4 py-2">
                          <Link href="/dashboard/profile" onClick={() => (document.querySelector('[data-state="open"]') as any)?.click()} className="relative shrink-0">
                            <Avatar className="h-14 w-14 border-2 border-zinc-800 ring-2 ring-primary/20 shadow-2xl">
                              <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} />
                              <AvatarFallback className="bg-zinc-800 text-zinc-100 text-sm font-black">
                                {(currentUser.name || 'U').slice(0, 1).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 border-2 border-zinc-950 rounded-full shadow-lg" />
                          </Link>
                          <div className="flex-1 overflow-hidden">
                            <div className="flex items-center gap-2">
                              <p className="font-black text-lg truncate text-white leading-tight">{currentUser.name}</p>
                              {currentPlan && (
                                <div className="px-2 py-0.5 rounded-full bg-primary/20 text-[8px] font-black uppercase text-primary tracking-widest border border-primary/30">
                                  {currentPlan.name}
                                </div>
                              )}
                            </div>
                            <p className="text-xs text-zinc-400 font-bold mt-1 flex items-center gap-2">
                              <span className="capitalize">{t(currentUser.role as any)}</span>
                              <span className="w-1 h-1 rounded-full bg-zinc-700" />
                              <span className="truncate opacity-60">{currentUser.email}</span>
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 1.2 Quick Actions Bar - Integrated as a clean row */}
                  <div className="bg-muted/30 p-2 rounded-[2rem] border border-border/40 grid grid-cols-3 gap-1">
                    {[
                      { href: '/dashboard/tenant-management', label: 'Tenant', icon: Plus, color: 'text-blue-600' },
                      { href: '/dashboard/complaints', label: 'Issue', icon: MessageSquareWarning, color: 'text-amber-600' },
                      { href: '/dashboard/rent-passbook', label: 'Rent', icon: IndianRupee, color: 'text-emerald-600' }
                    ].map((action) => (
                      <Link key={action.label} href={action.href} onClick={() => (document.querySelector('[data-state="open"]') as any)?.click()}>
                        <Button variant="ghost" className="w-full h-auto py-3 px-1 rounded-2xl flex flex-col items-center gap-1.5 hover:bg-background/80 transition-all">
                          <div className={cn("w-9 h-9 rounded-xl bg-background flex items-center justify-center shadow-sm border border-border/20", action.color)}>
                            <action.icon className="w-4 h-4" />
                          </div>
                          <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{action.label}</span>
                        </Button>
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="py-2 px-4 space-y-8 pb-10">
                  {/* 2. Preferences (Theme/Lang) - Collapsible */}
                  <Collapsible
                    open={isPreferencesOpen}
                    onOpenChange={setIsPreferencesOpen}
                    className="px-1"
                  >
                    <CollapsibleTrigger asChild>
                      <Button 
                        variant="ghost" 
                        className="w-full flex items-center justify-between p-4 h-16 rounded-[1.75rem] bg-background/50 hover:bg-background transition-all border border-border/40 group shadow-sm"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Settings2 className="h-5 w-5 text-indigo-600" />
                          </div>
                          <div className="flex flex-col items-start">
                            <span className="text-sm font-black tracking-tight">System Preferences</span>
                            {!isPreferencesOpen && (
                              <span className="text-[10px] text-muted-foreground font-bold flex items-center gap-1.5">
                                <span className="flex items-center gap-1">
                                  <Globe className="h-2.5 w-2.5" />
                                  {language === 'en' ? 'English' : language === 'hi' ? 'हिंदी' : 'मराठी'}
                                </span>
                                <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                                <span className="flex items-center gap-1 capitalize">
                                   <UserCircle className="h-2.5 w-2.5" />
                                   {currentUser?.role}
                                </span>
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronDown className={cn(
                          "h-4 w-4 text-muted-foreground/50 transition-transform duration-300",
                          isPreferencesOpen && "rotate-180"
                        )} />
                      </Button>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent className="space-y-6 pt-6 px-1 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 px-2 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
                          <Globe className="h-3 w-3" />
                          <span>Language</span>
                        </div>
                        <ToggleGroup 
                          type="single" 
                          value={language} 
                          onValueChange={(val) => val && setLanguage(val as any)}
                          className="justify-start gap-2"
                        >
                          {['en', 'hi', 'mr'].map((lang) => (
                            <ToggleGroupItem key={lang} value={lang} className="flex-1 h-11 rounded-2xl border border-border/40 data-[state=on]:bg-primary data-[state=on]:text-white data-[state=on]:border-primary font-bold transition-all active:scale-95 text-xs">
                              {lang === 'en' ? 'English' : lang === 'hi' ? 'हिंदी' : 'मराठी'}
                            </ToggleGroupItem>
                          ))}
                        </ToggleGroup>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center gap-2 px-2 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
                          <Moon className="h-3 w-3" />
                          <span>Visual Theme</span>
                        </div>
                        <ThemePicker />
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center gap-2 px-2 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
                          <UserCircle className="h-3 w-3" />
                          <span>Switch Account Type</span>
                        </div>
                        <RoleSwitcher variant="list" />
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  {/* 3. Search */}
                  <div className="relative group px-1" onClick={() => setOpen(true)}>
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <input 
                      type="text" 
                      placeholder="Search features..." 
                      readOnly
                      className="w-full h-12 pl-12 pr-4 rounded-2xl bg-muted/30 border border-border/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-background transition-all text-sm font-medium cursor-pointer"
                    />
                  </div>

                  <nav className="space-y-8">
                    {/* 4. Navigation Links */}
                    {(isDashboard || isTenantDashboard) && (
                      <div className="space-y-10">
                        {allNavItems.map((group) => {
                          const accessibleItems = group.items.filter(item => {
                            return currentUser?.role === 'owner' || 
                              currentUser?.role === 'admin' || 
                              item.feature === 'core' || 
                              canViewFeature(usePermissionsStore.getState().featurePermissions, currentUser?.role as any, item.feature!);
                          });

                          if (accessibleItems.length === 0) return null;

                          // Dynamic Group Styles - Premium Palette
                          const groupStyles: Record<string, { color: string, bg: string, icon: any, label: string }> = {
                            'nav_group_financial': { color: 'text-emerald-600', bg: 'bg-emerald-500/10', icon: CreditCard, label: 'Financials' },
                            'nav_group_core': { color: 'text-blue-600', bg: 'bg-blue-500/10', icon: LayoutDashboard, label: 'Management' },
                            'nav_group_operations': { color: 'text-amber-600', bg: 'bg-amber-500/10', icon: UtensilsCrossed, label: 'Operations' },
                            'nav_group_growth': { color: 'text-violet-600', bg: 'bg-violet-500/10', icon: Sparkles, label: 'Growth' },
                          };
                          const style = groupStyles[group.title] || { color: 'text-primary', bg: 'bg-primary/10', icon: Sparkles, label: group.title };

                          return (
                            <div key={group.title} className="space-y-4">
                              <h4 className="px-3 text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.3em] flex items-center justify-between">
                                 <span className="flex items-center gap-2">
                                    <style.icon className={cn("w-3 h-3", style.color)} />
                                    {t(group.title as any)}
                                 </span>
                                 <div className="h-px bg-border/40 flex-1 ml-4" />
                              </h4>
                              <div className="grid grid-cols-1 gap-1.5">
                                {accessibleItems.map((item) => {
                                  const insight = getInsightForHref(item.href);
                                  const isActive = pathname === item.href;
                                  
                                  // Special case for Wallet item to look more prominent
                                  const isWallet = item.href === '/dashboard/wallet';

                                  return (
                                    <Link
                                      key={item.href}
                                      href={item.href}
                                      onClick={() => (document.querySelector('[data-state="open"]') as any)?.click()}
                                      className={cn(
                                        'flex items-center gap-4 p-3 rounded-[2rem] transition-all active:scale-[0.98] group relative overflow-hidden',
                                        isActive ? 'bg-primary/10 text-primary' : 'text-foreground/80 hover:bg-muted/40'
                                      )}
                                    >
                                      {/* Active Indicator Bar */}
                                      {isActive && (
                                        <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-primary rounded-r-full" />
                                      )}

                                      <div className={cn(
                                        "w-11 h-11 rounded-[1.1rem] flex items-center justify-center transition-all shadow-sm border border-transparent",
                                        isActive ? 'bg-primary shadow-lg shadow-primary/30 text-white border-primary/20' : cn('bg-muted/80 text-muted-foreground border-border/10 group-hover:scale-110 group-hover:rotate-3 transition-all', isWallet ? 'bg-emerald-500/10 text-emerald-600' : '')
                                      )}>
                                        <item.icon className={cn("h-5 w-5 transition-transform", isActive && "scale-110")} />
                                      </div>
                                      
                                      <div className="flex flex-col flex-1">
                                        <span className={cn("text-[14px] font-bold tracking-tight", isActive ? "text-primary font-black" : "text-foreground/90")}>
                                          {t(item.label as any)}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground/60 font-medium truncate max-w-[150px]">
                                          {t(item.description as any)}
                                        </span>
                                      </div>
                                      
                                      {insight && (
                                        <div className={cn(
                                          "px-3 py-1.5 rounded-full text-[10px] font-black tracking-tight shadow-sm border animate-in zoom-in-95 duration-300",
                                          insight.variant === 'destructive' ? "bg-red-500/10 text-red-600 border-red-500/20" :
                                          insight.variant === 'warning' ? "bg-amber-500/10 text-amber-600 border-amber-500/20" :
                                          insight.variant === 'success' ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                                          insight.variant === 'muted' ? "bg-muted text-muted-foreground border-border/20" :
                                          "bg-primary/10 text-primary border-primary/20"
                                        )}>
                                          {insight.label}
                                        </div>
                                      )}

                                      {!isActive && !insight && (
                                        <ChevronRight className="w-4 h-4 text-muted-foreground/20 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                                      )}
                                    </Link>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </nav>
                </div>
              </div>

              <div className="p-6 border-t border-border/40 bg-muted/20 pb-safe flex flex-col gap-4">
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    className="flex-1 justify-center gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-2xl h-12 font-black uppercase tracking-widest text-[10px] border border-border/40 hover:border-destructive/20 transition-all"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4" />
                    <span>{t('logout')}</span>
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="h-12 w-12 rounded-2xl border border-border/40 hover:bg-primary/5 hover:text-primary text-muted-foreground"
                    onClick={() => router.push('/help')}
                  >
                    <HelpCircle className="h-5 w-5" />
                  </Button>
                </div>
                
                <div className="flex items-center justify-between px-2">
                   <p className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest">Version 2.5.0 Premium</p>
                   <div className="flex gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-sm shadow-green-500/50" />
                      <p className="text-[9px] font-black text-primary/60 uppercase tracking-widest">System Online</p>
                   </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* Mobile Back Button or Logo */}
          {(isDashboard || isTenantDashboard) && pathname !== '/dashboard' && pathname !== '/tenants/my-pg' ? (
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden rounded-full active:scale-90"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          ) : (
            <Link href="/" className="flex items-center gap-2 shrink-0 group md:ml-0 -ml-1">
              <div className="w-9 h-9 bg-gradient-to-tr from-primary to-primary/80 rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center transition-all group-active:scale-95 group-hover:rotate-3">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-lg font-headline tracking-tighter hidden xs:inline-block">RentSutra</span>
            </Link>
          )}

          {/* Property Selector - Improved for Mobile */}
          {(isDashboard || isTenantDashboard) && currentUser && (
            isLoading ? (
              <Skeleton className="h-10 w-[120px] sm:w-[180px] rounded-full" />
            ) : (pgs.length > 0 || (currentUser.activeTenancies && currentUser.activeTenancies.length > 1)) ? (
              <div className="flex-1 max-w-[200px] md:max-w-xs flex justify-center md:justify-start">
                <Sheet>
                   <SheetTrigger asChild>
                      <Button variant="ghost" className="border-0 bg-muted/40 hover:bg-muted/60 h-10 px-4 rounded-full flex items-center gap-2 shadow-sm transition-all active:scale-95 group">
                        <Building2 className="h-4 w-4 text-primary shrink-0 group-hover:rotate-12 transition-transform" />
                        <span className="font-bold text-xs md:text-sm truncate max-w-[100px] sm:max-w-none">
                          {isDashboard ? 
                            (pgs.find(p => p.id === selectedPgId)?.name || (pgs.length === 1 ? pgs[0].name : "All Properties")) :
                            (currentUser.activeTenancies?.find((t: any) => t.pgId === selectedPgId)?.pgName || "Select Property")
                          }
                        </span>
                        <ChevronRight className="h-3 w-3 text-muted-foreground/50 rotate-90" />
                      </Button>
                   </SheetTrigger>
                   <SheetContent side="bottom" className="h-auto max-h-[85dvh] rounded-t-[2.5rem] p-0 border-t-0 glass flex flex-col pb-safe">
                      <div className="flex justify-center pt-3 pb-1">
                        <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full" />
                      </div>
                      <div className="p-6 pb-2">
                        <h3 className="text-xl font-bold tracking-tight">Select Property</h3>
                        <p className="text-sm text-muted-foreground mt-1">Switch between your managed properties</p>
                      </div>
                      <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {isDashboard && pgs.length > 1 && (
                          <Button 
                            variant={!selectedPgId ? "default" : "ghost"}
                            className={cn(
                              "w-full justify-start h-16 rounded-3xl gap-4 px-4 text-left",
                              !selectedPgId ? "shadow-lg shadow-primary/20" : "hover:bg-muted/50"
                            )}
                            onClick={() => {
                              handleValueChange('all');
                              (document.querySelector('[data-state="open"]') as any)?.click();
                            }}
                          >
                             <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center", !selectedPgId ? "bg-white/20" : "bg-primary/10")}>
                               <Building2 className={cn("h-5 w-5", !selectedPgId ? "text-white" : "text-primary")} />
                             </div>
                             <div className="flex flex-col">
                               <span className="font-bold">All Properties</span>
                               <span className="text-[10px] opacity-70">Unified dashboard view</span>
                             </div>
                          </Button>
                        )}
                        
                        {(isDashboard ? pgs : currentUser.activeTenancies || []).map((item: any) => {
                          const id = isDashboard ? item.id : item.pgId;
                          const name = isDashboard ? item.name : item.pgName;
                          const isSelected = selectedPgId === id;
                          
                          return (
                            <Button 
                              key={id}
                              variant={isSelected ? "default" : "ghost"}
                              className={cn(
                                "w-full justify-start h-16 rounded-3xl gap-4 px-4 text-left transition-all",
                                isSelected ? "shadow-lg shadow-primary/20 scale-[1.02]" : "hover:bg-muted/50"
                              )}
                              onClick={() => {
                                handleValueChange(id);
                                (document.querySelector('[data-state="open"]') as any)?.click();
                              }}
                            >
                               <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center", isSelected ? "bg-white/20" : "bg-muted/50")}>
                                 <Building className={cn("h-5 w-5", isSelected ? "text-white" : "text-muted-foreground")} />
                               </div>
                               <div className="flex flex-col flex-1 overflow-hidden">
                                 <span className="font-bold truncate">{name}</span>
                                 <span className="text-[10px] opacity-70 truncate">{isDashboard ? "Managed Property" : "Active Tenancy"}</span>
                               </div>
                               {isSelected && (
                                  <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center">
                                    <div className="w-2 h-2 rounded-full bg-primary" />
                                  </div>
                               )}
                            </Button>
                          );
                        })}
                      </div>
                   </SheetContent>
                </Sheet>
              </div>
            ) : (isTenantDashboard && currentUser.activeTenancies?.length === 1) ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold shadow-sm animate-in fade-in slide-in-from-left-2">
                <Building2 className="h-3.5 w-3.5" />
                <span className="truncate max-w-[120px]">{currentUser.activeTenancies[0].pgName}</span>
              </div>
            ) : null
          )}
        </div>


        <nav className="hidden md:flex items-center gap-6 text-sm absolute left-1/2 -translate-x-1/2">
          {navLinks.map((link) => {
            const hasRole = currentUser && (link.roles.includes('all') || (currentUser.role && link.roles.includes(currentUser.role)));
            const isPublicLink = link.roles.includes('all');

            if (!currentUser && !isPublicLink) return null;
            if (currentUser && !hasRole) return null;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'transition-colors hover:text-foreground/80 font-medium',
                  (pathname.startsWith(link.href) && link.href !== '/' || pathname === '/' && link.href === '/') ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {currentUser && (
            <div className="hidden sm:flex">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <div className="relative flex h-3 w-3">
                      <span className={cn(
                        "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                        isCustomDbConnected ? "bg-green-400" : "bg-yellow-400"
                      )}></span>
                      <span className={cn(
                        "relative inline-flex rounded-full h-3 w-3",
                        isCustomDbConnected ? "bg-green-500" : "bg-yellow-500"
                      )}></span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-sm font-medium">
                      {isCustomDbConnected ? 'Connected to Custom DB' : 'Connected to App DB'}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}

          {/* Search Trigger - Mobile/Desktop */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full h-10 w-10 active:scale-90 transition-transform"
            onClick={() => setOpen(true)}
          >
            <Search className="h-5 w-5 text-muted-foreground" />
          </Button>
          
          <div className="hidden md:flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Languages className="h-[1.2rem] w-[1.2rem]" />
                  <span className="sr-only">Change language</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setLanguage('en')}>English</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage('hi')}>हिंदी (Hindi)</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage('mr')}>मराठी (Marathi)</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <RoleSwitcher />
            <ThemeToggle />
          </div>

          {currentUser && (isDashboard || isTenantDashboard) && <NotificationsPopover />}
          
          {currentUser ? (
            <div className="hidden md:flex ml-2">
              <Button variant="outline" onClick={handleLogout} className="rounded-full">Logout</Button>
            </div>
          ) : (
            <Button asChild className="hidden md:flex bg-primary hover:bg-primary/90 rounded-full px-6">
              <Link href="/login">{process.env.NODE_ENV === 'development' ? 'Login / Sign Up' : 'Login'}</Link>
            </Button>
          )}
        </div>
      </div>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          
          <CommandGroup heading="Navigation">
            {allNavItems.flatMap(group => group.items).filter(item => {
              return currentUser?.role === 'owner' || 
                currentUser?.role === 'admin' || 
                item.feature === 'core' || 
                canViewFeature(usePermissionsStore.getState().featurePermissions, currentUser?.role as any, item.feature!);
            }).map((item) => {
              const insight = getInsightForHref(item.href);
              return (
                <CommandItem
                  key={item.href}
                  onSelect={() => runCommand(() => router.push(item.href))}
                  className="flex items-center gap-3 p-3"
                >
                  <div className="w-9 h-9 rounded-xl bg-muted/50 flex items-center justify-center">
                    <item.icon className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col flex-1">
                    <span className="font-bold text-sm">{t(item.label as any)}</span>
                    <span className="text-[10px] text-muted-foreground line-clamp-1">{t(item.description as any)}</span>
                  </div>
                  {insight && (
                    <div className={cn(
                      "px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider",
                      insight.variant === 'destructive' ? "bg-red-500/10 text-red-600" : 
                      insight.variant === 'success' ? "bg-emerald-500/10 text-emerald-600" :
                      "bg-primary/10 text-primary"
                    )}>
                      {insight.label}
                    </div>
                  )}
                </CommandItem>
              );
            })}
          </CommandGroup>

          {pgs.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Properties">
                {pgs.map((pg) => (
                  <CommandItem
                    key={pg.id}
                    onSelect={() => runCommand(() => {
                      handleValueChange(pg.id);
                      router.push('/dashboard');
                    })}
                    className="flex items-center gap-2"
                  >
                    <Building2 className="mr-2 h-4 w-4" />
                    <span>{pg.name}</span>
                    <span className="ml-auto text-[10px] text-muted-foreground uppercase font-bold">Switch to</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {guests.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Tenants">
                {guests.filter(g => !g.isVacated).slice(0, 10).map((guest) => (
                  <CommandItem
                    key={guest.id}
                    onSelect={() => runCommand(() => {
                      // Navigate to tenant management with filter if possible, 
                      // for now just go to management
                      router.push('/dashboard/tenant-management');
                    })}
                    className="flex items-center gap-2"
                  >
                    <User className="mr-2 h-4 w-4" />
                    <div className="flex flex-col">
                      <span className="font-bold">{guest.name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {pgs.find(p => p.id === guest.pgId)?.name} • Room {guest.roomName || 'N/A'}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          <CommandSeparator />
          <CommandGroup heading="Settings">
            <CommandItem onSelect={() => runCommand(() => router.push('/dashboard/profile'))}>
              <UserCircle className="mr-2 h-4 w-4" />
              <span>Profile</span>
              <CommandShortcut>⌘P</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push('/dashboard/settings'))}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
              <CommandShortcut>⌘S</CommandShortcut>
            </CommandItem>
            <CommandSeparator />
            <CommandItem onSelect={() => runCommand(() => setTheme("light"))}>
              <Sun className="mr-2 h-4 w-4" />
              <span>Light Mode</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => setTheme("dark"))}>
              <Moon className="mr-2 h-4 w-4" />
              <span>Dark Mode</span>
            </CommandItem>
            <CommandSeparator />
            <CommandItem onSelect={() => runCommand(handleLogout)}>
              <LogOut className="mr-2 h-4 w-4 text-red-500" />
              <span className="text-red-500">Logout</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </header>
  );
}
