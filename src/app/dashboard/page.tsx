
'use client'

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { produce } from 'immer'

import { useData } from "@/context/data-provider"
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"


import type { Guest, Bed, Room, PG, Floor } from "@/lib/types"
import { Users, IndianRupee, MessageSquareWarning, Building, BedDouble, Info, MessageCircle, ShieldAlert, Clock, Home, UserPlus, CalendarIcon, Layers, DoorOpen, PlusCircle, Trash2, Pencil, Wallet, LogOut, ArrowRight } from "lucide-react"
import { differenceInDays, format, addMonths } from "date-fns"
import { cn } from "@/lib/utils"


const addGuestSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters."),
    phone: z.string().regex(/^\d{10}$/, "Please enter a valid 10-digit phone number."),
    email: z.string().email("Please enter a valid email address."),
    rentAmount: z.coerce.number().min(1, "Rent amount is required."),
    depositAmount: z.coerce.number().min(0, "Deposit amount must be 0 or more."),
    moveInDate: z.date({ required_error: "A move-in date is required."}),
    kycDocument: z.any().optional()
})

const floorSchema = z.object({ name: z.string().min(2, "Floor name must be at least 2 characters.") })
const roomSchema = z.object({
  name: z.string().min(2, "Room name must be at least 2 characters."),
  rent: z.coerce.number().min(1, "Rent is required."),
  deposit: z.coerce.number().min(0, "Deposit is required."),
})
const bedSchema = z.object({ name: z.string().min(1, "Bed name/number is required.") })

const paymentSchema = z.object({
  amountPaid: z.coerce.number().min(0.01, "Payment amount must be greater than 0."),
  paymentMethod: z.enum(['cash', 'upi', 'in-app']),
});

const rentStatusColors: Record<Guest['rentStatus'], string> = {
  paid: 'bg-green-100 text-green-800 border-green-300',
  unpaid: 'bg-red-100 text-red-800 border-red-300',
  partial: 'bg-orange-100 text-orange-800 border-orange-300',
};


