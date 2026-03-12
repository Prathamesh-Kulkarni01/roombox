'use client'

import { useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAppSelector } from '@/lib/hooks'
import { usePermissionsStore } from '@/lib/stores/configStores'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import RoomDialog from '@/components/dashboard/dialogs/RoomDialog'
import AddGuestDialog from '@/components/dashboard/dialogs/AddGuestDialog'
import PaymentDialog from '@/components/dashboard/dialogs/PaymentDialog'
import EditGuestDialog from '@/components/dashboard/dialogs/EditGuestDialog'
import ReminderDialog from '@/components/dashboard/dialogs/ReminderDialog'
import BulkAddDialog from '@/components/dashboard/dialogs/BulkAddDialog'
import TransferGuestDialog from '@/components/dashboard/dialogs/TransferGuestDialog'
import BedActionSheet from '@/components/dashboard/BedActionSheet'
import QuickAddSheet from '@/components/dashboard/QuickAddSheet'
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { cn } from '@/lib/utils'
import { useGetGuestsQuery } from '@/lib/api/apiSlice'
import type { Guest } from '@/lib/types'
import { Building, BedDouble, PlusCircle, Trash2, Pencil, Plus, CheckCircle, UserPlus, Search, List, Grid, Filter, MoreHorizontal } from 'lucide-react'
import { useDashboard } from '@/hooks/use-dashboard'
import { canAccess } from '@/lib/permissions'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import Access from '@/components/ui/PermissionWrapper'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'

// Constant for bed status colors and labels
const STATUS_STYLES = {
  EMPTY: {
    bg: "bg-muted/30 backdrop-blur-sm",
    border: "border-muted/50",
    text: "text-muted-foreground",
    icon: "text-muted-foreground/60",
    badge: "bg-muted/80 text-muted-foreground"
  },
  DUE: {
    bg: "bg-rose-500/10 dark:bg-rose-950/40 backdrop-blur-sm",
    border: "border-rose-500/50 shadow-[0_0_20px_-10px_theme(colors.rose.500)]",
    text: "text-rose-700 dark:text-rose-200",
    icon: "text-rose-500",
    badge: "bg-rose-600 text-white shadow-lg shadow-rose-900/40"
  },
  PARTIAL: {
    bg: "bg-amber-500/10 dark:bg-amber-950/40 backdrop-blur-sm",
    border: "border-amber-500/50 shadow-[0_0_20px_-10px_theme(colors.amber.500)]",
    text: "text-amber-700 dark:text-amber-200",
    icon: "text-amber-500",
    badge: "bg-amber-600 text-white"
  },
  PAID: {
    bg: "bg-emerald-500/10 dark:bg-emerald-950/40 backdrop-blur-sm",
    border: "border-emerald-500/50 shadow-[0_0_20px_-10px_theme(colors.emerald.500)]",
    text: "text-emerald-700 dark:text-emerald-200",
    icon: "text-emerald-500",
    badge: "bg-emerald-600 text-white"
  },
  NOTICE: {
    bg: "bg-indigo-500/10 dark:bg-indigo-950/40 backdrop-blur-sm",
    border: "border-indigo-500/50 shadow-[0_0_20px_-10px_theme(colors.indigo.500)]",
    text: "text-indigo-700 dark:text-indigo-200",
    icon: "text-indigo-500",
    badge: "bg-indigo-600 text-white"
  }
};

