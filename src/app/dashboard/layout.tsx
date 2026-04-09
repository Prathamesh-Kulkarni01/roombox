
'use client'

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import DashboardSidebar from "@/components/dashboard-sidebar";
import DashboardBottomNav from "@/components/dashboard-bottom-nav";
import { Skeleton } from '@/components/ui/skeleton';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { useTranslation } from '@/context/language-context';
import Header from "@/components/header";
import { Card } from '@/components/ui/card';
import { isAfter, parseISO, differenceInDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import type { UserRole } from '@/lib/types';
import Link from 'next/link';
import { ShieldAlert, Star, Crown } from 'lucide-react';
import { logoutUser } from '@/lib/slices/userSlice';
import InstallForceOverlay from '@/components/InstallForceOverlay';
import { useRouteGuard } from '@/hooks/useRouteGuard';



const SubscriptionGate = () => (
  <div className="flex items-center justify-center h-full">
    <div className="text-center p-8 bg-card rounded-lg border max-w-lg">
      <ShieldAlert className="mx-auto h-12 w-12 text-primary" />
      <h2 className="mt-4 text-2xl font-semibold">Your Trial Has Ended</h2>
      <p className="mt-2 text-muted-foreground">
        Please subscribe to a plan to continue managing your properties and access all features.
      </p>
      <Button className="mt-6" asChild>
        <Link href="/dashboard/settings">Choose Your Plan</Link>
      </Button>
    </div>
  </div>
);

const TrialBanner = ({ trialEndDate }: { trialEndDate: string }) => {
  const daysLeft = differenceInDays(parseISO(trialEndDate), new Date());
  return (
    <div className="bg-accent text-accent-foreground p-3 text-center text-sm font-medium mb-6 rounded-lg">
      <p>
        <Star className="w-4 h-4 inline-block mr-2" />
        You are on a Pro trial. {daysLeft > 0 ? `You have ${daysLeft} day(s) left.` : 'Your trial ends today.'}
        <Button variant="link" asChild className="text-accent-foreground h-auto p-0 pl-2 underline">
          <Link href="/dashboard/settings">Upgrade Now</Link>
        </Button>
      </p>
    </div>
  );
};


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const { currentUser, currentPlan } = useAppSelector((state) => state.user);
  const { isLoading } = useAppSelector((state) => state.app);
  const router = useRouter();
  const pathname = usePathname();

  // Enforce route-level permissions for staff users
  useRouteGuard();

  const allowedDashboardRoles: UserRole[] = ['owner', 'manager', 'cook', 'cleaner', 'security', 'other'];

  useEffect(() => {
    if (isLoading) return;

    if (!currentUser) {
      router.replace('/login');
      return;
    }

    if (currentUser.role === 'admin') {
      router.replace('/admin/dashboard');
    } else if (currentUser.role === 'unassigned') {
      router.replace('/complete-profile');
    } else if (currentUser.role === 'tenant') {
      router.replace('/tenants/my-pg');
    } else if (!allowedDashboardRoles.includes(currentUser.role)) {
      router.replace('/login');
    }
  }, [isLoading, currentUser, router]);

  if (isLoading || !currentUser || !allowedDashboardRoles.includes(currentUser.role)) {
    return (
      <div className="flex min-h-[calc(100vh-56px)]">
        <div className="w-64 flex-col border-r bg-muted hidden md:flex p-4">
          <Skeleton className="h-8 w-3/4 mb-6" />
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
        <main className="flex-1 p-4 bg-muted/40">
          <Skeleton className="h-full w-full" />
        </main>
      </div>
    );
  }

  const isOwner = currentUser?.role === 'owner';
  const showSubscriptionGate = isOwner && currentPlan && currentPlan.id === 'free' && currentUser.subscription?.status !== 'active' && currentUser.subscription?.status !== 'trialing' && pathname !== '/dashboard/settings';

  if (showSubscriptionGate) {
    return (
      <div className="flex flex-col h-screen">
        <Header />
        <div className="flex-1 flex items-center justify-center p-6 bg-muted/30">
          <Card className="max-w-md w-full p-8 text-center space-y-6 shadow-xl border-t-4 border-t-primary">
            <div className="flex justify-center">
              <div className="p-4 bg-primary/10 rounded-full">
                <Crown className="h-12 w-12 text-primary animate-pulse" />
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold font-headline">{t('trial_ended_title')}</h1>
              <p className="text-muted-foreground">{t('trial_ended_description')}</p>
            </div>
            
            <div className="pt-4 flex flex-col gap-3">
              {isOwner ? (
                <Button asChild size="lg" className="w-full font-semibold shadow-lg shadow-primary/20">
                  <Link href="/dashboard/settings?tab=subscription">
                    {t('choose_plan_button')}
                  </Link>
                </Button>
              ) : (
                <p className="text-sm text-amber-600 font-medium bg-amber-50 p-3 rounded-lg border border-amber-100">
                  Please contact the owner to renew the subscription.
                </p>
              )}
              <Button variant="outline" onClick={() => dispatch(logoutUser())} className="w-full">
                {t('logout')}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const showTrialBanner = currentUser?.subscription?.status === 'trialing' && currentUser.subscription?.trialEndDate && isAfter(parseISO(currentUser.subscription.trialEndDate), new Date());

  return (
    <>
      <div className="flex min-h-[calc(100vh-56px)]">
        <DashboardSidebar />
        <div className="flex flex-1 flex-col overflow-auto">
          <main className="flex-1 p-4 bg-muted/40 pb-20 md:pb-4">
            {showTrialBanner && <TrialBanner trialEndDate={currentUser.subscription!.trialEndDate!} />}
            {children}
          </main>
        </div>
        <DashboardBottomNav />
      </div>
      <InstallForceOverlay />
    </>

  )
}
