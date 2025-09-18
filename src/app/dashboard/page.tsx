

'use client'

import { useMemo, useRef, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from 'next/link'
import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Skeleton } from "@/components/ui/skeleton"
import { Building, IndianRupee, MessageSquareWarning, Users, FileWarning, Loader2, Filter, Search, UserPlus, Wallet, BellRing, Send, Pencil, View, Rows, PlusCircle, XCircle } from "lucide-react"
import RoomDialog from '@/components/dashboard/dialogs/RoomDialog'
import { useDashboard } from '@/hooks/use-dashboard'
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
import type { Bed, BedStatus, PG, Room, Guest } from '@/lib/types'
import { useToast } from "@/hooks/use-toast"
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import QuickActions from "@/components/dashboard/QuickActions"
import GuidedSetup from "@/components/dashboard/GuidedSetup"
import { getSubscribedTopics, initPushAndSaveToken, subscribeToTopic } from '@/lib/notifications'
import { Badge } from "@/components/ui/badge"
import { getAuth } from "firebase/auth"
import { auth } from "@/lib/firebase"


const bedLegend: Record<BedStatus, { label: string, className: string }> = {
  available: { label: 'Available', className: 'bg-yellow-200' },
  occupied: { label: 'Occupied', className: 'bg-slate-200' },
  'rent-pending': { label: 'Rent Pending', className: 'bg-red-300' },
  'rent-partial': { label: 'Partial Payment', className: 'bg-orange-200' },
  'notice-period': { label: 'Notice Period', className: 'bg-blue-200' },
};


