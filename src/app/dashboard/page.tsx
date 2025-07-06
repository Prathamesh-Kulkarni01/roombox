'use client'

import { useMemo } from "react"
import Link from "next/link"
import { useData } from "@/context/data-provider"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import type { Guest, Bed, Room, PG } from "@/lib/types"
import { Users, IndianRupee, MessageSquareWarning, Building, BedDouble, Info, MessageCircle, ShieldAlert, Clock, Wallet, Calendar, Home, LogOut, UserPlus } from "lucide-react"
import { differenceInDays, format } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardPage() {
  const { pgs, guests, complaints, isLoading, updateGuest, addGuest, updatePgs, selectedPgId } = useData();

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
  
  const handleAddGuest = (bed: Bed, room: Room, pg: PG) => {
    const newGuest: Guest = {
      id: `g-${new Date().getTime()}`,
      name: 'New Guest',
      pgId: pg.id,
      pgName: pg.name,
      bedId: bed.id,
      rentStatus: 'unpaid',
      dueDate: format(new Date(), 'yyyy-MM-dd'),
      rentAmount: pg.priceRange.min,
      kycStatus: 'pending',
      moveInDate: format(new Date(), 'yyyy-MM-dd'),
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
                                {guest ? (
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
                                ) : (
                                  <div className="text-center py-4">
                                    <p className="font-semibold">Bed Available</p>
                                    <p className="text-sm text-muted-foreground">This bed is currently unoccupied.</p>
                                    <Button size="sm" className="mt-4" onClick={() => handleAddGuest(bed, room, pg)}>
                                      <UserPlus className="mr-2 h-4 w-4"/>
                                      Add Guest
                                    </Button>
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
  )
}
