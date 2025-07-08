
'use client'

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardSidebar from "@/components/dashboard-sidebar";
import DashboardBottomNav from "@/components/dashboard-bottom-nav";
import { Skeleton } from '@/components/ui/skeleton';
import { useAppSelector } from '@/lib/hooks';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { currentUser } = useAppSelector((state) => state.user);
  const { isLoading } = useAppSelector((state) => state.app);
  const router = useRouter();

  useEffect(() => {
    // If loading is finished and there's no user, redirect to login.
    if (!isLoading && !currentUser) {
      router.replace('/login');
    }
  }, [isLoading, currentUser, router]);

  // Render the layout shell immediately if a user object exists,
  // even if other data is still loading.
  if (!currentUser) {
    // Show a full-page skeleton while the initial user check is happening,
    // or before redirecting.
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

  return (
      <div className="flex min-h-[calc(100vh-56px)]">
        <DashboardSidebar />
        <div className="flex flex-1 flex-col overflow-auto">
          <main className="flex-1 p-4 bg-muted/40 pb-20 md:pb-4">
            {/* Show skeleton only for the content area if still loading */}
            {isLoading ? <Skeleton className="h-full w-full" /> : children}
          </main>
        </div>
        <DashboardBottomNav />
      </div>
  )
}