export default function RoomManagementPage() {
  const router = useRouter()
  const params = useParams()
  const { pgs } = useAppSelector(state => state.pgs)
  const { currentUser, currentPlan } = useAppSelector(state => state.user)
  const { featurePermissions } = usePermissionsStore()
  const pgId = params.pgId as string
  const { toast } = useToast()

  const { data: guestsData } = useGetGuestsQuery({ pgId }, { skip: !currentUser })
  const guests = guestsData?.guests || []

  const [isEditMode, setIsEditMode] = useState(false)
  const [activeTab, setActiveTab] = useState('all')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'available' | 'due' | 'paid'>('all')

  // Bottom sheet state
  const [bedSheetGuestId, setBedSheetGuestId] = useState<string | null>(null)
  const bedSheetGuest = useMemo(() => {
    if (!bedSheetGuestId) return null
    return guests.find(g => g.id === bedSheetGuestId) || null
  }, [bedSheetGuestId, guests])

  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false)

  const {
    isRoomDialogOpen, setIsRoomDialogOpen, roomToEdit,
    isFloorDialogOpen, setIsFloorDialogOpen, floorToEdit,
    isBedDialogOpen, setIsBedDialogOpen, bedToEdit,
    isAddGuestDialogOpen, setIsAddGuestDialogOpen, selectedBedForGuestAdd, addGuestForm, handleAddGuestSubmit,
    isPaymentDialogOpen, setIsPaymentDialogOpen, selectedGuestForPayment, paymentForm, handlePaymentSubmit,
    isEditGuestDialogOpen, setIsEditGuestDialogOpen, guestToEdit, editGuestForm, handleEditGuestSubmit,
    guestToInitiateExit, setGuestToInitiateExit, handleConfirmInitiateExit,
    guestToExitImmediately, setGuestToExitImmediately, handleConfirmImmediateExit,
    isReminderDialogOpen, setIsReminderDialogOpen, selectedGuestForReminder, isGeneratingReminder, reminderMessage, setReminderMessage,
    handleOpenEditGuestDialog, handleOpenReminderDialog,
    roomForm, floorForm, bedForm,
    handleRoomSubmit, handleFloorSubmit, handleBedSubmit,
    handleRoomSubmit: wrappedHandleRoomSubmit,
    handleOpenRoomDialog, handleOpenFloorDialog, handleOpenBedDialog,
    handleOpenAddGuestDialog, handleOpenPaymentDialog,
    handleOpenBulkAddDialog,
    handleDelete,
    isUpdatingProperty,
    isBulkAddDialogOpen, setIsBulkAddDialogOpen, bulkAddType,
    bulkRoomForm, bulkBedForm, handleBulkRoomSubmit, handleBulkBedSubmit,
    isLoadingGuests,
    isRecordingPayment,
    isSavingRoom,
    isAddingGuest,
    isUpdatingGuest,
    isTransferDialogOpen, setIsTransferDialogOpen,
    guestToTransfer, handleOpenTransferDialog,
    handleTransferGuestSubmit, isTransferringGuest,
  } = useDashboard()

  const pg = useMemo(() => pgs.find(p => p.id === pgId), [pgs, pgId])

  // Optimize guest access via a map
  const guestMap = useMemo(() => {
    const map: Record<string, Guest> = {}
    guests.forEach(g => {
      if (!g.isVacated && g.bedId) {
        map[g.bedId] = g
      }
    })
    return map
  }, [guests])

  // Map for dues calculation
  const duesMap = useMemo(() => {
    const map: Record<string, number> = {}
    guests.forEach(g => {
      if (!g.isVacated) {
        const totalDue = (g.ledger || []).reduce((acc, entry) =>
          acc + (entry.type === 'debit' ? entry.amount : -entry.amount), 0
        )
        map[g.id] = totalDue
      }
    })
    return map
  }, [guests])

  const canAdd = canAccess(featurePermissions, currentUser?.role, 'properties', 'add')
  const canEdit = canAccess(featurePermissions, currentUser?.role, 'properties', 'edit')
  const canDelete = canAccess(featurePermissions, currentUser?.role, 'properties', 'delete')
  const canEditProperty = canEdit

  const permissions = useMemo(() => {
    if (!featurePermissions || !currentUser) return null
    return featurePermissions.properties
  }, [featurePermissions, currentUser])

  const canAddFloor = useMemo(() => {
    if (!pg || !permissions?.add) return false
    return true
  }, [pg, permissions])

  if (!pg) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <Building className="mx-auto h-16 w-16 text-muted-foreground" />
        <h2 className="mt-6 text-2xl font-semibold">Property Not Found</h2>
        <p className="mt-2 text-muted-foreground max-w-md">The property you are looking for does not exist or has been removed.</p>
        <Button asChild className="mt-6">
          <Link href="/dashboard">Go Back to Dashboard</Link>
        </Button>
      </div>
    )
  }

  const openAddFloor = () => {
    if (!canAddFloor) {
      toast({ variant: 'destructive', title: 'Permission Denied', description: 'You do not have permission to add new floors.' })
      return
    }
    handleOpenFloorDialog(null, pg)
  }

  const getBedStatusBadge = (bed: any) => {
    const guest = guestMap[bed.id]

    // If we have a bed.guestId but no guest data yet, show loading OR assume occupied
    if (bed.guestId && !guest && isLoadingGuests) return <Badge variant="outline" className="text-[10px] animate-pulse">LOADING...</Badge>

    if (!guest) return <Badge variant="outline" className="text-secondary bg-secondary/10 border-transparent text-[10px]">EMPTY</Badge>
    if (guest.exitDate) return <Badge variant="outline" className="text-blue-500 bg-blue-500/10 border-transparent text-[10px]">NOTICE</Badge>
    if (guest.rentStatus === 'unpaid') return <Badge variant="outline" className="text-red-500 bg-red-500/10 border-transparent text-[10px]">DUE</Badge>
    if (guest.rentStatus === 'partial') return <Badge variant="outline" className="text-orange-500 bg-orange-500/10 border-transparent text-[10px]">PARTIAL</Badge>
    return <Badge variant="outline" className="text-green-500 bg-green-500/10 border-transparent text-[10px]">PAID</Badge>
  }

  const floorsToRender = activeTab === 'all' ? pg.floors : pg.floors?.filter(f => f.id === activeTab)
  const currentFloor = floorsToRender?.[0]

  return (
    <div className="flex flex-col md:max-w-2xl mx-auto md:mx-0 w-full h-[calc(100vh-120px)] md:h-[calc(100vh-80px)] pb-16 md:pb-0">

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col h-full">
        {/* Header Wrap (Not sticky anymore, just flex items at the top) */}
        <div className="flex-none pb-2 pt-2 -mx-4 px-4 sm:mx-0 sm:px-0">
          {/* Floor tabs */}
          <ScrollArea className="w-full border-b mb-4">
            <div className="flex items-center">
              <TabsList className="bg-transparent h-10 p-0 justify-start w-max">
                <TabsTrigger value="all" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent pb-2 pt-2 px-4 shadow-none bg-transparent hover:text-primary transition-colors text-base font-semibold text-muted-foreground border-b-2 border-transparent">All Floors</TabsTrigger>
                {pg.floors?.map(floor => (
                  <TabsTrigger key={floor.id} value={floor.id} className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent pb-2 pt-2 px-4 shadow-none bg-transparent hover:text-primary transition-colors text-base font-semibold text-muted-foreground border-b-2 border-transparent">{floor.name}</TabsTrigger>
                ))}
                <button
                  onClick={openAddFloor}
                  className="rounded-none pb-2 pt-2 px-4 text-base font-semibold text-primary hover:bg-primary/5 transition-colors border-b-2 border-transparent flex items-center gap-1.5 shrink-0"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden xs:inline">Add Floor</span>
                </button>
              </TabsList>
            </div>
          </ScrollArea>

          {/* Toolbar */}
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search rooms or guests..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8 bg-muted/40 border-none rounded-xl" />
            </div>

            {/* View mode toggle */}
            <div className="bg-muted p-1 rounded-xl flex items-center shrink-0">
              <Button variant="ghost" size="sm" onClick={() => setViewMode('list')} className={cn("px-2 rounded-lg h-8 transition-all", viewMode === 'list' ? 'bg-background shadow-sm' : 'text-muted-foreground')}>
                <List className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setViewMode('grid')} className={cn("px-2 rounded-lg h-8 transition-all", viewMode === 'grid' ? 'bg-background shadow-sm' : 'text-muted-foreground')}>
                <Grid className="w-4 h-4" />
              </Button>
            </div>

            {/* Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant={filterStatus !== 'all' ? 'default' : 'outline'} size="icon" className="rounded-xl border-dashed h-10 w-10 shrink-0">
                  <Filter className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setFilterStatus('all')} className={filterStatus === 'all' ? 'bg-primary/10 text-primary' : ''}>All Beds</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setFilterStatus('available')} className={filterStatus === 'available' ? 'bg-primary/10 text-primary' : ''}>🟡 Available / Empty</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterStatus('due')} className={filterStatus === 'due' ? 'bg-primary/10 text-primary' : ''}>🔴 Rent Due</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterStatus('paid')} className={filterStatus === 'paid' ? 'bg-primary/10 text-primary' : ''}>🟢 Rent Paid</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Edit mode toggle */}
            {canEditProperty && (
              <Button
                variant={isEditMode ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setIsEditMode(!isEditMode)}
                className={cn("rounded-xl h-10 w-10 shrink-0 transition-colors", isEditMode ? "bg-secondary text-secondary-foreground" : "bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20")}
              >
                {isEditMode ? <CheckCircle className="w-5 h-5" /> : <Pencil className="w-5 h-5" />}
              </Button>
            )}
          </div>
        </div>

        {/* No floors empty state */}
        {(!pg.floors || pg.floors.length === 0) && (
          <div className="flex flex-col items-center justify-center p-10 bg-muted/20 border-2 border-dashed rounded-3xl text-center space-y-5 mt-4 flex-none">
            <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center">
              <Building className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">No Floors Yet</h2>
              <p className="text-muted-foreground max-w-sm mx-auto">
                Tap the button below to add your first floor, then add rooms and assign guests.
              </p>
            </div>
            <Button onClick={openAddFloor} size="lg" className="rounded-2xl px-8 font-bold shadow-lg shadow-primary/20">
              <Plus className="mr-2 h-5 w-5" /> Add First Floor
            </Button>
          </div>
        )}

        {/* Scrollable Floors content */}
        <div className="flex-1 overflow-y-auto pb-32 pr-2 -mx-2 px-2 scrollbar-thin">
          {floorsToRender?.map(floor => (
            <div key={floor.id} className="space-y-5 mb-8">
              {/* Floor header with actions */}
              <div className="flex items-center justify-between">
                {activeTab === 'all' && (
                  <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">{floor.name}</h3>
                )}
                {isEditMode && (
                  <div className="flex items-center gap-2 ml-auto">
                    {canEdit && (
                      <Button variant="ghost" size="sm" onClick={() => handleOpenFloorDialog(floor as any, pg)} className="h-8 rounded-full px-3 text-xs font-semibold text-muted-foreground">
                        <Pencil className="w-3 h-3 mr-1.5" /> Rename
                      </Button>
                    )}
                    {canDelete && (
                      <Button variant="ghost" size="sm" onClick={() => handleDelete('floor', { floorId: floor.id, pgId: pg.id })} className="h-8 rounded-full px-3 text-xs font-semibold text-red-500 hover:bg-red-500/10">
                        <Trash2 className="w-3 h-3 mr-1.5" /> Delete Floor
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {floor.rooms.length === 0 ? (
                <div className="text-center py-10 bg-muted/20 rounded-2xl border-2 border-dashed">
                  <p className="text-muted-foreground font-medium mb-4">No rooms on this floor yet.</p>
                  {canAdd && (
                    <Button onClick={() => handleOpenRoomDialog(null, floor.id, pg.id)} size="sm" className="rounded-xl">
                      <PlusCircle className="mr-2 h-4 w-4" /> Add Room
                    </Button>
                  )}
                </div>
              ) : null}

              {floor.rooms.filter(room => {
                let roomMatches = true
                if (searchQuery) {
                  const lowerQuery = searchQuery.toLowerCase();
                  if (room.name.toLowerCase().includes(lowerQuery)) {
                    // matches
                  } else {
                    const hasGuest = room.beds.some(b => {
                      const g = guestMap[b.id]
                      return g && g.name.toLowerCase().includes(lowerQuery)
                    })
                    if (!hasGuest) roomMatches = false
                  }
                }
                if (roomMatches && filterStatus !== 'all') {
                  const hasMatchingBed = room.beds.some(b => {
                    const g = guestMap[b.id]
                    if (filterStatus === 'available' && !g) return true
                    if (filterStatus === 'due' && g && (g.rentStatus === 'unpaid' || g.rentStatus === 'partial')) return true
                    if (filterStatus === 'paid' && g && g.rentStatus !== 'unpaid' && g.rentStatus !== 'partial') return true
                    return false
                  })
                  if (!hasMatchingBed) roomMatches = false
                }
                return roomMatches
              }).map(room => {
                const occupiedBedsCount = room.beds.filter(b => !!guestMap[b.id] || (b.guestId && isLoadingGuests)).length
                const emptyBeds = room.beds.length - occupiedBedsCount
                const isRoomEmpty = emptyBeds === room.beds.length && room.beds.length > 0
                const forceDetailedView = filterStatus !== 'all' || searchQuery

                return (
                  <div key={room.id} className="space-y-3">
                    {/* Room header */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-base">{room.name}</h4>
                        <p className="text-xs text-muted-foreground">{room.beds.length}-Sharing • {room.amenities?.includes('ac') ? '❄️ AC' : 'Non-AC'}</p>
                      </div>
                      {isEditMode && (
                        <div className="flex items-center gap-1">
                          {canEdit && <Button variant="secondary" size="sm" onClick={() => handleOpenRoomDialog(room)} className="h-8 rounded-full px-3 text-xs font-semibold"><Pencil className="w-3 h-3 mr-1" /> Edit</Button>}
                          {canAdd && <Button variant="secondary" size="sm" onClick={() => handleOpenBedDialog(null, room.id, floor.id)} className="h-8 rounded-full px-3 text-xs font-semibold"><Plus className="w-3 h-3 mr-1" /> Bed</Button>}
                          {canAdd && <Button variant="secondary" size="sm" onClick={() => handleOpenBulkAddDialog('beds', floor.id, room.id)} className="h-8 rounded-full px-3 text-xs font-semibold">Bulk</Button>}
                          {canDelete && <Button variant="ghost" size="sm" onClick={() => handleDelete('room', { floorId: floor.id, roomId: room.id, pgId: pg.id })} className="h-8 rounded-full px-2 text-red-500 hover:bg-red-500/10"><Trash2 className="w-3.5 h-3.5" /></Button>}
                        </div>
                      )}
                    </div>

                    {viewMode === 'list' ? (
                      /* LIST VIEW */
                      <Card className="border-border/40 shadow-sm rounded-2xl overflow-hidden">
                        <ul className="divide-y divide-border/20">
                          {room.beds.filter(b => {
                            const g = guestMap[b.id]
                            if (searchQuery && g && !g.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
                            if (searchQuery && !g) return false
                            if (filterStatus !== 'all') {
                              if (filterStatus === 'available' && g) return false
                              if (filterStatus === 'due' && (!g || (g.rentStatus !== 'unpaid' && g.rentStatus !== 'partial'))) return false
                              if (filterStatus === 'paid' && (!g || (g.rentStatus === 'unpaid' || g.rentStatus === 'partial'))) return false
                            }
                            return true
                          }).map(bed => {
                            const guest = guestMap[bed.id]
                            const isInitiallyOccupied = bed.guestId && !guest && isLoadingGuests
                            const totalDue = guest ? (duesMap[guest.id] || 0) : 0

                            let status: keyof typeof STATUS_STYLES = 'EMPTY';
                            if (guest) {
                              if (guest.exitDate) status = 'NOTICE';
                              else if (guest.rentStatus === 'unpaid') status = 'DUE';
                              else if (guest.rentStatus === 'partial') status = 'PARTIAL';
                              else status = 'PAID';
                            }
                            const style = STATUS_STYLES[status];

                            return (
                              <li
                                key={bed.id}
                                className={cn(
                                  "flex items-center justify-between p-4 transition-all duration-200",
                                  !isEditMode && !isInitiallyOccupied ? "active:bg-muted/30 cursor-pointer hover:bg-muted/10 group" : ""
                                )}
                                onClick={!isEditMode && !isInitiallyOccupied ? (() => guest ? setBedSheetGuestId(guest.id) : handleOpenAddGuestDialog(bed, room, pg)) : undefined}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={cn(
                                    "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border transition-all shadow-sm",
                                    style.bg, style.border, style.icon
                                  )}>
                                    <BedDouble className="w-5 h-5" />
                                  </div>
                                  <div className="min-w-0">
                                    {guest ? (
                                      <>
                                        <div className="flex items-baseline gap-2">
                                          <p className={cn("font-bold text-sm leading-tight", style.text)}>{guest.name}</p>
                                          {totalDue > 0 && <span className="text-[10px] font-bold text-red-500">₹{Math.round(totalDue)} Due</span>}
                                        </div>
                                        <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">Bed {bed.name} {guest.exitDate ? '• 🗓️ On notice' : ''}</p>
                                      </>
                                    ) : isInitiallyOccupied ? (
                                      <div className="space-y-1.5 w-24">
                                        <Skeleton className="h-4 w-full rounded" />
                                        <Skeleton className="h-3 w-16 rounded" />
                                      </div>
                                    ) : (
                                      <>
                                        <p className="font-semibold text-sm text-secondary-foreground/60">Empty Bed</p>
                                        <p className="text-[10px] text-muted-foreground font-medium">Bed {bed.name}</p>
                                      </>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  {!isEditMode && getBedStatusBadge(bed)}

                                  {/* Edit mode controls */}
                                  {isEditMode && (
                                    <div className="flex gap-1">
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => handleOpenBedDialog(bed, room.id, floor.id)}><Pencil className="w-4 h-4" /></Button>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-500/10" onClick={() => handleDelete('bed', { floorId: floor.id, roomId: room.id, bedId: bed.id, pgId: pg.id })}><Trash2 className="w-4 h-4" /></Button>
                                    </div>
                                  )}
                                  {/* Tap arrow hint for occupied, non-edit */}
                                  {guest && !isEditMode && (
                                    <MoreHorizontal className="w-4 h-4 text-muted-foreground/40" />
                                  )}
                                </div>
                              </li>
                            )
                          })}
                          {room.beds.length === 0 && (
                            <li className="p-6 text-center text-sm text-muted-foreground">
                              No beds added yet.
                              {isEditMode && canAdd && (
                                <button onClick={() => handleOpenBedDialog(null, room.id, floor.id)} className="ml-2 text-primary font-semibold underline">Add bed</button>
                              )}
                            </li>
                          )}
                        </ul>
                      </Card>
                    ) : (
                      /* GRID VIEW */
                      <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
                        {room.beds.filter(b => {
                          const g = guestMap[b.id]
                          if (searchQuery && g && !g.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
                          if (searchQuery && !g) return false
                          if (filterStatus !== 'all') {
                            if (filterStatus === 'available' && g) return false
                            if (filterStatus === 'due' && (!g || (g.rentStatus !== 'unpaid' && g.rentStatus !== 'partial'))) return false
                            if (filterStatus === 'paid' && (!g || (g.rentStatus === 'unpaid' || g.rentStatus === 'partial'))) return false
                          }
                          return true
                        }).map(bed => {
                          const guest = guestMap[bed.id]
                          const isInitiallyOccupied = bed.guestId && !guest && isLoadingGuests
                          const totalDue = guest ? (duesMap[guest.id] || 0) : 0

                          let status: keyof typeof STATUS_STYLES = 'EMPTY';
                          if (guest) {
                            if (guest.exitDate) status = 'NOTICE';
                            else if (guest.rentStatus === 'unpaid') status = 'DUE';
                            else if (guest.rentStatus === 'partial') status = 'PARTIAL';
                            else status = 'PAID';
                          }
                          const style = STATUS_STYLES[status];

                          return (
                            <Card
                              key={bed.id}
                              onClick={!isEditMode && !isInitiallyOccupied ? (() => guest ? setBedSheetGuestId(guest.id) : handleOpenAddGuestDialog(bed, room, pg)) : undefined}
                              className={cn(
                                "p-3 border shadow-sm rounded-2xl flex flex-col justify-between transition-all group",
                                !isEditMode && !isInitiallyOccupied ? "active:scale-[0.97] cursor-pointer hover:shadow-md hover:border-primary/40" : "hover:border-primary/20",
                                style.bg, style.border
                              )}
                            >
                              <div className="flex items-start justify-between mb-3">
                                {guest ? (
                                  <Avatar className="h-10 w-10 border-2 border-white dark:border-slate-800 shadow-sm">
                                    <AvatarFallback className={cn("font-bold text-sm", style.bg, style.text)}>
                                      {guest.name.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                ) : isInitiallyOccupied ? (
                                  <Skeleton className="h-10 w-10 rounded-full" />
                                ) : (
                                  <div className="w-10 h-10 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center">
                                    <BedDouble className="w-5 h-5 opacity-40" />
                                  </div>
                                )}
                                {!isEditMode && getBedStatusBadge(bed)}
                                {isEditMode && (
                                  <div className="flex gap-0.5">
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => handleOpenBedDialog(bed, room.id, floor.id)}><Pencil className="w-3 h-3" /></Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-500/10" onClick={() => handleDelete('bed', { floorId: floor.id, roomId: room.id, bedId: bed.id, pgId: pg.id })}><Trash2 className="w-3 h-3" /></Button>
                                  </div>
                                )}
                              </div>
                              <div className="min-h-[46px]">
                                <p className="text-[10px] font-bold text-muted-foreground/60 mb-0.5 uppercase tracking-tight">Bed {bed.name}</p>
                                {guest ? (
                                  <>
                                    <p className={cn("font-bold text-sm leading-tight line-clamp-1", style.text)} title={guest.name}>{guest.name}</p>
                                    {totalDue > 0 && <p className="text-[10px] font-bold text-red-600 mt-1">₹{Math.round(totalDue)} Due</p>}
                                  </>
                                ) : isInitiallyOccupied ? (
                                  <div className="space-y-1.5 mt-1">
                                    <Skeleton className="h-3 w-16 rounded" />
                                    <Skeleton className="h-2 w-10 rounded" />
                                  </div>
                                ) : (
                                  <p className="font-bold text-sm text-secondary-foreground/40 italic">Empty</p>
                                )}
                              </div>

                            </Card>
                          )
                        })}
                      </div>
                    )}

                    {/* Add room button in edit mode */}
                    {isEditMode && canAdd && (
                      <button
                        className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl border-2 border-dashed border-muted-foreground/20 text-muted-foreground text-sm font-semibold hover:border-muted-foreground/40 hover:text-foreground transition-colors"
                        onClick={() => handleOpenRoomDialog(null, floor.id, pg.id)}
                      >
                        <PlusCircle className="w-4 h-4" /> Add Room to {floor.name}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </Tabs>

      {/* FAB - Floating Action Button (mobile only, bottom right) */}
      {canAdd && (
        <button
          onClick={() => setIsQuickAddOpen(true)}
          className="md:hidden fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/30 flex items-center justify-center active:scale-90 transition-transform"
          aria-label="Quick Add"
        >
          <Plus className="w-7 h-7" />
        </button>
      )}

      {/* Bed Action Sheet (replaces popover) */}
      <BedActionSheet
        guest={bedSheetGuest}
        isOpen={!!bedSheetGuestId}
        onClose={() => setBedSheetGuestId(null)}
        handleOpenPaymentDialog={handleOpenPaymentDialog}
        handleOpenReminderDialog={handleOpenReminderDialog}
        handleOpenEditGuestDialog={handleOpenEditGuestDialog}
        handleOpenTransferDialog={handleOpenTransferDialog}
        setGuestToInitiateExit={setGuestToInitiateExit}
        setGuestToExitImmediately={setGuestToExitImmediately}
      />

      <TransferGuestDialog
        isOpen={isTransferDialogOpen}
        onOpenChange={setIsTransferDialogOpen}
        guest={guestToTransfer}
        isTransferring={isTransferringGuest}
        onTransfer={handleTransferGuestSubmit}
      />

      <QuickAddSheet
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        canAddFloor={true} // Enable as requested: "should be enabled"
        canAdd={!!canAdd}
        onAddFloor={openAddFloor}
        onAddRoom={() => handleOpenRoomDialog(null, activeTab !== 'all' ? activeTab : (pg.floors?.[0]?.id || ''), pg.id)}
        onBulkRooms={() => handleOpenBulkAddDialog('rooms', activeTab !== 'all' ? activeTab : (pg.floors?.[0]?.id || ''))}
        onAddGuest={() => setIsAddGuestDialogOpen(true)}
        floorName={activeTab !== 'all' ? pg.floors?.find(f => f.id === activeTab)?.name : undefined}
      />

      {/* DIALOGS */}
      <Access feature="properties" action="edit">
        <RoomDialog
          isRoomDialogOpen={isRoomDialogOpen}
          setIsRoomDialogOpen={setIsRoomDialogOpen}
          roomToEdit={roomToEdit}
          roomForm={roomForm}
          handleRoomSubmit={handleRoomSubmit}
          isSavingRoom={isSavingRoom}
          pg={pg}
          onOpenFloorDialog={() => handleOpenFloorDialog(null, pg)}
        />
        <Dialog open={isFloorDialogOpen} onOpenChange={setIsFloorDialogOpen}>
          <DialogContent><DialogHeader><DialogTitle>{floorToEdit ? 'Edit Floor' : 'Add New Floor'}</DialogTitle></DialogHeader>
            <Form {...floorForm}>
              <form onSubmit={floorForm.handleSubmit(handleFloorSubmit)} id="floor-form" className="space-y-4">
                <FormField control={floorForm.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Floor Name</FormLabel><FormControl><Input placeholder="e.g., Ground Floor" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </form>
            </Form>
            <DialogFooter><DialogClose asChild><Button variant="secondary">Cancel</Button></DialogClose><Button type="submit" form="floor-form" disabled={!canAdd && !canEdit}>{floorToEdit ? 'Save Changes' : 'Add Floor'}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={isBedDialogOpen} onOpenChange={setIsBedDialogOpen}>
          <DialogContent><DialogHeader><DialogTitle>{bedToEdit ? 'Edit Bed' : 'Add New Bed'}</DialogTitle></DialogHeader>
            <Form {...bedForm}>
              <form onSubmit={bedForm.handleSubmit(handleBedSubmit)} id="bed-form" className="space-y-4">
                <FormField control={bedForm.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Bed Name / Number</FormLabel><FormControl><Input placeholder="e.g., A, B, 1, 2..." {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </form>
            </Form>
            <DialogFooter><DialogClose asChild><Button variant="secondary">Cancel</Button></DialogClose><Button type="submit" form="bed-form" disabled={!canAdd && !canEdit}>{bedToEdit ? 'Save Changes' : 'Add Bed'}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </Access>

      <Access feature="guests" action="add">
        <AddGuestDialog
          isAddGuestDialogOpen={isAddGuestDialogOpen}
          setIsAddGuestDialogOpen={setIsAddGuestDialogOpen}
          selectedBedForGuestAdd={selectedBedForGuestAdd}
          addGuestForm={addGuestForm}
          handleAddGuestSubmit={handleAddGuestSubmit}
          isAddingGuest={isAddingGuest}
        />
      </Access>

      <Access feature="guests" action="edit">
        <EditGuestDialog
          isEditGuestDialogOpen={isEditGuestDialogOpen}
          setIsEditGuestDialogOpen={setIsEditGuestDialogOpen}
          guestToEdit={guestToEdit}
          editGuestForm={editGuestForm}
          handleEditGuestSubmit={handleEditGuestSubmit}
          isUpdatingGuest={isUpdatingGuest}
        />
      </Access>

      <Access feature="finances" action="add">
        <PaymentDialog
          isPaymentDialogOpen={isPaymentDialogOpen}
          setIsPaymentDialogOpen={setIsPaymentDialogOpen}
          selectedGuestForPayment={selectedGuestForPayment}
          paymentForm={paymentForm}
          handlePaymentSubmit={handlePaymentSubmit}
          isRecordingPayment={isRecordingPayment}
        />
      </Access>

      <Access feature="complaints" action="edit">
        <ReminderDialog
          isReminderDialogOpen={isReminderDialogOpen}
          setIsReminderDialogOpen={setIsReminderDialogOpen}
          selectedGuestForReminder={selectedGuestForReminder}
          isGeneratingReminder={isGeneratingReminder}
          reminderMessage={reminderMessage}
          setReminderMessage={setReminderMessage}
        />
      </Access>

      <AlertDialog open={!!guestToInitiateExit} onOpenChange={() => setGuestToInitiateExit(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Initiate Exit for {guestToInitiateExit?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This starts a {guestToInitiateExit?.noticePeriodDays}-day notice period. The bed stays occupied until their exit date.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Access feature="guests" action="edit">
              <AlertDialogAction onClick={handleConfirmInitiateExit}>Confirm Exit</AlertDialogAction>
            </Access>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!guestToExitImmediately} onOpenChange={() => setGuestToExitImmediately(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Exit {guestToExitImmediately?.name} Immediately?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  This will immediately vacate the bed without a notice period. This cannot be undone.
                </p>
                {guestToExitImmediately && (() => {
                  const depositAmount = guestToExitImmediately.depositAmount || 0;
                  const currentBalance = (guestToExitImmediately.ledger || []).reduce((acc, entry) =>
                    acc + (entry.type === 'debit' ? entry.amount : -entry.amount), 0
                  );
                  const finalSettlementAmount = depositAmount - currentBalance;

                  return (
                    <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-md border text-sm text-foreground">
                      <div className="flex justify-between py-1">
                        <span className="text-muted-foreground">Security Deposit:</span>
                        <span className="font-medium">₹{depositAmount.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-muted-foreground">Unpaid Balance (Dues):</span>
                        <span className="font-medium">₹{currentBalance.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="h-px bg-border my-2" />
                      <div className="flex justify-between py-1 font-semibold">
                        <span>Final Settlement:</span>
                        <span className={cn(finalSettlementAmount > 0 ? "text-green-600" : finalSettlementAmount < 0 ? "text-red-600" : "")}>
                          {finalSettlementAmount > 0
                            ? `Refund ₹${finalSettlementAmount.toLocaleString('en-IN')}`
                            : finalSettlementAmount < 0
                              ? `Owes ₹${Math.abs(finalSettlementAmount).toLocaleString('en-IN')}`
                              : `₹0`
                          }
                        </span>
                      </div>
                    </div>
                  );
                })()}

                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox
                    id="sendWhatsAppPg"
                    defaultChecked={true}
                    onCheckedChange={(checked) => {
                      if (typeof window !== "undefined") {
                        (window as any).__sendWhatsAppOnExit = checked;
                      }
                    }}
                  />
                  <Label htmlFor="sendWhatsAppPg" className="text-sm cursor-pointer">
                    Send Settlement details via WhatsApp
                  </Label>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Access feature="guests" action="delete">
              <AlertDialogAction
                className="bg-destructive hover:bg-destructive/90"
                onClick={() => {
                  const sendWA = typeof window !== 'undefined' ? ((window as any).__sendWhatsAppOnExit !== false) : true;
                  handleConfirmImmediateExit(sendWA);
                }}
              >
                Confirm Vacate
              </AlertDialogAction>
            </Access>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BulkAddDialog
        isOpen={isBulkAddDialogOpen}
        onOpenChange={setIsBulkAddDialogOpen}
        type={bulkAddType}
        pg={pg}
        bulkRoomForm={bulkRoomForm}
        bulkBedForm={bulkBedForm}
        handleBulkRoomSubmit={handleBulkRoomSubmit}
        handleBulkBedSubmit={handleBulkBedSubmit}
      />
    </div>
  )
}
