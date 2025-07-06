
'use client'

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useData } from '@/context/data-provider';
import DashboardSidebar from "@/components/dashboard-sidebar";
import DashboardBottomNav from "@/components/dashboard-bottom-nav";
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { currentUser, isLoading } = useData();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !currentUser) {
      router.replace('/login');
    }
  }, [isLoading, currentUser, router]);

  if (isLoading || !currentUser) {
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
            {children}
          </main>
        </div>
        <DashboardBottomNav />
      </div>
  )
}
