
'use client'

import { useMemo, useRef, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from 'next/link'
import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Skeleton } from "@/components/ui/skeleton"
import { Building, IndianRupee, MessageSquareWarning, Users } from "lucide-react"

import { useDashboard } from '@/hooks/use-dashboard'
import { setTourStepIndex } from '@/lib/slices/appSlice'

import StatsCards from '@/components/dashboard/StatsCards'
import PgLayout from '@/components/dashboard/PgLayout'
import AddGuestDialog from '@/components/dashboard/dialogs/AddGuestDialog'
import FloorDialog from '@/components/dashboard/dialogs/FloorDialog'
import RoomDialog from '@/components/dashboard/dialogs/RoomDialog'
import BedDialog from '@/components/dashboard/dialogs/BedDialog'
import PaymentDialog from '@/components/dashboard/dialogs/PaymentDialog'
import ReminderDialog from '@/components/dashboard/dialogs/ReminderDialog'
import AddPgSheet from "@/components/add-pg-sheet"
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog"

export default function DashboardPage() {
  const dispatch = useAppDispatch();
  const { pgs, guests, complaints } = useAppSelector(state => ({
    pgs: state.pgs.pgs,
    guests: state.guests.guests,
    complaints: state.complaints.complaints,
  }));

  const { isLoading, selectedPgId, tour } = useAppSelector(state => state.app);
  const [isEditMode, setIsEditMode] = useState(false)
  const isFirstAvailableBedFound = useRef(false);
  const [isAddPgSheetOpen, setIsAddPgSheetOpen] = useState(false);
  const router = useRouter();

  const {
    isAddGuestDialogOpen, setIsAddGuestDialogOpen,
    isFloorDialogOpen, setIsFloorDialogOpen,
    isRoomDialogOpen, setIsRoomDialogOpen,
    isBedDialogOpen, setIsBedDialogOpen,
    isPaymentDialogOpen, setIsPaymentDialogOpen,
    isReminderDialogOpen, setIsReminderDialogOpen,
    itemToDelete, setItemToDelete,
    ...dashboardActions
  } = useDashboard({ pgs, guests });

  // Auto-enable edit mode if a PG exists but has no layout
  useEffect(() => {
    const hasPgs = pgs.length > 0;
    const hasLayout = hasPgs && pgs.some(p => p.totalBeds > 0);
    if (!isLoading && hasPgs && !hasLayout) {
        setIsEditMode(true);
    }
  }, [pgs, isLoading]);

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
  
  const handleSheetOpenChange = (open: boolean) => {
      setIsAddPgSheetOpen(open);
      if (!open && pgs.length === 0) {
          dispatch(setTourStepIndex(1));
      }
  }

  const handleDeleteConfirm = () => {
    if (itemToDelete) {
      dashboardActions.handleDelete(itemToDelete.type, itemToDelete.ids);
      setItemToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
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
    );
  }

  if (pgs.length === 0) {
    return (
      <>
        <AddPgSheet
          open={isAddPgSheetOpen}
          onOpenChange={handleSheetOpenChange}
          onPgAdded={(pgId) => { /* No redirect here anymore */ }}
        />
        <div className="flex flex-col items-center justify-center h-full min-h-[calc(100vh-250px)] text-center p-8 bg-card border rounded-lg">
          <Building className="mx-auto h-16 w-16 text-muted-foreground" />
          <h2 className="mt-6 text-2xl font-semibold">Welcome to Your Dashboard!</h2>
          <p className="mt-2 text-muted-foreground max-w-md">
            You haven&apos;t added any properties yet. Get started by adding your first one.
          </p>
          <Button 
            data-tour="add-first-pg-button" 
            onClick={() => {
                setIsAddPgSheetOpen(true);
                dispatch(setTourStepIndex(1));
            }} 
            className="mt-6 bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            Add Your First Property
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        <StatsCards stats={stats} />
        
        <div className="flex flex-wrap items-center justify-end gap-4">
          <div className="flex items-center space-x-2">
              <Label htmlFor="edit-mode" className="font-medium">Edit Mode</Label>
              <Switch id="edit-mode" checked={isEditMode} onCheckedChange={setIsEditMode} data-tour="edit-mode-switch"/>
          </div>
        </div>

        {pgsToDisplay.map(pg => (
          <PgLayout 
            key={pg.id} 
            pg={pg} 
            isEditMode={isEditMode}
            isFirstAvailableBedFound={isFirstAvailableBedFound}
            setItemToDelete={setItemToDelete}
            {...dashboardActions}
          />
        ))}
      </div>
      
      {/* DIALOGS */}
      <AddGuestDialog isAddGuestDialogOpen={isAddGuestDialogOpen} setIsAddGuestDialogOpen={setIsAddGuestDialogOpen} {...dashboardActions} />
      <FloorDialog isFloorDialogOpen={isFloorDialogOpen} setIsFloorDialogOpen={setIsFloorDialogOpen} {...dashboardActions}/>
      <RoomDialog isRoomDialogOpen={isRoomDialogOpen} setIsRoomDialogOpen={setIsRoomDialogOpen} {...dashboardActions} />
      <BedDialog isBedDialogOpen={isBedDialogOpen} setIsBedDialogOpen={setIsBedDialogOpen} {...dashboardActions} />
      <PaymentDialog isPaymentDialogOpen={isPaymentDialogOpen} setIsPaymentDialogOpen={setIsPaymentDialogOpen} {...dashboardActions} />
      <ReminderDialog isReminderDialogOpen={isReminderDialogOpen} setIsReminderDialogOpen={setIsReminderDialogOpen} {...dashboardActions}/>
    
      <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the {itemToDelete?.type} and all items inside it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
