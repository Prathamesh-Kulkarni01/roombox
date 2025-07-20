
'use client'

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardSidebar from "@/components/dashboard-sidebar";
import DashboardBottomNav from "@/components/dashboard-bottom-nav";
import { Skeleton } from '@/components/ui/skeleton';
import { useAppSelector } from '@/lib/hooks';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { currentUser } = useAppSelector((state) => state.user);
  const { isLoading } = useAppSelector((state) => state.app);
  const router = useRouter();

  useEffect(() => {
    // If loading is finished and there's no user, or user is not an owner, redirect to login.
    if (!isLoading && (!currentUser || currentUser.role !== 'owner')) {
      router.replace('/login');
    }
  }, [isLoading, currentUser, router]);


  // Show a full-page skeleton while the initial user check is happening,
  // or if user role is not owner.
  if (isLoading || !currentUser || currentUser.role !== 'owner') {
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
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-4 w-4" />
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <Skeleton className="h-7 w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="flex justify-end">
              <div className="flex items-center space-x-2">
                <Skeleton className="h-5 w-20 rounded-md" />
                <Skeleton className="h-6 w-10 rounded-md" />
              </div>
            </div>
            <Card>
              <CardHeader>
                <Skeleton className="h-8 w-1/2" />
                <Skeleton className="h-5 w-3/4" />
              </CardHeader>
              <CardContent className="p-4 md:p-6 space-y-4">
                <Skeleton className="h-12 w-full" />
                <div className="space-y-6 pl-4 border-l">
                  <div className="space-y-4">
                    <Skeleton className="h-8 w-1/3" />
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                      <Skeleton className="aspect-square w-full rounded-lg" />
                      <Skeleton className="aspect-square w-full rounded-lg" />
                    </div>
                  </div>
                </div>
                <Skeleton className="h-12 w-full" />
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <>
      <div className="flex min-h-[calc(100vh-56px)]">
        <DashboardSidebar />
        <div className="flex flex-1 flex-col overflow-auto">
          <main className="flex-1 p-4 bg-muted/40 pb-20 md:pb-4">
            {children}
          </main>
        </div>
        <DashboardBottomNav />
      </div>
    </>
  )
}
