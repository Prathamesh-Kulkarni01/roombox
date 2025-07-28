
'use client'

import { useMemo, useRef, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from 'next/link'
import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Skeleton } from "@/components/ui/skeleton"
import { Building, IndianRupee, MessageSquareWarning, Users, FileWarning, Loader2, Filter, Search } from "lucide-react"
import RoomDialog from '@/components/dashboard/dialogs/RoomDialog'
import { useDashboard } from '@/hooks/use-dashboard'
import { setTourStepIndex } from '@/lib/slices/appSlice'
import { canAccess } from '@/lib/permissions';

import StatsCards from '@/components/dashboard/StatsCards'
import PgLayout from '@/components/dashboard/PgLayout'
import AddGuestDialog from '@/components/dashboard/dialogs/AddGuestDialog'
import EditGuestDialog from '@/components/dashboard/dialogs/EditGuestDialog'
import FloorDialog from '@/components/dashboard/dialogs/FloorDialog'
import BedDialog from '@/components/dashboard/dialogs/BedDialog'
import PaymentDialog from '@/components/dashboard/dialogs/PaymentDialog'
import ReminderDialog from '@/components/dashboard/dialogs/ReminderDialog'
import SharedChargeDialog from '@/components/dashboard/dialogs/SharedChargeDialog'
import AddPgSheet from "@/components/add-pg-sheet"
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import Access from '@/components/ui/PermissionWrapper';
import type { BedStatus } from '@/lib/types'

