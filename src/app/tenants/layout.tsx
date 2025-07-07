
'use client'

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TenantSidebar from "@/components/tenant-sidebar";
import { Skeleton } from '@/components/ui/skeleton';
import { useAppSelector } from '@/lib/hooks';

export default function TenantDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { currentUser } = useAppSelector((state) => state.user);
  const { isLoading } = useAppSelector((state) => state.app);
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!currentUser || currentUser.role !== 'tenant')) {
      router.replace('/login');
    }
  }, [isLoading, currentUser, router]);

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

  return (
      <div className="flex min-h-[calc(100vh-56px)]">
        <TenantSidebar />
        <main className="flex-1 p-4 md:p-6 lg:p-8 bg-muted/40">
            {children}
        </main>
      </div>
  )
}
