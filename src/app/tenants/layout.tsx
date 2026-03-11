
'use client'

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TenantSidebar from "@/components/tenant-sidebar";
import TenantBottomNav from "@/components/tenant-bottom-nav";
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useAppSelector } from '@/lib/hooks';
import InstallForceOverlay from '@/components/InstallForceOverlay';
import { ShieldAlert } from 'lucide-react';


export default function TenantDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { currentUser } = useAppSelector((state) => state.user);
  const { guests } = useAppSelector((state) => state.guests);
  const { isLoading } = useAppSelector((state) => state.app);
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!currentUser) {
      console.log(`[TenantLayout] No user found. Redirecting to login.`);
      router.replace('/login');
      return;
    }

    if (currentUser.role === 'unassigned') {
      console.log(`[TenantLayout] User is unassigned. Redirecting to profile completion.`);
      router.replace('/complete-profile');
    } else if (currentUser.role !== 'tenant') {
      console.log(`[TenantLayout] User is not a tenant (Role: ${currentUser.role}). Redirecting to dashboard.`);
      router.replace('/dashboard');
    }
  }, [isLoading, currentUser, router]);

  // Check if tenant is vacated
  const currentGuest = guests.find(g => g.id === currentUser?.guestId);
  const isVacated = currentUser?.role === 'tenant' && (!currentUser?.guestId || currentGuest?.isVacated);

  if (isLoading || !currentUser || currentUser.role !== 'tenant') {
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

  if (isVacated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-56px)] text-center px-4 bg-muted/40">
        <div className="bg-muted w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-lg border border-border">
          <ShieldAlert className="w-10 h-10 text-muted-foreground" />
        </div>
        <h2 className="text-3xl font-bold mb-4 tracking-tight">No Active Stay</h2>
        <p className="text-muted-foreground max-w-md mb-8 leading-relaxed">
          Your account is not linked to any active property or your stay has been vacated.
          Dashboard features are disabled for inactive accounts.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Button variant="default" className="px-8 shadow-sm" onClick={() => window.location.href = '/'}>Go Home</Button>
          <Button variant="outline" className="px-8 bg-background shadow-sm" onClick={() => router.refresh()}>Refresh State</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-56px)]">
      <TenantSidebar />
      <div className="flex flex-1 flex-col overflow-auto">
        <main className="flex-1 p-4 md:p-6 lg:p-8 bg-muted/40 pb-20 md:pb-4">
          {children}
        </main>
      </div>
      <TenantBottomNav />
      <InstallForceOverlay />
    </div>

  )
}

