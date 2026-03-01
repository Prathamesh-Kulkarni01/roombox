
'use client'

import { useEffect, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import DashboardSidebar from "@/components/dashboard-sidebar";
import DashboardBottomNav from "@/components/dashboard-bottom-nav";
import { Skeleton } from '@/components/ui/skeleton';
import { useAppSelector } from '@/lib/hooks';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { navPermissions } from '@/lib/permissions';
import { isAfter, parseISO, differenceInDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { plans } from '@/lib/mock-data';
import type { PlanName, UserRole } from '@/lib/types';
import Link from 'next/link';
import { ShieldAlert, Star } from 'lucide-react';


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
  const { currentUser, currentPlan } = useAppSelector((state) => state.user);
  const { isLoading } = useAppSelector((state) => state.app);
  const router = useRouter();
  const pathname = usePathname();

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
  
  const showSubscriptionGate = currentPlan && currentPlan.id === 'free' && currentUser.subscription?.status !== 'active' && currentUser.subscription?.status !== 'trialing' && pathname !== '/dashboard/settings';
  const showTrialBanner = currentUser?.subscription?.status === 'trialing' && currentUser.subscription?.trialEndDate && isAfter(parseISO(currentUser.subscription.trialEndDate), new Date());

  return (
    <>
      <div className="flex min-h-[calc(100vh-56px)]">
        <DashboardSidebar />
        <div className="flex flex-1 flex-col overflow-auto">
          <main className="flex-1 p-4 bg-muted/40 pb-20 md:pb-4">
            {showTrialBanner && <TrialBanner trialEndDate={currentUser.subscription!.trialEndDate!} />}
            {showSubscriptionGate ? <SubscriptionGate /> : children}
          </main>
        </div>
        <DashboardBottomNav />
      </div>
    </>
  )
}

    