const bedLegend: Record<BedStatus, { label: string, className: string }> = {
  available: { label: 'Available', className: 'bg-yellow-200' },
  occupied: { label: 'Occupied', className: 'bg-slate-200' },
  'rent-pending': { label: 'Rent Pending', className: 'bg-red-300' },
  'rent-partial': { label: 'Partial Payment', className: 'bg-orange-200' },
  'notice-period': { label: 'Notice Period', className: 'bg-blue-200' },
};


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

  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState<BedStatus[]>([]);

  const {
    isAddGuestDialogOpen, setIsAddGuestDialogOpen,
    isEditGuestDialogOpen, setIsEditGuestDialogOpen,
    isRoomDialogOpen, setIsRoomDialogOpen, roomToEdit, roomForm, handleRoomSubmit, isSavingRoom,
    isFloorDialogOpen, setIsFloorDialogOpen, floorToEdit, floorForm, handleFloorSubmit,
    isBedDialogOpen, setIsBedDialogOpen, bedToEdit, bedForm, handleBedSubmit,
    isPaymentDialogOpen, setIsPaymentDialogOpen,
    isReminderDialogOpen, setIsReminderDialogOpen,
    isSharedChargeDialogOpen, setIsSharedChargeDialogOpen,
    itemToDelete, setItemToDelete,
    guestToInitiateExit, setGuestToInitiateExit,
    handleConfirmInitiateExit,
    guestToExitImmediately, setGuestToExitImmediately,
    handleConfirmImmediateExit,
    ...dashboardActions
  } = useDashboard({ pgs, guests });

  const { currentUser } = useAppSelector(state => state.user);
  const { featurePermissions } = useAppSelector(state => state.permissions);

  // Auto-enable edit mode if a PG exists but has no layout
  useEffect(() => {
    const hasPgs = pgs.length > 0;
    const hasLayout = hasPgs && pgs.some(p => p.totalBeds > 0);
    if (!isLoading && hasPgs && !hasLayout) {
      setIsEditMode(true);
    }
  }, [pgs, isLoading]);
  
  const getBedStatus = (bed: any): BedStatus => {
    const guest = guests.find(g => g.id === bed.guestId && !g.isVacated)
    if (!guest || guest.isVacated) return 'available'
    if (guest.exitDate) return 'notice-period'
    if (guest.rentStatus === 'unpaid') return 'rent-pending'
    if (guest.rentStatus === 'partial') return 'rent-partial'
    return 'occupied'
  }

  const pgsToDisplay = useMemo(() => {
    isFirstAvailableBedFound.current = false;
    let filteredPgs = selectedPgId ? pgs.filter(p => p.id === selectedPgId) : pgs;

    if (!searchTerm && activeFilters.length === 0) {
        return filteredPgs;
    }
    
    const lowercasedSearchTerm = searchTerm.toLowerCase();

    return filteredPgs.map(pg => {
        const filteredFloors = (pg.floors || [])
            .map(floor => {
                const filteredRooms = (floor.rooms || [])
                    .map(room => {
                        const guestMap = new Map(guests.map(g => [g.id, g]));
                        
                        const filteredBeds = (room.beds || []).filter(bed => {
                            const guest = bed.guestId ? guestMap.get(bed.guestId) : null;
                            const bedStatus = getBedStatus(bed);

                            const matchesSearch = 
                                guest?.name.toLowerCase().includes(lowercasedSearchTerm) ||
                                room.name.toLowerCase().includes(lowercasedSearchTerm) ||
                                bed.name.toLowerCase().includes(lowercasedSearchTerm);
                            
                            const matchesFilter = activeFilters.length === 0 || activeFilters.includes(bedStatus);
                            
                            return matchesSearch && matchesFilter;
                        });

                        return filteredBeds.length > 0 ? { ...room, beds: filteredBeds } : null;
                    })
                    .filter((room): room is NonNullable<typeof room> => room !== null);

                return filteredRooms.length > 0 ? { ...floor, rooms: filteredRooms } : null;
            })
            .filter((floor): floor is NonNullable<typeof floor> => floor !== null);

        return filteredFloors.length > 0 ? { ...pg, floors: filteredFloors } : null;
    }).filter((pg): pg is NonNullable<typeof pg> => pg !== null);
  }, [pgs, selectedPgId, searchTerm, activeFilters, guests]);

  const stats = useMemo(() => {
    const relevantPgs = selectedPgId ? pgs.filter(p => p.id === selectedPgId) : pgs;
    const relevantGuests = selectedPgId ? guests.filter(g => g.pgId === selectedPgId) : guests;
    const relevantComplaints = selectedPgId ? complaints.filter(c => c.pgId === selectedPgId) : complaints;
    
    // Correctly calculate total occupancy based on active guests
    const totalOccupancy = relevantGuests.filter(g => !g.isVacated).length;
    const totalBeds = relevantPgs.reduce((sum, pg) => sum + pg.totalBeds, 0);
    
    const monthlyRevenue = relevantGuests
      .filter(g => g.rentStatus === 'paid' && !g.isVacated)
      .reduce((sum, g) => sum + g.rentAmount, 0);

    const openComplaintsCount = relevantComplaints.filter(c => c.status === 'open').length;

    const pendingDues = relevantGuests
      .filter(g => !g.isVacated && (g.rentStatus === 'unpaid' || g.rentStatus === 'partial'))
      .reduce((sum, g) => sum + (g.rentAmount - (g.rentPaidAmount || 0)), 0);

    return [
      { title: "Occupancy", value: `${totalOccupancy}/${totalBeds}`, icon: Users, feature: "properties", action: "view" },
      { title: "Collected Rent", value: `₹${monthlyRevenue.toLocaleString('en-IN')}`, icon: IndianRupee, feature: "finances", action: "view" },
      { title: "Pending Dues", value: `₹${pendingDues.toLocaleString('en-IN')}`, icon: FileWarning, feature: "finances", action: "view" },
      { title: "Open Complaints", value: openComplaintsCount, icon: MessageSquareWarning, feature: "complaints", action: "view" },
    ];
  }, [pgs, guests, complaints, selectedPgId]);
  
  const handleFilterChange = (status: BedStatus, checked: boolean) => {
    setActiveFilters(prev => 
        checked ? [...prev, status] : prev.filter(s => s !== status)
    );
  };


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
    );
  }

  if (pgs.length === 0) {
    return (
      <>
        <Access feature="properties" action="add">
          <AddPgSheet
            open={isAddPgSheetOpen}
            onOpenChange={handleSheetOpenChange}
            onPgAdded={(pgId) => { router.push(`/dashboard/pg-management/${pgId}?setup=true`); }}
          />
        </Access>
        <div className="flex flex-col items-center justify-center h-full min-h-[calc(100vh-250px)] text-center p-8 bg-card border rounded-lg">
          <Building className="mx-auto h-16 w-16 text-muted-foreground" />
          <h2 className="mt-6 text-2xl font-semibold">Welcome to Your Dashboard!</h2>
          <p className="mt-2 text-muted-foreground max-w-md">
            You haven't added any properties yet. Get started by adding your first one.
          </p>
          <Access feature="properties" action="add">
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
          </Access>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        <StatsCards stats={stats} />
        
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
             <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
                <span className="font-semibold text-sm">Legend:</span>
                {Object.values(bedLegend).map(item => (
                  <div key={item.label} className="flex items-center gap-1.5">
                    <div className={cn("w-3 h-3 rounded-full", item.className)}></div>
                    <span>{item.label}</span>
                  </div>
                ))}
            </div>
            <div className="flex items-center space-x-2 self-end sm:self-center">
                <Label htmlFor="edit-mode" className="font-medium">Edit Mode</Label>
                <Access feature="properties" action="edit">
                <Switch id="edit-mode" checked={isEditMode} onCheckedChange={setIsEditMode} data-tour="edit-mode-switch" />
                </Access>
            </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
             <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Search by guest, room, or bed..."
                    className="pl-8 sm:w-full"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full sm:w-auto justify-start">
                        <Filter className="mr-2 h-4 w-4" />
                        Filter Beds {activeFilters.length > 0 && `(${activeFilters.length})`}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64">
                    <div className="grid gap-4">
                        <div className="space-y-2">
                            <h4 className="font-medium leading-none">Filter by Status</h4>
                            <p className="text-sm text-muted-foreground">Show beds with selected statuses.</p>
                        </div>
                        <div className="grid gap-2">
                            {Object.entries(bedLegend).map(([status, { label }]) => (
                                <div key={status} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`filter-${status}`}
                                        checked={activeFilters.includes(status as BedStatus)}
                                        onCheckedChange={(checked) => handleFilterChange(status as BedStatus, !!checked)}
                                    />
                                    <Label htmlFor={`filter-${status}`} className="font-normal">{label}</Label>
                                </div>
                            ))}
                        </div>
                         <Button variant="ghost" size="sm" onClick={() => setActiveFilters([])} className="w-full">Clear Filters</Button>
                    </div>
                </PopoverContent>
            </Popover>
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
         {pgsToDisplay.length === 0 && (
            <Card>
                <CardContent className="p-10 text-center text-muted-foreground">
                    No results found for your search or filter criteria.
                </CardContent>
            </Card>
        )}
      </div>

      {/* DIALOGS */}
      <Access feature="guests" action="add">
        <AddGuestDialog isAddGuestDialogOpen={isAddGuestDialogOpen} setIsAddGuestDialogOpen={setIsAddGuestDialogOpen} {...dashboardActions} />
      </Access>
      <Access feature="guests" action="edit">
        <EditGuestDialog isEditGuestDialogOpen={isEditGuestDialogOpen} setIsEditGuestDialogOpen={setIsEditGuestDialogOpen} {...dashboardActions} />
      </Access>
      <Access feature="properties" action="edit">
        <RoomDialog isRoomDialogOpen={isRoomDialogOpen} setIsRoomDialogOpen={setIsRoomDialogOpen} roomToEdit={roomToEdit} roomForm={roomForm} handleRoomSubmit={handleRoomSubmit} isSavingRoom={isSavingRoom} />
        <FloorDialog isFloorDialogOpen={isFloorDialogOpen} setIsFloorDialogOpen={setIsFloorDialogOpen} floorToEdit={floorToEdit} floorForm={floorForm} handleFloorSubmit={handleFloorSubmit} />
        <BedDialog isBedDialogOpen={isBedDialogOpen} setIsBedDialogOpen={setIsBedDialogOpen} bedToEdit={bedToEdit} bedForm={bedForm} handleBedSubmit={handleBedSubmit} />
      </Access>
      <Access feature="finances" action="add">
        <PaymentDialog isPaymentDialogOpen={isPaymentDialogOpen} setIsPaymentDialogOpen={setIsPaymentDialogOpen} {...dashboardActions} />
        <SharedChargeDialog isSharedChargeDialogOpen={isSharedChargeDialogOpen} setIsSharedChargeDialogOpen={setIsSharedChargeDialogOpen} {...dashboardActions} />
      </Access>
      <Access feature="complaints" action="edit">
        <ReminderDialog isReminderDialogOpen={isReminderDialogOpen} setIsReminderDialogOpen={setIsReminderDialogOpen} {...dashboardActions} />
      </Access>

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
            <Access feature="properties" action="delete">
              <AlertDialogAction
                className="bg-destructive hover:bg-destructive/90"
                onClick={handleDeleteConfirm}
              >
                Continue
              </AlertDialogAction>
            </Access>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!guestToInitiateExit} onOpenChange={() => setGuestToInitiateExit(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Initiate Exit Process</AlertDialogTitle>
            <AlertDialogDescription>
              This will place {guestToInitiateExit?.name} on their notice period of {guestToInitiateExit?.noticePeriodDays} days. The bed will remain occupied until their exit date. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Access feature="guests" action="edit">
              <AlertDialogAction
                onClick={handleConfirmInitiateExit}
              >
                Confirm Exit
              </AlertDialogAction>
            </Access>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!guestToExitImmediately} onOpenChange={() => setGuestToExitImmediately(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Exit Guest Immediately?</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately vacate {guestToExitImmediately?.name} from their bed, bypassing the notice period. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Access feature="guests" action="delete">
              <AlertDialogAction
                className="bg-destructive hover:bg-destructive/90"
                onClick={handleConfirmImmediateExit}
              >
                Exit Immediately
              </AlertDialogAction>
            </Access>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