export default function DashboardPage() {
  const dispatch = useAppDispatch();
  const { pgs, guests, complaints, staff, expenses } = useAppSelector(state => ({
    pgs: state.pgs.pgs,
    guests: state.guests.guests,
    complaints: state.complaints.complaints,
    staff: state.staff.staff,
    expenses: state.expenses.expenses,
  }));

  const { isLoading, selectedPgId } = useAppSelector(state => state.app);
  const [isEditMode, setIsEditMode] = useState(false)
  const isFirstAvailableBedFound = useRef(false);
  const [isAddPgSheetOpen, setIsAddPgSheetOpen] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState<BedStatus[]>([]);
  const [viewMode, setViewMode] = useState<'bed' | 'room'>('bed');

  const {
    isAddGuestDialogOpen, setIsAddGuestDialogOpen, selectedBedForGuestAdd, addGuestForm, handleAddGuestSubmit,
    isEditGuestDialogOpen, setIsEditGuestDialogOpen, guestToEdit, editGuestForm, handleEditGuestSubmit,
    isRoomDialogOpen, setIsRoomDialogOpen, roomToEdit, roomForm, handleRoomSubmit, isSavingRoom,
    isFloorDialogOpen, setIsFloorDialogOpen, floorToEdit, floorForm, handleFloorSubmit,
    isBedDialogOpen, setIsBedDialogOpen, bedToEdit, bedForm, handleBedSubmit,
    isPaymentDialogOpen, setIsPaymentDialogOpen, selectedGuestForPayment, paymentForm, handlePaymentSubmit,
    isReminderDialogOpen, setIsReminderDialogOpen, selectedGuestForReminder, isGeneratingReminder, reminderMessage, setReminderMessage,
    isSharedChargeDialogOpen, setIsSharedChargeDialogOpen, roomForSharedCharge, sharedChargeForm, handleSharedChargeSubmit,
    itemToDelete, setItemToDelete,
    guestToInitiateExit, setGuestToInitiateExit,
    handleConfirmInitiateExit,
    guestToExitImmediately, setGuestToExitImmediately,
    handleConfirmImmediateExit,
    handleOpenAddGuestDialog,
    handleOpenEditGuestDialog,
    handleOpenPaymentDialog,
    handleOpenReminderDialog,
    handleOpenSharedChargeDialog,
    handleOpenFloorDialog,
    handleOpenRoomDialog,
    handleOpenBedDialog,
    handleDelete
  } = useDashboard({ pgs, guests });

  const { currentUser } = useAppSelector(state => state.user);
  const { featurePermissions } = useAppSelector(state => state.permissions);

  // Notification test panel state
  const [testTopic, setTestTopic] = useState('alerts')
  const [sending, setSending] = useState(false)
  const [showTopics, setShowTopics] = useState<string[]>([]);


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
    
    // When edit mode is on, we want to see all PGs unfiltered to edit their layouts.
    if (isEditMode) {
      return pgs;
    }
    
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
  }, [pgs, selectedPgId, searchTerm, activeFilters, guests, isEditMode]);

  const stats = useMemo(() => {
    const relevantPgs = selectedPgId ? pgs.filter(p => p.id === selectedPgId) : pgs;
    const relevantGuests = selectedPgId ? guests.filter(g => g.pgId === selectedPgId) : guests;
    const relevantComplaints = selectedPgId ? complaints.filter(c => c.pgId === selectedPgId) : complaints;
    
    const totalOccupancy = relevantGuests.filter(g => !g.isVacated).length;
    const totalBeds = relevantPgs.reduce((sum, pg) => sum + pg.totalBeds, 0);
    
    const monthlyRevenue = relevantGuests
      .filter(g => g.rentStatus === 'paid' && !g.isVacated)
      .reduce((sum, g) => sum + g.rentAmount, 0);

    const openComplaintsCount = relevantComplaints.filter(c => c.status === 'open').length;

    const pendingDues = relevantGuests
      .filter(g => !g.isVacated && (g.rentStatus === 'unpaid' || g.rentStatus === 'partial'))
      .reduce((sum, g) => {
           const balanceBf = g.balanceBroughtForward || 0;
           const currentMonthRent = g.rentAmount;
           const chargesDue = (g.additionalCharges || []).reduce((s, charge) => s + charge.amount, 0);
           const totalOwed = balanceBf + currentMonthRent + chargesDue;
           const totalPaid = g.rentPaidAmount || 0;
           return sum + (totalOwed - totalPaid);
      }, 0);

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
  
  const handleDeleteConfirm = () => {
    if (itemToDelete) {
      handleDelete(itemToDelete.type, itemToDelete.ids);
      setItemToDelete(null);
    }
  };
  
  const handleSendMassReminder = async () => {
      const pendingGuests = guests.filter(g => !g.isVacated && (g.rentStatus === 'unpaid' || g.rentStatus === 'partial'));
      if (pendingGuests.length === 0) {
          toast({ title: 'All Clear!', description: 'No pending rent reminders to send.' });
          return;
      }
      
      toast({ title: 'Sending Reminders...', description: `Sending ${pendingGuests.length} rent reminders.` });
      const user = auth.currentUser;
      if (!user) {
          toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to send reminders.'});
          return;
      }

      const token = await user.getIdToken();
      
      const response = await fetch('/api/reminders/send-all', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
      });
      const result = await response.json();
      if(result.success) {
          toast({ title: 'Reminders Sent!', description: `Successfully sent ${result.sentCount} reminders.` });
      } else {
          toast({ variant: 'destructive', title: 'Error', description: result.error || 'Failed to send reminders.' });
      }
  }

  const handleSendAnnouncement = () => {
    
     toast({ title: "Feature Coming Soon", description: "A dialog to send announcements to all guests will be implemented here."})
  }

  // Notification test handlers
  const handleInitPush = async () => {
    if (!currentUser?.id) {
      toast({ variant: 'destructive', title: 'No user', description: 'Please login first.' })
      return
    }
    const res = await initPushAndSaveToken(currentUser.id)
    if (res.token) {
      toast({ title: 'Push Ready', description: 'Token saved. You can now subscribe to topics.' })
      // Auto-subscribe to base topics
      const baseTopics: string[] = ['app', `role-${currentUser.role}`];
      const ownerTopics: string[] = currentUser.role === 'owner' ? ['tenants-all'] : [];
      const pgTopics: string[] = selectedPgId ? [`pg-${selectedPgId}-tenants`] : [];
      await subscribeToTopic({ token: res.token, topics: [...baseTopics, ...ownerTopics, ...pgTopics], userId: currentUser.id })
      fetchTopics();
    } else {
      toast({ variant: 'destructive', title: 'Init failed', description: 'Could not get a token. Check VAPID and permissions.' })
    }
  }

  const handleSubscribeTopic = async () => {
    try {
      setSending(true)
      if (!currentUser?.fcmToken) {
        toast({ variant: 'destructive', title: 'No token', description: 'Click "Init Push" first to save a token.' })
        return
      }
      const ok = await subscribeToTopic({ token: currentUser.fcmToken, topic: testTopic, userId: currentUser.id })
      toast({ title: ok ? 'Subscribed' : 'Subscribe failed', description: ok ? `Subscribed to ${testTopic}` : 'See server logs.' })
      if(ok) fetchTopics();
    } finally {
      setSending(false)
    }
  }

  const handleSendToSelf = async () => {
    if (!currentUser?.id) return
    try {
      setSending(true)
      const res = await fetch('/api/notifications/send/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, title: 'Test Notification', body: 'Hello from dashboard', link: '/dashboard' })
      })
      if (res.ok) toast({ title: 'Sent', description: 'Notification sent to you.' })
      else {
        const j = await res.json().catch(() => ({}))
        toast({ variant: 'destructive', title: 'Send failed', description: j.error || 'Unknown error' })
      }
    } finally {
      setSending(false)
    }
  }

  const fetchTopics = async () => {
    if(!currentUser?.id) return;
    const res = await getSubscribedTopics({ userId: currentUser.id });
    setShowTopics(Array.isArray(res) ? res : []);
    return res||[]
  }

  useEffect(() => {
    fetchTopics()
  }, [currentUser?.id]);

  const handleSendToTopic = async () => {
    try {
      setSending(true)
      const res = await fetch('/api/notifications/send/topic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: 'app', title: 'Topic Ping', body: 'Hello subscribers', link: '/dashboard' })
      })
      if (res.ok) toast({ title: 'Topic Sent', description: `Sent to ${'app'}` })
      else {
        const j = await res.json().catch(() => ({}))
        toast({ variant: 'destructive', title: 'Topic send failed', description: j.error || 'Unknown error' })
      }
    } finally {
      setSending(false)
    }
  }

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
  
  return (
    <>
      <div className="flex flex-col gap-4">
        <GuidedSetup
            pgs={pgs}
            guests={guests}
            staff={staff}
            expenses={expenses}
            onAddProperty={() => setIsAddPgSheetOpen(true)}
            onSetupLayout={() => { pgs.length > 0 && router.push(`/dashboard/pg-management/${pgs[0].id}?setup=true`)}}
            onAddGuest={() => {
                const firstAvailableBed = pgs.flatMap(pg => pg.floors?.flatMap(f => f.rooms.flatMap(r => r.beds.map(b => ({pg, room:r, bed:b}))))).find(b => !b.bed.guestId);
                if (firstAvailableBed) {
                    handleOpenAddGuestDialog(firstAvailableBed.bed, firstAvailableBed.room, firstAvailableBed.pg);
                } else {
                    toast({variant: 'destructive', title: 'No Vacant Beds', description: "Please add a bed in 'Edit Building' mode first."})
                }
            }}
        />
        <StatsCards stats={stats} />
        <QuickActions 
            pgs={pgs}
            guests={guests}
            handleOpenAddGuestDialog={handleOpenAddGuestDialog}
            handleOpenPaymentDialog={handleOpenPaymentDialog}
            onSendMassReminder={handleSendMassReminder}
            onSendAnnouncement={handleSendAnnouncement}
        />
        
        <div className="space-y-4">
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
            <div className="flex items-center gap-2">
                <ToggleGroup type="single" value={viewMode} onValueChange={(value: 'bed' | 'room') => value && setViewMode(value)} className="w-full sm:w-auto">
                    <ToggleGroupItem value="bed" aria-label="Beds" className="w-full">
                        <View className="mr-2 h-4 w-4"/> Beds
                    </ToggleGroupItem>
                    <ToggleGroupItem value="room" aria-label="Rooms" className="w-full">
                        <Rows className="mr-2 h-4 w-4"/> Rooms
                    </ToggleGroupItem>
                </ToggleGroup>
                <Access feature="properties" action="edit">
                    <Button
                        onClick={() => setIsEditMode(!isEditMode)}
                        variant="outline"
                    >
                        <Pencil className="mr-2 h-4 w-4" />
                        {isEditMode ? "Done" : "Edit Building"}
                    </Button>
                </Access>
            </div>
        </div>

        {pgsToDisplay.map(pg => (
          <PgLayout
            key={pg.id}
            pg={pg}
            viewMode={viewMode}
            isEditMode={isEditMode}
            isFirstAvailableBedFound={isFirstAvailableBedFound}
            setItemToDelete={setItemToDelete}
            setGuestToInitiateExit={setGuestToInitiateExit}
            setGuestToExitImmediately={setGuestToExitImmediately}
            handleOpenAddGuestDialog={handleOpenAddGuestDialog}
            handleOpenEditGuestDialog={handleOpenEditGuestDialog}
            handleOpenPaymentDialog={handleOpenPaymentDialog}
            handleOpenReminderDialog={handleOpenReminderDialog}
            handleOpenSharedChargeDialog={handleOpenSharedChargeDialog}
            handleOpenFloorDialog={handleOpenFloorDialog}
            handleOpenRoomDialog={handleOpenRoomDialog}
            handleOpenBedDialog={handleOpenBedDialog}
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

      <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><BellRing className="h-4 w-4"/> Notifications Test</CardTitle>
              <CardDescription>Initialize push and send test notifications.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Button onClick={handleInitPush} disabled={sending}>Init Push</Button>
                <span className="text-xs text-muted-foreground">Token: {currentUser?.fcmToken?.substring(0, 20)}…</span>
              </div>
              <div className="flex items-center gap-2">
                <Input value={testTopic} onChange={(e) => setTestTopic(e.target.value)} className="max-w-xs" placeholder="topic" />
                <Button variant="outline" onClick={handleSubscribeTopic} disabled={sending}>Subscribe</Button>
                <Button variant="ghost" size="sm" onClick={fetchTopics}>Refresh Topics</Button>
              </div>
               <div>
                  <p className="text-xs font-medium">Subscribed Topics:</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                  {showTopics.map(t => <Badge key={t} variant="secondary">{t}</Badge>)}
                  </div>
                </div>
              <div className="flex items-center gap-2">
                <Button onClick={handleSendToSelf} disabled={sending}><Send className="mr-2 h-4 w-4"/> Send To Me</Button>
                <Button variant="secondary" onClick={handleSendToTopic} disabled={sending}><Send className="mr-2 h-4 w-4"/> Send To Topic</Button>
              </div>
            </CardContent>
          </Card>
        </div>

      {/* DIALOGS */}
      <Access feature="properties" action="add">
         <AddPgSheet
            open={isAddPgSheetOpen}
            onOpenChange={setIsAddPgSheetOpen}
            onPgAdded={(pgId) => { router.push(`/dashboard/pg-management/${pgId}?setup=true`); }}
          />
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
      <Access feature="properties" action="edit">
        <RoomDialog isRoomDialogOpen={isRoomDialogOpen} setIsRoomDialogOpen={setIsRoomDialogOpen} roomToEdit={roomToEdit} roomForm={roomForm} handleRoomSubmit={handleRoomSubmit} isSavingRoom={isSavingRoom} />
        <FloorDialog isFloorDialogOpen={isFloorDialogOpen} setIsFloorDialogOpen={setIsFloorDialogOpen} floorToEdit={floorToEdit} floorForm={floorForm} handleFloorSubmit={handleFloorSubmit} />
        <BedDialog isBedDialogOpen={isBedDialogOpen} setIsBedDialogOpen={setIsBedDialogOpen} bedToEdit={bedToEdit} bedForm={bedForm} handleBedSubmit={handleBedSubmit} />
      </Access>
      <Access feature="finances" action="add">
        <PaymentDialog 
          isPaymentDialogOpen={isPaymentDialogOpen} 
          setIsPaymentDialogOpen={setIsPaymentDialogOpen} 
          selectedGuestForPayment={selectedGuestForPayment} 
          paymentForm={paymentForm} 
          handlePaymentSubmit={handlePaymentSubmit} 
        />
        <SharedChargeDialog 
          isSharedChargeDialogOpen={isSharedChargeDialogOpen} 
          setIsSharedChargeDialogOpen={setIsSharedChargeDialogOpen} 
          roomForSharedCharge={roomForSharedCharge} 
          sharedChargeForm={sharedChargeForm} 
          handleSharedChargeSubmit={handleSharedChargeSubmit} 
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
