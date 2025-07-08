
'use client'

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardSidebar from "@/components/dashboard-sidebar";
import DashboardBottomNav from "@/components/dashboard-bottom-nav";
import { Skeleton } from '@/components/ui/skeleton';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { startTour, setTourStep } from '@/lib/slices/appSlice';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const dispatch = useAppDispatch();
  const { currentUser, currentPlan } = useAppSelector((state) => state.user);
  const { pgs } = useAppSelector(state => state.pgs);
  const { isLoading, tour } = useAppSelector((state) => state.app);
  const router = useRouter();

  useEffect(() => {
    // If loading is finished and there's no user, redirect to login.
    if (!isLoading && !currentUser) {
      router.replace('/login');
    }
  }, [isLoading, currentUser, router]);

  useEffect(() => {
    // Trigger the tour for new owners who haven't added a PG yet.
    if (!isLoading && currentUser?.role === 'owner' && pgs.length === 0 && !tour.hasCompleted) {
      const timer = setTimeout(() => {
        dispatch(startTour());
      }, 500); // Small delay to allow the UI to settle
      return () => clearTimeout(timer);
    }
  }, [isLoading, currentUser, pgs, tour.hasCompleted, dispatch]);

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
      <>
        <Dialog open={tour.isActive && tour.step === 0}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Welcome to RoomBox!</DialogTitle>
                    <DialogDescription>
                        Let's get you set up. This quick tour will show you how to add your first property.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button onClick={() => dispatch(setTourStep(1))}>Start Tour</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
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
      </>
  )
}
