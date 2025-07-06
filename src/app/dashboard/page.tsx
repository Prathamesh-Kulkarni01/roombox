'use client'

import { useState } from "react"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { pgs, tenants, complaints } from "@/lib/mock-data"
import type { Tenant, Bed } from "@/lib/types"
import { Users, IndianRupee, MessageSquareWarning, Building, BedDouble, Info, MessageCircle, ShieldAlert, Settings, Home, Calendar, Wallet, UserPlus, LogOut, Clock } from "lucide-react"
import { differenceInDays, format } from "date-fns"

export default function DashboardPage() {
  const [selectedPg, setSelectedPg] = useState(pgs[0])

  const stats = [
    { title: "Occupancy", value: `${selectedPg.occupancy}/${selectedPg.totalBeds}`, icon: Users },
    { title: "Monthly Revenue", value: "₹2,45,600", icon: IndianRupee },
    { title: "Open Complaints", value: complaints.filter(c => c.pgId === selectedPg.id && c.status === 'open').length, icon: MessageSquareWarning },
  ]
  
  const getBedStatus = (bed: Bed) => {
    const tenant = tenants.find(t => t.id === bed.tenantId)
    if (!tenant) return 'available'
    if (tenant.exitDate) return 'notice-period'
    if (tenant.rentStatus === 'unpaid') return 'rent-pending'
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline">Dashboard</h1>
          <p className="text-muted-foreground">Real-time view of your PG operations.</p>
        </div>
        <Button variant="outline">
            <Settings className="mr-2 h-4 w-4" />
            Configure Rooms & Beds
        </Button>
      </div>

      {/* Stats Cards */}
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

      {/* Room Layout */}
      <Card>
        <CardHeader>
          <CardTitle>{selectedPg.name} - Room Layout</CardTitle>
          <CardDescription>Visualize bed occupancy and statuses across all floors and rooms.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {selectedPg.floors?.map(floor => (
            <div key={floor.id}>
              <h2 className="font-bold text-xl mb-4 pb-2 border-b">{floor.name}</h2>
              <div className="space-y-6">
                {floor.rooms.map(room => (
                  <div key={room.id}>
                    <h3 className="font-semibold mb-3 text-lg">{room.name} <span className="font-normal text-muted-foreground">({room.beds.length}-sharing)</span></h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                      {room.beds.map(bed => {
                        const tenant = tenants.find(t => t.id === bed.tenantId)
                        const status = getBedStatus(bed)
                        const hasComplaint = tenant && complaints.some(c => c.tenantId === tenant.id && c.status !== 'resolved')
                        
                        return (
                          <Popover key={bed.id}>
                            <div className={`relative border-2 rounded-lg aspect-square flex flex-col items-center justify-center p-2 transition-colors ${bedStatusClasses[status]}`}>
                              <BedDouble className="w-8 h-8 mb-1" />
                              <span className="font-bold text-sm">Bed {bed.name}</span>
                              
                              <div className="absolute top-1.5 right-1.5 flex flex-col gap-1.5">
                                {hasComplaint && <ShieldAlert className="h-4 w-4 text-red-600" />}
                                {tenant?.hasMessage && <MessageCircle className="h-4 w-4 text-blue-600" />}
                                {status === 'notice-period' && <Clock className="h-4 w-4 text-blue-600" />}
                              </div>
                              
                              <PopoverTrigger asChild>
                                <Button size="icon" variant="ghost" className="absolute bottom-1 right-1 h-6 w-6 rounded-full hover:bg-black/10">
                                  <Info className="h-4 w-4" />
                                </Button>
                              </PopoverTrigger>
                            </div>
                            <PopoverContent className="w-64">
                              {tenant ? (
                                <div className="grid gap-4">
                                  <div className="flex items-center gap-3">
                                    <Avatar>
                                      <AvatarImage src={`https://placehold.co/40x40.png?text=${tenant.name.charAt(0)}`} />
                                      <AvatarFallback>{tenant.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <p className="text-sm font-medium leading-none">{tenant.name}</p>
                                      <p className="text-sm text-muted-foreground">{tenant.pgName}</p>
                                    </div>
                                  </div>
                                  {tenant.exitDate ? (
                                    <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300 w-fit">
                                      <Clock className="w-3 h-3 mr-2" />
                                      Exiting in {getDaysLeft(tenant.exitDate)} days
                                    </Badge>
                                  ) : (
                                     <Badge variant={tenant.rentStatus === 'paid' ? 'secondary' : 'destructive'} className="w-fit">{tenant.rentStatus}</Badge>
                                  )}
                                  <div className="text-sm space-y-2">
                                      <div className="flex items-center">
                                          <Wallet className="w-4 h-4 mr-2 text-muted-foreground"/>
                                          Rent: ₹{tenant.rentAmount}
                                      </div>
                                      <div className="flex items-center">
                                          <Calendar className="w-4 h-4 mr-2 text-muted-foreground"/>
                                          Due: {tenant.dueDate}
                                      </div>
                                      <div className="flex items-center">
                                          <Home className="w-4 h-4 mr-2 text-muted-foreground"/>
                                          Joined: {format(new Date(tenant.moveInDate), "do MMM, yyyy")}
                                      </div>
                                  </div>
                                  {!tenant.exitDate && (
                                     <Button variant="outline" size="sm">
                                      <LogOut className="mr-2" /> Initiate Exit
                                    </Button>
                                  )}
                                </div>
                              ) : (
                                <div className="text-center py-4">
                                  <p className="font-semibold">Bed Available</p>
                                  <p className="text-sm text-muted-foreground">This bed is currently unoccupied.</p>
                                  <Button size="sm" className="mt-4">
                                    <UserPlus className="mr-2"/>
                                    Add Tenant
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
        </CardContent>
      </Card>
    </div>
  )
}