export default function DashboardPage() {
  const { pgs, guests, complaints, isLoading, addGuest, updatePgs, selectedPgId, updatePg, updateGuest } = useData();
  
  // States for guest dialog
  const [isAddGuestDialogOpen, setIsAddGuestDialogOpen] = useState(false);
  const [selectedBedForGuestAdd, setSelectedBedForGuestAdd] = useState<{ bed: Bed; room: Room; pg: PG } | null>(null);
  
  // States for layout editing
  const [isEditMode, setIsEditMode] = useState(false);
  const [isFloorDialogOpen, setIsFloorDialogOpen] = useState(false);
  const [isRoomDialogOpen, setIsRoomDialogOpen] = useState(false);
  const [isBedDialogOpen, setIsBedDialogOpen] = useState(false);
  const [floorToEdit, setFloorToEdit] = useState<Floor | null>(null);
  const [roomToEdit, setRoomToEdit] = useState<{ room: Room; floorId: string } | null>(null);
  const [bedToEdit, setBedToEdit] = useState<{ bed: Bed; roomId: string; floorId: string } | null>(null);
  const [selectedFloorForRoomAdd, setSelectedFloorForRoomAdd] = useState<string | null>(null);
  const [selectedRoomForBedAdd, setSelectedRoomForBedAdd] = useState<{ floorId: string; roomId: string } | null>(null);
  
  // States for guest actions
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedGuestForPayment, setSelectedGuestForPayment] = useState<Guest | null>(null);
  
  // Forms
  const addGuestForm = useForm<z.infer<typeof addGuestSchema>>({
    resolver: zodResolver(addGuestSchema),
    defaultValues: {
      name: '', phone: '', email: '', rentAmount: 0, depositAmount: 0,
    },
  });
  const floorForm = useForm<z.infer<typeof floorSchema>>({ resolver: zodResolver(floorSchema), defaultValues: { name: '' } });
  const roomForm = useForm<z.infer<typeof roomSchema>>({ resolver: zodResolver(roomSchema), defaultValues: { name: '', rent: 0, deposit: 0 } });
  const bedForm = useForm<z.infer<typeof bedSchema>>({ resolver: zodResolver(bedSchema), defaultValues: { name: '' } });
  const paymentForm = useForm<z.infer<typeof paymentSchema>>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { paymentMethod: 'cash' }
  });

  // Memos
  const pgsToDisplay = useMemo(() => {
    return selectedPgId ? pgs.filter(p => p.id === selectedPgId) : pgs;
  }, [pgs, selectedPgId])

  // Effects for form resets
  useEffect(() => { if (floorToEdit) floorForm.reset({ name: floorToEdit.name }); else floorForm.reset({ name: '' }); }, [floorToEdit, floorForm]);
  useEffect(() => { if (roomToEdit) roomForm.reset({ name: roomToEdit.room.name, rent: roomToEdit.room.rent, deposit: roomToEdit.room.deposit }); else roomForm.reset({ name: '', rent: 0, deposit: 0 }); }, [roomToEdit, roomForm]);
  useEffect(() => { if (bedToEdit) bedForm.reset({ name: bedToEdit.bed.name }); else bedForm.reset({ name: '' }); }, [bedToEdit, bedForm]);
  useEffect(() => {
    if (selectedGuestForPayment) {
        const amountDue = selectedGuestForPayment.rentAmount - (selectedGuestForPayment.rentPaidAmount || 0);
        paymentForm.reset({ paymentMethod: 'cash', amountPaid: amountDue > 0 ? Number(amountDue.toFixed(2)) : 0 });
    }
  }, [selectedGuestForPayment, paymentForm]);

  // Data Handlers
  const getBedStatus = (bed: Bed) => {
    const guest = guests.find(g => g.id === bed.guestId)
    if (!guest) return 'available'
    if (guest.exitDate) return 'notice-period'
    if (guest.rentStatus === 'unpaid') return 'rent-pending'
    if (guest.rentStatus === 'partial') return 'rent-partial'
    return 'occupied'
  }
  
  const handleOpenAddGuestDialog = (bed: Bed, room: Room, pg: PG) => {
    setSelectedBedForGuestAdd({ bed, room, pg });
    addGuestForm.reset({ rentAmount: room.rent, depositAmount: room.deposit });
    setIsAddGuestDialogOpen(true);
  };

  const handleAddGuestSubmit = (values: z.infer<typeof addGuestSchema>) => {
    if (!selectedBedForGuestAdd) return;
    const { pg, room, bed } = selectedBedForGuestAdd;
    const newGuest: Guest = {
      id: `g-${new Date().getTime()}`, name: values.name, phone: values.phone, email: values.email, pgId: pg.id, pgName: pg.name, bedId: bed.id, rentStatus: 'unpaid', rentPaidAmount: 0, dueDate: format(addMonths(new Date(values.moveInDate), 1), 'yyyy-MM-dd'), rentAmount: values.rentAmount, depositAmount: values.depositAmount, kycStatus: 'pending', moveInDate: format(values.moveInDate, 'yyyy-MM-dd'), noticePeriodDays: 30,
    };
    addGuest(newGuest);
    const newPgs = pgs.map(currentPg => {
        if (currentPg.id === pg.id) {
            return {
                ...currentPg, occupancy: currentPg.occupancy + 1,
                floors: currentPg.floors?.map(floor => ({
                    ...floor, rooms: floor.rooms.map(r => {
                        if (r.id === room.id) {
                            return { ...r, beds: r.beds.map(b => b.id === bed.id ? { ...b, guestId: newGuest.id } : b) };
                        }
                        return r;
                    })
                }))
            };
        }
        return currentPg;
    });
    updatePgs(newPgs);
    setIsAddGuestDialogOpen(false);
  };
  
  const handleOpenPaymentDialog = (guest: Guest) => {
    setSelectedGuestForPayment(guest);
    setIsPaymentDialogOpen(true);
  };

  const handlePaymentSubmit = (values: z.infer<typeof paymentSchema>) => {
      if (!selectedGuestForPayment) return;
      const guest = selectedGuestForPayment;
      const newTotalPaid = (guest.rentPaidAmount || 0) + values.amountPaid;
      let updatedGuest: Guest;
      if (newTotalPaid >= guest.rentAmount) {
          updatedGuest = { ...guest, rentStatus: 'paid', rentPaidAmount: 0, dueDate: format(addMonths(new Date(guest.dueDate), 1), 'yyyy-MM-dd') };
      } else {
          updatedGuest = { ...guest, rentStatus: 'partial', rentPaidAmount: newTotalPaid };
      }
      updateGuest(updatedGuest);
      setIsPaymentDialogOpen(false);
      setSelectedGuestForPayment(null);
  };

  const handleVacateBed = (guest: Guest) => {
    if (!guest || guest.exitDate) return;
    if (confirm(`Are you sure you want to initiate the exit process for ${guest.name}? This cannot be undone.`)) {
        const exitDate = new Date();
        exitDate.setDate(exitDate.getDate() + guest.noticePeriodDays);
        const updatedGuest = { ...guest, exitDate: format(exitDate, 'yyyy-MM-dd') };
        updateGuest(updatedGuest);
    }
  };

  // Layout Editing Handlers
  const handleFloorSubmit = (pg: PG) => (values: z.infer<typeof floorSchema>) => {
    const nextState = produce(pg, draft => {
      if (!draft.floors) draft.floors = [];
      if (floorToEdit) {
        const floor = draft.floors.find(f => f.id === floorToEdit.id);
        if (floor) floor.name = values.name;
      } else {
        draft.floors.push({ id: `floor-${new Date().getTime()}`, name: values.name, rooms: [] });
      }
    });
    updatePg(nextState);
    setIsFloorDialogOpen(false);
    setFloorToEdit(null);
  };

  const handleRoomSubmit = (pg: PG) => (values: z.infer<typeof roomSchema>) => {
    const floorId = roomToEdit?.floorId || selectedFloorForRoomAdd;
    if (!floorId) return;
    const nextState = produce(pg, draft => {
        const floor = draft.floors?.find(f => f.id === floorId);
        if (!floor) return;
        if (roomToEdit) {
            const room = floor.rooms.find(r => r.id === roomToEdit.room.id);
            if(room) { room.name = values.name; room.rent = values.rent; room.deposit = values.deposit; }
        } else {
             floor.rooms.push({ id: `room-${new Date().getTime()}`, name: values.name, rent: values.rent, deposit: values.deposit, beds: [] });
        }
    });
    updatePg(nextState);
    setIsRoomDialogOpen(false);
    setRoomToEdit(null);
  };
  
  const handleBedSubmit = (pg: PG) => (values: z.infer<typeof bedSchema>) => {
    const floorId = bedToEdit?.floorId || selectedRoomForBedAdd?.floorId;
    const roomId = bedToEdit?.roomId || selectedRoomForBedAdd?.roomId;
    if (!floorId || !roomId) return;
    const nextState = produce(pg, draft => {
      const room = draft.floors?.find(f => f.id === floorId)?.rooms.find(r => r.id === roomId);
      if (!room) return;
      if (bedToEdit) {
        const bed = room.beds.find(b => b.id === bedToEdit.bed.id);
        if (bed) bed.name = values.name;
      } else {
        room.beds.push({ id: `bed-${new Date().getTime()}`, name: values.name, guestId: null });
        draft.totalBeds = (draft.totalBeds || 0) + 1;
      }
    });
    updatePg(nextState);
    setIsBedDialogOpen(false);
    setBedToEdit(null);
  };

  const handleDelete = (pg: PG, type: 'floor' | 'room' | 'bed', ids: { floorId: string; roomId?: string; bedId?: string }) => {
    if (!confirm(`Are you sure you want to delete this ${type}? This action cannot be undone.`)) return;
    const nextState = produce(pg, draft => {
        const floorIndex = draft.floors?.findIndex(f => f.id === ids.floorId);
        if (floorIndex === undefined || floorIndex === -1 || !draft.floors) return;
        const floor = draft.floors[floorIndex];
        if (type === 'floor') {
            if (floor?.rooms.some(r => r.beds.some(b => b.guestId))) { alert("Cannot delete a floor with occupied rooms."); return; }
            draft.totalBeds -= floor?.rooms.reduce((acc, room) => acc + room.beds.length, 0) || 0;
            draft.floors.splice(floorIndex, 1);
        } else if (type === 'room' && ids.roomId) {
            const roomIndex = floor.rooms.findIndex(r => r.id === ids.roomId);
            if (roomIndex === undefined || roomIndex === -1) return;
            const room = floor.rooms[roomIndex];
            if (room?.beds.some(b => b.guestId)) { alert("Cannot delete a room with occupied beds."); return; }
            draft.totalBeds -= room?.beds.length || 0;
            floor.rooms.splice(roomIndex, 1);
        } else if (type === 'bed' && ids.roomId && ids.bedId) {
            const room = floor.rooms.find(r => r.id === ids.roomId);
            const bedIndex = room?.beds.findIndex(b => b.id === ids.bedId);
            if (bedIndex === undefined || bedIndex === -1 || !room) return;
            if (room.beds[bedIndex].guestId) { alert("Cannot delete an occupied bed."); return; }
            room.beds.splice(bedIndex, 1);
            draft.totalBeds -= 1;
        }
    });
    updatePg(nextState);
  };

  const openAddFloorDialog = () => { setFloorToEdit(null); setIsFloorDialogOpen(true); };
  const openEditFloorDialog = (floor: Floor) => { setFloorToEdit(floor); setIsFloorDialogOpen(true); };
  const openAddRoomDialog = (floorId: string) => { setRoomToEdit(null); setSelectedFloorForRoomAdd(floorId); setIsRoomDialogOpen(true); };
  const openEditRoomDialog = (room: Room, floorId: string) => { setRoomToEdit({room, floorId}); setIsRoomDialogOpen(true); };
  const openAddBedDialog = (floorId: string, roomId: string) => { setBedToEdit(null); setSelectedRoomForBedAdd({floorId, roomId}); setIsBedDialogOpen(true); };
  const openEditBedDialog = (bed: Bed, roomId: string, floorId: string) => { setBedToEdit({bed, roomId, floorId}); setIsBedDialogOpen(true); };

  // Render Logic
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
          You haven&apos;t added any PGs yet. Get started by adding your first property.
        </p>
        <Button asChild className="mt-6 bg-accent hover:bg-accent/90 text-accent-foreground">
          <Link href="/dashboard/pg-management">Add Your First PG</Link>
        </Button>
      </div>
    );
  }

  const bedStatusClasses = {
    available: 'bg-yellow-200 border-yellow-400 text-yellow-800 hover:bg-yellow-300',
    occupied: 'bg-slate-200 border-slate-400 text-slate-800 hover:bg-slate-300',
    'rent-pending': 'bg-red-300 border-red-500 text-red-900 hover:bg-red-400',
    'rent-partial': 'bg-orange-200 border-orange-400 text-orange-800 hover:bg-orange-300',
    'notice-period': 'bg-blue-200 border-blue-400 text-blue-800 hover:bg-blue-300',
  };

  return (
    <>
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-end gap-4">
        <div className="flex items-center space-x-2">
            <Label htmlFor="edit-mode" className="font-medium">Edit Mode</Label>
            <Switch id="edit-mode" checked={isEditMode} onCheckedChange={setIsEditMode} />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-xl md:text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {pgsToDisplay.map(pg => (
        <Card key={pg.id}>
          <CardHeader>
            <CardTitle>{pg.name} - {isEditMode ? 'Layout Editor' : 'Occupancy View'}</CardTitle>
            <CardDescription>{isEditMode ? "Add, edit, or remove floors, rooms, and beds." : "Visualize bed occupancy and manage guests."}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Accordion type="multiple" className="w-full" defaultValue={pg.floors?.map(f => f.id)}>
              {pg.floors?.map(floor => (
                <AccordionItem value={floor.id} key={floor.id}>
                  <AccordionTrigger className="text-lg font-medium hover:no-underline"><div className="flex items-center gap-4 w-full"><Layers /> {floor.name}</div></AccordionTrigger>
                  <AccordionContent className="pt-4">
                    <div className="space-y-6">
                      {floor.rooms.map(room => (
                        <div key={room.id}>
                          <div className="flex justify-between items-center mb-3">
                            <h3 className="font-semibold text-lg flex items-center gap-2"><DoorOpen className="w-5 h-5" />{room.name} <span className="font-normal text-muted-foreground">({room.beds.length}-sharing)</span></h3>
                            {isEditMode && (<div className="flex items-center"><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditRoomDialog(room, floor.id)}> <Pencil className="w-4 h-4" /> </Button><Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-500/10 hover:text-red-600" onClick={() => handleDelete(pg, 'room', { floorId: floor.id, roomId: room.id })}> <Trash2 className="w-4 h-4" /> </Button></div>)}
                          </div>
                          
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                            {room.beds.map(bed => {
                              const guest = guests.find(g => g.id === bed.guestId);
                              const status = getBedStatus(bed);
                              const hasComplaint = guest && complaints.some(c => c.guestId === guest.id && c.status !== 'resolved');

                              if (isEditMode) {
                                return (
                                  <div key={bed.id} className="border-2 rounded-lg aspect-square flex flex-col items-center justify-center p-2 text-left bg-muted/50">
                                    <BedDouble className="w-8 h-8 mb-1" />
                                    <span className="font-bold text-sm">Bed {bed.name}</span>
                                    {bed.guestId && <Badge variant="outline" className="mt-1">Occupied</Badge>}
                                    <div className="absolute top-1.5 right-1.5 flex flex-col gap-1.5"><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditBedDialog(bed, room.id, floor.id)}> <Pencil className="w-3 h-3" /> </Button><Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:bg-red-500/10 hover:text-red-600" onClick={() => handleDelete(pg, 'bed', { floorId: floor.id, roomId: room.id, bedId: bed.id })}> <Trash2 className="w-3 h-3" /> </Button></div>
                                  </div>
                                );
                              }
                              
                              if (!guest) {
                                return (<button key={bed.id} onClick={() => handleOpenAddGuestDialog(bed, room, pg)} className={`relative border-2 rounded-lg aspect-square flex flex-col items-center justify-center p-2 transition-colors text-left ${bedStatusClasses[status]}`}><BedDouble className="w-8 h-8 mb-1" /><span className="font-bold text-sm">Bed {bed.name}</span><div className="absolute bottom-1 right-1 flex items-center justify-center h-6 w-6 rounded-full bg-black/10"><UserPlus className="h-4 w-4" /></div><span className="absolute top-1.5 left-1.5 text-xs font-semibold">Available</span></button>);
                              }
                              
                              return (
                                <Popover key={bed.id}>
                                    <PopoverTrigger asChild>
                                        <button className={`relative border-2 rounded-lg aspect-square flex flex-col items-center justify-center p-2.5 text-center gap-1 transition-colors w-full ${bedStatusClasses[status]}`}>
                                            <BedDouble className="w-8 h-8 mb-1" />
                                            <span className="font-bold text-sm">Bed {bed.name}</span>
                                            <p className="text-xs w-full truncate">{guest.name}</p>
                                            <div className="absolute top-1.5 right-1.5 flex flex-col gap-1.5">
                                                {hasComplaint && <ShieldAlert className="h-4 w-4 text-red-600" />}
                                                {guest?.hasMessage && <MessageCircle className="h-4 w-4 text-blue-600" />}
                                                {status === 'notice-period' && <Clock className="h-4 w-4 text-blue-600" />}
                                            </div>
                                        </button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-64 p-0">
                                        <div className="p-4 space-y-2">
                                            <div className="flex items-center gap-3">
                                                <Avatar>
                                                    <AvatarImage src={`https://placehold.co/40x40.png?text=${guest.name.charAt(0)}`} />
                                                    <AvatarFallback>{guest.name.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-semibold">{guest.name}</p>
                                                    <p className="text-xs text-muted-foreground">{guest.phone}</p>
                                                </div>
                                            </div>
                                            <div className="text-sm space-y-1">
                                                <div className="flex justify-between">
                                                    <span>Rent Status:</span>
                                                    <Badge variant="outline" className={cn("capitalize", rentStatusColors[guest.rentStatus])}>{guest.rentStatus}</Badge>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Due Date:</span>
                                                    <span className="font-medium">{format(new Date(guest.dueDate), "do MMM")}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-1 p-2 bg-muted/50">
                                            {(guest.rentStatus === 'unpaid' || guest.rentStatus === 'partial') && !guest.exitDate && (
                                                <Button variant="ghost" size="sm" className="justify-start" onClick={() => handleOpenPaymentDialog(guest)}>
                                                    <Wallet className="mr-2 h-4 w-4" /> Collect Rent
                                                </Button>
                                            )}
                                            {!guest.exitDate && (
                                                <Button variant="ghost" size="sm" className="justify-start" onClick={() => handleVacateBed(guest)}>
                                                    <LogOut className="mr-2 h-4 w-4" /> Vacate Bed
                                                </Button>
                                            )}
                                            <Button variant="ghost" size="sm" className="justify-start" asChild>
                                                <Link href={`/dashboard/tenant-management/${guest.id}`}>
                                                    <ArrowRight className="mr-2 h-4 w-4" /> Show Profile
                                                </Link>
                                            </Button>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                              );
                            })}
                             {isEditMode && (<button onClick={() => openAddBedDialog(floor.id, room.id)} className="min-h-[110px] w-full flex flex-col items-center justify-center p-2 border-2 border-dashed rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"><PlusCircle className="w-6 h-6 mb-1" /><span className="text-sm font-medium text-center">Add Bed</span></button>)}
                          </div>
                        </div>
                      ))}
                      {isEditMode && (<button onClick={() => openAddRoomDialog(floor.id)} className="min-h-[200px] h-full w-full flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"><PlusCircle className="w-8 h-8 mb-2" /><span className="font-medium">Add New Room</span></button>)}
                    </div>
                     <div className="mt-6 flex items-center gap-4">
                        {isEditMode && (<Button variant="ghost" className="text-red-600 hover:text-red-600 hover:bg-red-500/10" onClick={(e) => { e.stopPropagation(); handleDelete(pg, 'floor', { floorId: floor.id }) }}><Trash2 className="mr-2 h-4 w-4" /> Delete {floor.name}</Button>)}
                        {isEditMode && (<Button variant="ghost" onClick={(e) => { e.stopPropagation(); openEditFloorDialog(floor) }}><Pencil className="mr-2 h-4 w-4" /> Edit {floor.name}</Button>)}
                     </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            {isEditMode && (<button onClick={openAddFloorDialog} className="mt-6 w-full flex items-center justify-center p-4 border-2 border-dashed rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"><PlusCircle className="mr-2 h-5 w-5" /><span className="font-medium">Add New Floor</span></button>)}
            {(!pg.floors || pg.floors.length === 0) && (<div className="text-center text-muted-foreground p-8">This PG has no floors configured. Enable 'Edit Mode' to build the layout.</div>)}
          </CardContent>
        </Card>
      ))}
    </div>
    
    {/* --- DIALOGS --- */}
    <Dialog open={isAddGuestDialogOpen} onOpenChange={setIsAddGuestDialogOpen}>
        <DialogContent className="sm:max-w-lg flex flex-col max-h-[90dvh]"><DialogHeader><DialogTitle>Onboard New Guest</DialogTitle><DialogDescription>Add a new guest to Bed {selectedBedForGuestAdd?.bed.name} in Room {selectedBedForGuestAdd?.room.name} at {selectedBedForGuestAdd?.pg.name}.</DialogDescription></DialogHeader><div className="flex-1 overflow-y-auto -mr-6 pr-6"><Form {...addGuestForm}><form onSubmit={addGuestForm.handleSubmit(handleAddGuestSubmit)} className="space-y-4" id="add-guest-form"><FormField control={addGuestForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="e.g., Priya Sharma" {...field} /></FormControl><FormMessage /></FormItem>)} /><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><FormField control={addGuestForm.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input placeholder="e.g., 9876543210" {...field} /></FormControl><FormMessage /></FormItem>)} /><FormField control={addGuestForm.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email Address</FormLabel><FormControl><Input type="email" placeholder="e.g., priya@example.com" {...field} /></FormControl><FormMessage /></FormItem>)} /></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><FormField control={addGuestForm.control} name="rentAmount" render={({ field }) => (<FormItem><FormLabel>Monthly Rent</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} /><FormField control={addGuestForm.control} name="depositAmount" render={({ field }) => (<FormItem><FormLabel>Security Deposit</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} /></div><FormField control={addGuestForm.control} name="moveInDate" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Move-in Date</FormLabel><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button><CalendarComponent mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} initialFocus /><FormMessage /></FormItem>)} /><FormField control={addGuestForm.control} name="kycDocument" render={({ field }) => (<FormItem><FormLabel>KYC Document</FormLabel><FormControl><Input type="file" /></FormControl><FormDescription>Upload Aadhar, PAN, or other ID. This is for demo purposes.</FormDescription><FormMessage /></FormItem>)} /></form></Form></div><DialogFooter className="pt-4"><DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose><Button type="submit" form="add-guest-form">Add Guest</Button></DialogFooter></DialogContent>
    </Dialog>
    
    <Dialog open={isFloorDialogOpen} onOpenChange={setIsFloorDialogOpen}><DialogContent><DialogHeader><DialogTitle>{floorToEdit ? 'Edit Floor' : 'Add New Floor'}</DialogTitle></DialogHeader><Form {...floorForm}><form onSubmit={floorForm.handleSubmit(handleFloorSubmit(pgsToDisplay[0]))} id="floor-form" className="space-y-4"><FormField control={floorForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>Floor Name</FormLabel><FormControl><Input placeholder="e.g., First Floor" {...field} /></FormControl><FormMessage /></FormItem>)} /></form></Form><DialogFooter><DialogClose asChild><Button variant="secondary">Cancel</Button></DialogClose><Button type="submit" form="floor-form">{floorToEdit ? 'Save Changes' : 'Add Floor'}</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={isRoomDialogOpen} onOpenChange={setIsRoomDialogOpen}><DialogContent><DialogHeader><DialogTitle>{roomToEdit ? 'Edit Room' : 'Add New Room'}</DialogTitle></DialogHeader><Form {...roomForm}><form onSubmit={roomForm.handleSubmit(handleRoomSubmit(pgsToDisplay[0]))} id="room-form" className="space-y-4"><FormField control={roomForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>Room Name / Number</FormLabel><FormControl><Input placeholder="e.g., Room 101" {...field} /></FormControl><FormMessage /></FormItem>)} /><FormField control={roomForm.control} name="rent" render={({ field }) => (<FormItem><FormLabel>Monthly Rent</FormLabel><FormControl><Input type="number" placeholder="e.g., 8000" {...field} /></FormControl><FormMessage /></FormItem>)} /><FormField control={roomForm.control} name="deposit" render={({ field }) => (<FormItem><FormLabel>Security Deposit</FormLabel><FormControl><Input type="number" placeholder="e.g., 16000" {...field} /></FormControl><FormMessage /></FormItem>)} /></form></Form><DialogFooter><DialogClose asChild><Button variant="secondary">Cancel</Button></DialogClose><Button type="submit" form="room-form">{roomToEdit ? 'Save Changes' : 'Add Room'}</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={isBedDialogOpen} onOpenChange={setIsBedDialogOpen}><DialogContent><DialogHeader><DialogTitle>{bedToEdit ? 'Edit Bed' : 'Add New Bed'}</DialogTitle></DialogHeader><Form {...bedForm}><form onSubmit={bedForm.handleSubmit(handleBedSubmit(pgsToDisplay[0]))} id="bed-form" className="space-y-4"><FormField control={bedForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>Bed Name / Number</FormLabel><FormControl><Input placeholder="e.g., A, B, 1, 2..." {...field} /></FormControl><FormMessage /></FormItem>)} /></form></Form><DialogFooter><DialogClose asChild><Button variant="secondary">Cancel</Button></DialogClose><Button type="submit" form="bed-form">{bedToEdit ? 'Save Changes' : 'Add Bed'}</Button></DialogFooter></DialogContent></Dialog>
    
    {/* Payment Dialog */}
    <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
      <DialogContent className="sm:max-w-md">
          <DialogHeader>
              <DialogTitle>Collect Rent Payment</DialogTitle>
              <DialogDescription>Record a full or partial payment for {selectedGuestForPayment?.name}.</DialogDescription>
          </DialogHeader>
          {selectedGuestForPayment && (
              <Form {...paymentForm}>
                  <form onSubmit={paymentForm.handleSubmit(handlePaymentSubmit)} id="payment-form" className="space-y-4">
                      <div className="space-y-2 py-2">
                          <p className="text-sm text-muted-foreground">Total Rent: <span className="font-medium text-foreground">₹{selectedGuestForPayment.rentAmount.toLocaleString('en-IN')}</span></p>
                          <p className="text-sm text-muted-foreground">Amount Due: <span className="font-bold text-lg text-foreground">₹{(selectedGuestForPayment.rentAmount - (selectedGuestForPayment.rentPaidAmount || 0)).toLocaleString('en-IN')}</span></p>
                      </div>
                      <FormField control={paymentForm.control} name="amountPaid" render={({ field }) => (
                          <FormItem><FormLabel>Amount to Collect</FormLabel><FormControl><Input type="number" placeholder="Enter amount" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={paymentForm.control} name="paymentMethod" render={({ field }) => (
                          <FormItem className="space-y-3"><FormLabel>Payment Method</FormLabel>
                              <FormControl>
                                  <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4 pt-1">
                                      <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="cash" id="cash-payment" /></FormControl><FormLabel htmlFor="cash-payment" className="font-normal cursor-pointer">Cash</FormLabel></FormItem>
                                      <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="upi" id="upi-payment" /></FormControl><FormLabel htmlFor="upi-payment" className="font-normal cursor-pointer">UPI</FormLabel></FormItem>
                                  </RadioGroup>
                              </FormControl>
                              <FormMessage />
                          </FormItem>
                      )} />
                  </form>
              </Form>
          )}
          <DialogFooter>
              <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
              <Button type="submit" form="payment-form">Confirm Payment</Button>
          </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}

    