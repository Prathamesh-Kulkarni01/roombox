
'use client'

import { useMemo, useRef } from "react"
import Link from "next/link"
import { useAppSelector } from "@/lib/hooks"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Skeleton } from "@/components/ui/skeleton"
import { Building, Home, IndianRupee, MessageSquareWarning, Users } from "lucide-react"

import { useDashboard } from '@/hooks/use-dashboard'

import StatsCards from '@/components/dashboard/StatsCards'
import PgLayout from '@/components/dashboard/PgLayout'
import AddGuestDialog from '@/components/dashboard/dialogs/AddGuestDialog'
import FloorDialog from '@/components/dashboard/dialogs/FloorDialog'
import RoomDialog from '@/components/dashboard/dialogs/RoomDialog'
import BedDialog from '@/components/dashboard/dialogs/BedDialog'
import PaymentDialog from '@/components/dashboard/dialogs/PaymentDialog'
import ReminderDialog from '@/components/dashboard/dialogs/ReminderDialog'

export default function DashboardPage() {
  const { pgs, guests, complaints } = useAppSelector(state => ({
    pgs: state.pgs.pgs,
    guests: state.guests.guests,
    complaints: state.complaints.complaints,
  }));

  const { isLoading, selectedPgId } = useAppSelector(state => state.app);
  const isFirstAvailableBedFound = useRef(false);

  const pgsToDisplay = useMemo(() => {
    isFirstAvailableBedFound.current = false;
    return selectedPgId ? pgs.filter(p => p.id === selectedPgId) : pgs;
  }, [pgs, selectedPgId]);

  const stats = useMemo(() => {
    const relevantGuests = selectedPgId ? guests.filter(g => g.pgId === selectedPgId) : guests;
    const relevantComplaints = selectedPgId ? complaints.filter(c => c.pgId === selectedPgId) : complaints;
    const totalOccupancy = pgsToDisplay.reduce((sum, pg) => sum + pg.occupancy, 0);
    const totalBeds = pgsToDisplay.reduce((sum, pg) => sum + pg.totalBeds, 0);
    const monthlyRevenue = relevantGuests.filter(g => g.rentStatus === 'paid').reduce((sum, g) => sum + g.rentAmount, 0);
    const openComplaintsCount = relevantComplaints.filter(c => c.status === 'open').length;
    return [
      { title: "Occupancy", value: `${totalOccupancy}/${totalBeds}`, icon: Users },
      { title: "Monthly Revenue", value: `₹${monthlyRevenue.toLocaleString('en-IN')}`, icon: IndianRupee },
      { title: "Open Complaints", value: openComplaintsCount, icon: MessageSquareWarning },
    ];
  }, [pgsToDisplay, guests, complaints, selectedPgId]);
  
  const dashboardActions = useDashboard({ pgs, guests, complaints });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-end gap-4">
          <div className="flex items-center space-x-2">
            <Skeleton className="h-6 w-24 rounded-md" />
            <Skeleton className="h-6 w-10 rounded-md" />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-5 w-3/4" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (pgs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[calc(100vh-250px)] text-center p-8 bg-card border rounded-lg">
        <Building className="mx-auto h-16 w-16 text-muted-foreground" />
        <h2 className="mt-6 text-2xl font-semibold">Welcome to Your Dashboard!</h2>
        <p className="mt-2 text-muted-foreground max-w-md">
          You haven&apos;t added any properties yet. Get started by adding your first one.
        </p>
        <Button asChild className="mt-6 bg-accent hover:bg-accent/90 text-accent-foreground">
          <Link href="/dashboard/pg-management">Add Your First Property</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-end gap-4">
          <div className="flex items-center space-x-2">
              <Label htmlFor="edit-mode" className="font-medium">Edit Mode</Label>
              <Switch id="edit-mode" checked={dashboardActions.isEditMode} onCheckedChange={dashboardActions.setIsEditMode} />
          </div>
        </div>
        
        <StatsCards stats={stats} />

        {pgsToDisplay.map(pg => (
          <PgLayout 
            key={pg.id} 
            pg={pg} 
            {...dashboardActions} 
            isFirstAvailableBedFound={isFirstAvailableBedFound}
          />
        ))}
      </div>
      
      {/* DIALOGS */}
      <AddGuestDialog {...dashboardActions} />
      <FloorDialog {...dashboardActions} />
      <RoomDialog {...dashboardActions} />
      <BedDialog {...dashboardActions} />
      <PaymentDialog {...dashboardActions} />
      <ReminderDialog {...dashboardActions} />
    </>
  )
}
