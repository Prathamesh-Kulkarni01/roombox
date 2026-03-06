'use client'

import { useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAppSelector } from '@/lib/hooks'
import { usePermissionsStore } from '@/lib/stores/configStores'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import RoomDialog from '@/components/dashboard/dialogs/RoomDialog'
import AddGuestDialog from '@/components/dashboard/dialogs/AddGuestDialog'
import PaymentDialog from '@/components/dashboard/dialogs/PaymentDialog'
import EditGuestDialog from '@/components/dashboard/dialogs/EditGuestDialog'
import ReminderDialog from '@/components/dashboard/dialogs/ReminderDialog'
import { Popover, PopoverTrigger } from "@/components/ui/popover"
import GuestPopoverContent from "@/components/dashboard/GuestPopoverContent"
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog"
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"

import { Building, DoorOpen, BedDouble, PlusCircle, Trash2, ArrowLeft, Pencil, Plus, CheckCircle, Wallet, Clock, UserPlus, Search, List, Grid, Filter, MoreHorizontal } from 'lucide-react'
import { useDashboard } from '@/hooks/use-dashboard'
import { canAccess } from '@/lib/permissions'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import Access from '@/components/ui/PermissionWrapper';

export default function RoomManagementPage() {
  const router = useRouter()
  const params = useParams()
  const { pgs } = useAppSelector(state => state.pgs)
  const { guests } = useAppSelector(state => state.guests)
  const { currentUser, currentPlan } = useAppSelector(state => state.user)
  const { featurePermissions } = usePermissionsStore()
  const pgId = params.pgId as string
  const { toast } = useToast()

  const [isEditMode, setIsEditMode] = useState(false)
  const [activeTab, setActiveTab] = useState('all')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'available' | 'due' | 'paid'>('all')

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
    handleOpenRoomDialog, handleOpenFloorDialog, handleOpenBedDialog,
    handleOpenAddGuestDialog, handleOpenPaymentDialog,
    handleDelete,
    isSavingRoom
  } = useDashboard({ pgs, guests })

  const pg = useMemo(() => pgs.find(p => p.id === pgId), [pgs, pgId])
  const canAdd = canAccess(featurePermissions, currentUser?.role, 'properties', 'add')
  const canEdit = canAccess(featurePermissions, currentUser?.role, 'properties', 'edit')
  const canDelete = canAccess(featurePermissions, currentUser?.role, 'properties', 'delete')
  const canEditProperty = canEdit

  const permissions = useMemo(() => {
    if (!featurePermissions || !currentUser) return null;
    return featurePermissions.properties;
  }, [featurePermissions, currentUser])

  const canAddFloor = useMemo(() => {
    if (!pg || !currentPlan || !permissions?.add) return false;
    return currentPlan.floorLimit === 'unlimited' || (pg.floors?.length || 0) < currentPlan.floorLimit;
  }, [pg, currentPlan, permissions])

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
      toast({ variant: 'destructive', title: 'Floor Limit Reached', description: 'Please upgrade your plan to add more floors.' });
      return;
    }
    handleOpenFloorDialog(null, pg);
  }

  const getBedStatusBadge = (bed: any) => {
    const guest = guests.find(g => g.id === bed.guestId && !g.isVacated)
    if (!guest || guest.isVacated) return <Badge variant="outline" className="text-secondary bg-secondary/10 border-transparent">AVAILABLE</Badge>
    if (guest.exitDate) return <Badge variant="outline" className="text-blue-500 bg-blue-500/10 border-transparent">NOTICE</Badge>
    if (guest.rentStatus === 'unpaid' || guest.rentStatus === 'partial') return <Badge variant="outline" className="text-orange-500 bg-orange-500/10 border-transparent">DUE</Badge>
    return <Badge variant="outline" className="text-green-500 bg-green-500/10 border-transparent">PAID</Badge>
  }

  // Flatten floors for 'all' tab
  const floorsToRender = activeTab === 'all' ? pg.floors : pg.floors?.filter(f => f.id === activeTab)

  return (
    <div className="flex flex-col gap-6 md:max-w-2xl mx-auto md:mx-0 w-full pb-20 mt-4 md:mt-0">

      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="rounded-full w-10 h-10 bg-muted/50" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold tracking-tight">Room Management</h1>
        </div>

        {isEditMode ? (
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setIsEditMode(false)} className="rounded-full shadow-sm text-sm" size="sm">Done</Button>
          </div>
        ) : (
          canEditProperty && (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setIsEditMode(true)} className="rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors w-10 h-10 shadow-sm border border-primary/20">
                <Pencil className="w-5 h-5" />
              </Button>
              {canAdd && <Button variant="ghost" size="icon" onClick={openAddFloor} disabled={!canAddFloor} className="rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors w-10 h-10 shadow-sm border border-primary/20"><Plus className="w-5 h-5" /></Button>}
            </div>
          )
        )}
      </div>

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <ScrollArea className="w-full relative py-1 border-b mb-6">
          <TabsList className="bg-transparent h-10 p-0 justify-start w-max">
            <TabsTrigger value="all" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent pb-2 pt-2 px-4 shadow-none bg-transparent hover:text-primary transition-colors text-base font-semibold text-muted-foreground border-b-2 border-transparent">All Floors</TabsTrigger>
            {pg.floors?.map(floor => (
              <TabsTrigger key={floor.id} value={floor.id} className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent pb-2 pt-2 px-4 shadow-none bg-transparent hover:text-primary transition-colors text-base font-semibold text-muted-foreground border-b-2 border-transparent">{floor.name}</TabsTrigger>
            ))}
          </TabsList>
        </ScrollArea>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search rooms or guests..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8 bg-muted/30 border-none rounded-xl" />
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-muted p-1 rounded-xl flex items-center">
              <Button variant="ghost" size="sm" onClick={() => setViewMode('list')} className={cn("px-3 rounded-lg h-8 transition-all", viewMode === 'list' ? 'bg-background shadow-sm' : 'text-muted-foreground')}>
                <List className="w-4 h-4 mr-2" /> List
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setViewMode('grid')} className={cn("px-3 rounded-lg h-8 transition-all", viewMode === 'grid' ? 'bg-background shadow-sm' : 'text-muted-foreground')}>
                <Grid className="w-4 h-4 mr-2" /> Grid
              </Button>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant={filterStatus !== 'all' ? 'default' : 'outline'} size="icon" className="rounded-xl border-dashed h-10 w-10 shrink-0">
                  <Filter className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Filter Beds by Status</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setFilterStatus('all')} className={filterStatus === 'all' ? 'bg-primary/10 text-primary' : ''}>All Beds</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setFilterStatus('available')} className={filterStatus === 'available' ? 'bg-primary/10 text-primary' : ''}>Available / Empty</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterStatus('due')} className={filterStatus === 'due' ? 'bg-primary/10 text-primary' : ''}>Rent Due / Unpaid</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterStatus('paid')} className={filterStatus === 'paid' ? 'bg-primary/10 text-primary' : ''}>Rent Paid / OK</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {canAdd && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" className="rounded-xl h-10 w-10 shrink-0 shadow-sm font-bold">
                    <Plus className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => router.push('/dashboard/tenant-management')}><UserPlus className="mr-2 h-4 w-4" /> Add Guest</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleOpenRoomDialog(null, floorsToRender?.[0]?.id || '', pg.id)}><BedDouble className="mr-2 h-4 w-4" /> Add Room</DropdownMenuItem>
                  <DropdownMenuItem onClick={openAddFloor} disabled={!canAddFloor}><Building className="mr-2 h-4 w-4" /> Add Floor</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {floorsToRender?.map(floor => (
          <div key={floor.id} className="space-y-6 mb-8">
            {activeTab === 'all' && <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">{floor.name}</h3>}

            {floor.rooms.length === 0 ? (
              <div className="text-center py-10 bg-muted/20 rounded-2xl border-2 border-dashed">
                <p className="text-muted-foreground font-medium mb-4">No rooms on this floor.</p>
                {isEditMode && canAdd && <Button onClick={() => handleOpenRoomDialog(null, floor.id, pg.id)} size="sm" className="rounded-xl"><PlusCircle className="mr-2 h-4 w-4" /> Add Room</Button>}
              </div>
            ) : null}

            {floor.rooms.filter(room => {
              let roomMatches = true;

              if (searchQuery) {
                if (room.name.toLowerCase().includes(searchQuery.toLowerCase())) {
                  // room name matches
                } else {
                  const hasGuest = room.beds.some(b => {
                    const guest = guests.find(g => g.id === b.guestId && !g.isVacated);
                    return guest && guest.name.toLowerCase().includes(searchQuery.toLowerCase());
                  });
                  if (!hasGuest) roomMatches = false;
                }
              }

              if (roomMatches && filterStatus !== 'all') {
                const hasMatchingBed = room.beds.some(b => {
                  const guest = guests.find(g => g.id === b.guestId && !g.isVacated);
                  if (filterStatus === 'available' && !guest) return true;
                  if (filterStatus === 'due' && guest && (guest.rentStatus === 'unpaid' || guest.rentStatus === 'partial')) return true;
                  if (filterStatus === 'paid' && guest && guest.rentStatus !== 'unpaid' && guest.rentStatus !== 'partial') return true;
                  return false;
                });
                if (!hasMatchingBed) roomMatches = false;
              }

              return roomMatches;
            }).map(room => {
              const emptyBeds = room.beds.filter(b => !guests.some(g => g.id === b.guestId && !g.isVacated)).length;
              const isRoomEmpty = emptyBeds === room.beds.length && room.beds.length > 0;
              const forceDetailedView = filterStatus !== 'all' || searchQuery;

              return (
                <div key={room.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-lg flex items-center gap-2">{room.name}</h4>
                      <p className="text-xs text-muted-foreground -mt-0.5">{room.beds.length}-Sharing • {room.amenities?.includes('ac') ? 'AC' : 'Non-AC'}</p>
                    </div>
                    {isEditMode ? (
                      <div className="flex items-center gap-1">
                        {canEdit && <Button variant="secondary" size="sm" onClick={() => handleOpenRoomDialog(room)} className="h-8 rounded-full px-3 text-xs font-semibold"><Pencil className="w-3 h-3 justify-center" /> Edit</Button>}
                        {canAdd && <Button variant="secondary" size="sm" onClick={() => handleOpenBedDialog(null, room.id, floor.id)} className="h-8 rounded-full px-3 text-xs font-semibold"><Plus className="w-3 h-3 justify-center" /> Bed</Button>}
                      </div>
                    ) : null}
                  </div>

                  {isRoomEmpty && !isEditMode && !forceDetailedView ? (
                    <Card className="border-border/40 shadow-sm rounded-2xl overflow-hidden">
                      <div className="flex flex-col items-center justify-center p-8 bg-blue-500/5 text-center">
                        <div className="w-12 h-12 bg-blue-500/10 text-blue-600 rounded-full flex items-center justify-center mb-3">
                          <BedDouble className="w-6 h-6" />
                        </div>
                        <h5 className="font-bold text-lg text-foreground mb-1">Ready for Move-in</h5>
                        <p className="text-sm text-muted-foreground mb-4">{emptyBeds} bed(s) available in this room</p>
                        <Button className="w-full sm:w-auto font-bold rounded-xl" onClick={() => handleOpenAddGuestDialog(room.beds[0], room, pg)}>Book Now</Button>
                      </div>
                    </Card>
                  ) : viewMode === 'list' ? (
                    <Card className="border-border/40 shadow-sm rounded-2xl overflow-hidden">
                      <ul className="divide-y divide-border/20">
                        {room.beds.filter(b => {
                          const guest = guests.find(g => g.id === b.guestId && !g.isVacated);
                          if (searchQuery && guest && !guest.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
                          if (searchQuery && !guest) return false;

                          if (filterStatus !== 'all') {
                            if (filterStatus === 'available' && guest) return false;
                            if (filterStatus === 'due' && (!guest || (guest.rentStatus !== 'unpaid' && guest.rentStatus !== 'partial'))) return false;
                            if (filterStatus === 'paid' && (!guest || (guest.rentStatus === 'unpaid' || guest.rentStatus === 'partial'))) return false;
                          }
                          return true;
                        }).map(bed => {
                          const guest = guests.find(g => g.id === bed.guestId && !g.isVacated);
                          const isUnpaid = guest && (guest.rentStatus === 'unpaid' || guest.rentStatus === 'partial');
                          return (
                            <li key={bed.id} className="flex items-center justify-between p-4 hover:bg-muted/10 transition-colors">
                              <div className="flex items-center gap-4">
                                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-sm transition-colors",
                                  !guest ? "bg-secondary/10 text-secondary border-secondary/20" :
                                    isUnpaid ? "bg-orange-500/10 text-orange-600 border-orange-500/20" : "bg-green-500/10 text-green-600 border-green-500/20"
                                )}>
                                  <BedDouble className="w-5 h-5" />
                                </div>
                                <div>
                                  {guest ? (
                                    <>
                                      <p className="font-bold text-sm leading-tight">{guest.name}</p>
                                      <p className="text-xs text-muted-foreground font-medium mt-0.5">Bed {bed.name}</p>
                                    </>
                                  ) : (
                                    <>
                                      <p className="font-bold text-sm text-secondary leading-tight">Available</p>
                                      <p className="text-xs text-muted-foreground font-medium mt-0.5">Bed {bed.name}</p>
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                {!isEditMode && getBedStatusBadge(bed)}
                                {!guest && !isEditMode && (
                                  <Button variant="ghost" size="sm" className="h-8 text-xs font-bold text-secondary hover:bg-secondary/10 rounded-lg" onClick={() => handleOpenAddGuestDialog(bed, room, pg)}>Assign</Button>
                                )}
                                {guest && !isEditMode && isUnpaid && (
                                  <Button variant="ghost" size="sm" className="h-8 text-xs font-bold text-orange-600 hover:bg-orange-500/10 rounded-lg" onClick={() => handleOpenPaymentDialog(guest)}>Collect</Button>
                                )}
                                {guest && !isEditMode && (
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-muted/50 rounded-lg shrink-0">
                                        <MoreHorizontal className="w-4 h-4" />
                                      </Button>
                                    </PopoverTrigger>
                                    <GuestPopoverContent
                                      guest={guest}
                                      handleOpenPaymentDialog={handleOpenPaymentDialog}
                                      handleOpenReminderDialog={handleOpenReminderDialog}
                                      handleOpenEditGuestDialog={handleOpenEditGuestDialog}
                                      setGuestToInitiateExit={setGuestToInitiateExit}
                                      setGuestToExitImmediately={setGuestToExitImmediately}
                                    />
                                  </Popover>
                                )}
                                {isEditMode && (
                                  <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => handleOpenBedDialog(bed, room.id, floor.id)}><Pencil className="w-4 h-4" /></Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-500/10" onClick={() => handleDelete('bed', { floorId: floor.id, roomId: room.id, bedId: bed.id, pgId: pg.id })}><Trash2 className="w-4 h-4" /></Button>
                                  </div>
                                )}
                              </div>
                            </li>
                          )
                        })}
                        {room.beds.length === 0 && (
                          <li className="p-4 text-center text-sm text-muted-foreground">No beds in this room.</li>
                        )}
                      </ul>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {room.beds.filter(b => {
                        const guest = guests.find(g => g.id === b.guestId && !g.isVacated);
                        if (searchQuery && guest && !guest.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
                        if (searchQuery && !guest) return false;

                        if (filterStatus !== 'all') {
                          if (filterStatus === 'available' && guest) return false;
                          if (filterStatus === 'due' && (!guest || (guest.rentStatus !== 'unpaid' && guest.rentStatus !== 'partial'))) return false;
                          if (filterStatus === 'paid' && (!guest || (guest.rentStatus === 'unpaid' || guest.rentStatus === 'partial'))) return false;
                        }
                        return true;
                      }).map(bed => {
                        const guest = guests.find(g => g.id === bed.guestId && !g.isVacated);
                        const isUnpaid = guest && (guest.rentStatus === 'unpaid' || guest.rentStatus === 'partial');

                        return (
                          <Card key={bed.id} className={cn("p-4 border shadow-sm rounded-2xl flex flex-col justify-between hover:shadow-md transition-shadow",
                            !guest ? 'border-border/60 bg-muted/10' :
                              isUnpaid ? 'border-orange-500/30 bg-orange-500/5' : 'border-green-500/30 bg-green-500/5'
                          )}>
                            <div className="flex items-start justify-between mb-3">
                              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm",
                                !guest ? "bg-secondary text-white" :
                                  isUnpaid ? "bg-orange-100 text-orange-600" : "bg-green-100 text-green-600"
                              )}>
                                <BedDouble className="w-4 h-4" />
                              </div>
                              {!isEditMode && getBedStatusBadge(bed)}
                              {isEditMode && (
                                <div className="flex gap-1">
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => handleOpenBedDialog(bed, room.id, floor.id)}><Pencil className="w-3 h-3" /></Button>
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground mb-1 shadow-none">Bed {bed.name}</p>
                              {guest ? (
                                <p className="font-bold text-sm leading-tight line-clamp-1" title={guest.name}>{guest.name}</p>
                              ) : (
                                <p className="font-bold text-sm text-secondary leading-tight">Available</p>
                              )}
                            </div>
                            <div className="mt-4 flex gap-2 w-full">
                              {!guest && !isEditMode && (
                                <Button size="sm" className="w-full h-8 text-xs font-bold rounded-lg" variant="secondary" onClick={() => handleOpenAddGuestDialog(bed, room, pg)}>Book</Button>
                              )}
                              {guest && !isEditMode && isUnpaid && (
                                <Button size="sm" className="w-full h-8 text-xs font-bold rounded-lg text-white" style={{ backgroundColor: '#f97316' }} onClick={() => handleOpenPaymentDialog(guest)}>Collect</Button>
                              )}
                              {guest && !isEditMode && (
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button variant="outline" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-muted/50 rounded-lg shrink-0">
                                      <MoreHorizontal className="w-4 h-4" />
                                    </Button>
                                  </PopoverTrigger>
                                  <GuestPopoverContent
                                    guest={guest}
                                    handleOpenPaymentDialog={handleOpenPaymentDialog}
                                    handleOpenReminderDialog={handleOpenReminderDialog}
                                    handleOpenEditGuestDialog={handleOpenEditGuestDialog}
                                    setGuestToInitiateExit={setGuestToInitiateExit}
                                    setGuestToExitImmediately={setGuestToExitImmediately}
                                  />
                                </Popover>
                              )}
                            </div>
                          </Card>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
            {isEditMode && canAdd && (
              <Button variant="outline" className="w-full border-dashed h-12 text-muted-foreground hover:text-foreground hover:bg-muted" onClick={() => handleOpenRoomDialog(null, floor.id, pg.id)}>
                <PlusCircle className="mr-2 w-4 h-4" /> Add Room to {floor.name}
              </Button>
            )}
          </div>
        ))}
      </Tabs>

      {/* DIALOGS */}
      <Access feature="properties" action="edit">
        <RoomDialog isRoomDialogOpen={isRoomDialogOpen} setIsRoomDialogOpen={setIsRoomDialogOpen} roomToEdit={roomToEdit} roomForm={roomForm} handleRoomSubmit={handleRoomSubmit} isSavingRoom={isSavingRoom} />
        <Dialog open={isFloorDialogOpen} onOpenChange={setIsFloorDialogOpen}>
          <DialogContent><DialogHeader><DialogTitle>{floorToEdit ? 'Edit Floor' : 'Add New Floor'}</DialogTitle></DialogHeader>
            <Form {...floorForm}>
              <form onSubmit={floorForm.handleSubmit(handleFloorSubmit)} id="floor-form" className="space-y-4">
                <FormField control={floorForm.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Floor Name</FormLabel><FormControl><Input placeholder="e.g., First Floor" {...field} /></FormControl><FormMessage /></FormItem>
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
        />
      </Access>

      <Access feature="guests" action="edit">
        <EditGuestDialog
          isEditGuestDialogOpen={isEditGuestDialogOpen}
          setIsEditGuestDialogOpen={setIsEditGuestDialogOpen}
          guestToEdit={guestToEdit}
          editGuestForm={editGuestForm}
          handleEditGuestSubmit={handleEditGuestSubmit}
        />
      </Access>

      <Access feature="finances" action="add">
        <PaymentDialog
          isPaymentDialogOpen={isPaymentDialogOpen}
          setIsPaymentDialogOpen={setIsPaymentDialogOpen}
          selectedGuestForPayment={selectedGuestForPayment}
          paymentForm={paymentForm}
          handlePaymentSubmit={handlePaymentSubmit}
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

    </div>
  )
}
