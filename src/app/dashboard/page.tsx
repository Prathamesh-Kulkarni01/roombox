'use client'

import { useState, useMemo } from "react"
import Link from "next/link"
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import type { Guest, Bed, Room, PG } from "@/lib/types"
import { Users, IndianRupee, MessageSquareWarning, Building, BedDouble, Info, MessageCircle, ShieldAlert, Clock, Wallet, Home, LogOut, UserPlus, CalendarIcon } from "lucide-react"
import { differenceInDays, format } from "date-fns"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

const addGuestSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters."),
    phone: z.string().regex(/^\d{10}$/, "Please enter a valid 10-digit phone number."),
    email: z.string().email("Please enter a valid email address."),
    rentAmount: z.coerce.number().min(1, "Rent amount is required."),
    depositAmount: z.coerce.number().min(0, "Deposit amount must be 0 or more."),
    moveInDate: z.date({ required_error: "A move-in date is required."}),
    kycDocument: z.any().optional()
})

export default function DashboardPage() {
  const { pgs, guests, complaints, isLoading, updateGuest, addGuest, updatePgs, selectedPgId } = useData();
  const [isAddGuestDialogOpen, setIsAddGuestDialogOpen] = useState(false);
  const [selectedBedForGuestAdd, setSelectedBedForGuestAdd] = useState<{ bed: Bed; room: Room; pg: PG } | null>(null);

  const form = useForm<z.infer<typeof addGuestSchema>>({
    resolver: zodResolver(addGuestSchema),
  });

  const pgsToDisplay = useMemo(() => {
    return selectedPgId ? pgs.filter(p => p.id === selectedPgId) : pgs;
  }, [pgs, selectedPgId])

  const getBedStatus = (bed: Bed) => {
    const guest = guests.find(g => g.id === bed.guestId)
    if (!guest) return 'available'
    if (guest.exitDate) return 'notice-period'
    if (guest.rentStatus === 'unpaid') return 'rent-pending'
    return 'occupied'
  }

  const bedStatusClasses = {
    available: 'bg-yellow-200 border-yellow-400 text-yellow-800 hover:bg-yellow-300',
    occupied: 'bg-slate-200 border-slate-400 text-slate-800 hover:bg-slate-300',
    'rent-pending': 'bg-red-300 border-red-500 text-red-900 hover:bg-red-400',
    'notice-period': 'bg-blue-200 border-blue-400 text-blue-800 hover:bg-blue-300',
  }
  
  const getDaysLeft = (exitDate: string) => {
    const days = differenceInDays(new Date(exitDate), new Date());
    return days > 0 ? days : 0;
  }
  
  const handleInitiateExit = (guestToUpdate: Guest) => {
    if (guestToUpdate.exitDate) return;

    const exitDate = new Date();
    exitDate.setDate(exitDate.getDate() + guestToUpdate.noticePeriodDays);
    
    const updatedGuest = {
      ...guestToUpdate,
      exitDate: format(exitDate, 'yyyy-MM-dd'),
    };
    updateGuest(updatedGuest);
  };
  
  const handleOpenAddGuestDialog = (bed: Bed, room: Room, pg: PG) => {
    setSelectedBedForGuestAdd({ bed, room, pg });
    form.reset({
      rentAmount: room.beds.length <= 2 ? pg.priceRange.max : pg.priceRange.min,
      depositAmount: (room.beds.length <= 2 ? pg.priceRange.max : pg.priceRange.min) * 2,
    });
    setIsAddGuestDialogOpen(true);
  };

  const handleAddGuestSubmit = (values: z.infer<typeof addGuestSchema>) => {
    if (!selectedBedForGuestAdd) return;
    
    const { pg, room, bed } = selectedBedForGuestAdd;

    const newGuest: Guest = {
      id: `g-${new Date().getTime()}`,
      name: values.name,
      phone: values.phone,
      email: values.email,
      pgId: pg.id,
      pgName: pg.name,
      bedId: bed.id,
      rentStatus: 'unpaid',
      dueDate: format(new Date(values.moveInDate).setDate(values.moveInDate.getDate() + 30), 'yyyy-MM-dd'),
      rentAmount: values.rentAmount,
      depositAmount: values.depositAmount,
      kycStatus: 'pending',
      moveInDate: format(values.moveInDate, 'yyyy-MM-dd'),
      noticePeriodDays: 30,
    };
    
    addGuest(newGuest);

    const newPgs = pgs.map(currentPg => {
        if (currentPg.id === pg.id) {
            return {
                ...currentPg,
                occupancy: currentPg.occupancy + 1,
                floors: currentPg.floors?.map(floor => ({
                    ...floor,
                    rooms: floor.rooms.map(r => {
                        if (r.id === room.id) {
                            return {
                                ...r,
                                beds: r.beds.map(b => b.id === bed.id ? { ...b, guestId: newGuest.id } : b)
                            };
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


  const stats = useMemo(() => {
    const relevantGuests = selectedPgId ? guests.filter(g => g.pgId === selectedPgId) : guests
    const relevantComplaints = selectedPgId ? complaints.filter(c => c.pgId === selectedPgId) : complaints

    const totalOccupancy = pgsToDisplay.reduce((sum, pg) => sum + pg.occupancy, 0)
    const totalBeds = pgsToDisplay.reduce((sum, pg) => sum + pg.totalBeds, 0)
    
    const monthlyRevenue = relevantGuests
        .filter(g => g.rentStatus === 'paid')
        .reduce((sum, g) => sum + g.rentAmount, 0)

    const openComplaintsCount = relevantComplaints.filter(c => c.status === 'open').length

    return [
      { title: "Occupancy", value: `${totalOccupancy}/${totalBeds}`, icon: Users },
      { title: "Monthly Revenue", value: `₹${monthlyRevenue.toLocaleString('en-IN')}`, icon: IndianRupee },
      { title: "Open Complaints", value: openComplaintsCount, icon: MessageSquareWarning },
    ]
  }, [pgsToDisplay, guests, complaints, selectedPgId])


  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-7 w-1/2 mb-2" />
            <Skeleton className="h-5 w-3/4" />
          </CardHeader>
          <CardContent className="space-y-8">
              <div className="space-y-4">
                  <Skeleton className="h-7 w-1/4 mb-4" />
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                      {Array.from({ length: 8 }).map((_, i) => (
                          <Skeleton key={i} className="aspect-square rounded-lg" />
                      ))}
                  </div>
              </div>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  if (pgs.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <Building className="mx-auto h-16 w-16 text-muted-foreground" />
            <h2 className="mt-6 text-2xl font-semibold">Welcome to Your Dashboard</h2>
            <p className="mt-2 text-muted-foreground max-w-md">
                You haven't added any PGs yet. Go to the PG Management section to add your first property.
            </p>
            <Button asChild className="mt-6">
                <Link href="/dashboard/pg-management">Add PG</Link>
            </Button>
        </div>
    )
  }

  return (
    <>
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {pgsToDisplay.map(pg => (
        <Card key={pg.id}>
          <CardHeader>
            <CardTitle>{pg.name} - Room Layout</CardTitle>
            <CardDescription>Visualize bed occupancy and statuses across all floors and rooms.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {pg.floors?.map(floor => (
              <div key={floor.id}>
                <h2 className="font-bold text-xl mb-4 pb-2 border-b">{floor.name}</h2>
                <div className="space-y-6">
                  {floor.rooms.map(room => (
                    <div key={room.id}>
                      <h3 className="font-semibold mb-3 text-lg">{room.name} <span className="font-normal text-muted-foreground">({room.beds.length}-sharing)</span></h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                        {room.beds.map(bed => {
                          const guest = guests.find(g => g.id === bed.guestId)
                          const status = getBedStatus(bed)
                          const hasComplaint = guest && complaints.some(c => c.guestId === guest.id && c.status !== 'resolved')
                          
                          if (!guest) { // Bed is available
                            return (
                                <button key={bed.id} onClick={() => handleOpenAddGuestDialog(bed, room, pg)} className={`relative border-2 rounded-lg aspect-square flex flex-col items-center justify-center p-2 transition-colors text-left ${bedStatusClasses[status]}`}>
                                    <BedDouble className="w-8 h-8 mb-1" />
                                    <span className="font-bold text-sm">Bed {bed.name}</span>
                                    <div className="absolute bottom-1 right-1 flex items-center justify-center h-6 w-6 rounded-full bg-black/10">
                                       <UserPlus className="h-4 w-4" />
                                    </div>
                                    <span className="absolute top-1.5 left-1.5 text-xs font-semibold">Available</span>
                                </button>
                            )
                          }
                          
                          return (
                            <Popover key={bed.id}>
                              <div className={`relative border-2 rounded-lg aspect-square flex flex-col items-center justify-center p-2 transition-colors ${bedStatusClasses[status]}`}>
                                <BedDouble className="w-8 h-8 mb-1" />
                                <span className="font-bold text-sm">Bed {bed.name}</span>
                                
                                <div className="absolute top-1.5 right-1.5 flex flex-col gap-1.5">
                                  {hasComplaint && <ShieldAlert className="h-4 w-4 text-red-600" />}
                                  {guest?.hasMessage && <MessageCircle className="h-4 w-4 text-blue-600" />}
                                  {status === 'notice-period' && <Clock className="h-4 w-4 text-blue-600" />}
                                </div>
                                
                                <PopoverTrigger asChild>
                                  <Button size="icon" variant="ghost" className="absolute bottom-1 right-1 h-6 w-6 rounded-full hover:bg-black/10">
                                    <Info className="h-4 w-4" />
                                  </Button>
                                </PopoverTrigger>
                              </div>
                              <PopoverContent className="w-64">
                                {guest && (
                                  <div className="grid gap-4">
                                    <div className="flex items-center gap-3">
                                      <Avatar>
                                        <AvatarImage src={`https://placehold.co/40x40.png?text=${guest.name.charAt(0)}`} />
                                        <AvatarFallback>{guest.name.charAt(0)}</AvatarFallback>
                                      </Avatar>
                                      <div>
                                        <p className="text-sm font-medium leading-none">{guest.name}</p>
                                        <p className="text-sm text-muted-foreground">{guest.pgName}</p>
                                      </div>
                                    </div>
                                    {guest.exitDate ? (
                                      <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300 w-fit">
                                        <Clock className="w-3 h-3 mr-2" />
                                        Exiting in {getDaysLeft(guest.exitDate)} days
                                      </Badge>
                                    ) : (
                                       <Badge variant={guest.rentStatus === 'paid' ? 'secondary' : 'destructive'} className="w-fit">{guest.rentStatus}</Badge>
                                    )}
                                    <div className="text-sm space-y-2">
                                        <div className="flex items-center">
                                            <Wallet className="w-4 h-4 mr-2 text-muted-foreground"/>
                                            Rent: ₹{guest.rentAmount}
                                        </div>
                                        <div className="flex items-center">
                                            <Calendar className="w-4 h-4 mr-2 text-muted-foreground"/>
                                            Due: {guest.dueDate}
                                        </div>
                                        <div className="flex items-center">
                                            <Home className="w-4 h-4 mr-2 text-muted-foreground"/>
                                            Joined: {format(new Date(guest.moveInDate), "do MMM, yyyy")}
                                        </div>
                                    </div>
                                    {!guest.exitDate && (
                                       <Button variant="outline" size="sm" onClick={() => handleInitiateExit(guest)}>
                                        <LogOut className="mr-2 h-4 w-4" /> Initiate Exit
                                      </Button>
                                    )}
                                  </div>
                                )}
                              </PopoverContent>
                            </Popover>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
             {(!pg.floors || pg.floors.length === 0) && (
                <div className="text-center text-muted-foreground p-8">No floors or rooms configured for this PG.</div>
             )}
          </CardContent>
        </Card>
      ))}
    </div>
    
    <Dialog open={isAddGuestDialogOpen} onOpenChange={setIsAddGuestDialogOpen}>
        <DialogContent className="sm:max-w-lg">
            <DialogHeader>
                <DialogTitle>Onboard New Guest</DialogTitle>
                <DialogDescription>
                  Add a new guest to Bed {selectedBedForGuestAdd?.bed.name} in Room {selectedBedForGuestAdd?.room.name} at {selectedBedForGuestAdd?.pg.name}.
                </DialogDescription>
            </DialogHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleAddGuestSubmit)} className="space-y-4">
                    <FormField control={form.control} name="name" render={({ field }) => (
                        <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="e.g., Priya Sharma" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="phone" render={({ field }) => (
                          <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input placeholder="e.g., 9876543210" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                       <FormField control={form.control} name="email" render={({ field }) => (
                          <FormItem><FormLabel>Email Address</FormLabel><FormControl><Input type="email" placeholder="e.g., priya@example.com" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="rentAmount" render={({ field }) => (
                          <FormItem><FormLabel>Monthly Rent</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="depositAmount" render={({ field }) => (
                           <FormItem><FormLabel>Security Deposit</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                     <FormField control={form.control} name="moveInDate" render={({ field }) => (
                          <FormItem className="flex flex-col"><FormLabel>Move-in Date</FormLabel>
                            <Popover><PopoverTrigger asChild>
                                  <FormControl>
                                    <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                      {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} initialFocus />
                                </PopoverContent>
                              </Popover>
                           <FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="kycDocument" render={({ field }) => (
                          <FormItem><FormLabel>KYC Document</FormLabel><FormControl><Input type="file" /></FormControl><FormDescription>Upload Aadhar, PAN, or other ID. This is for demo purposes.</FormDescription><FormMessage /></FormItem>
                      )} />

                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
                        <Button type="submit">Add Guest</Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
    </Dialog>
    </>
  )
}
