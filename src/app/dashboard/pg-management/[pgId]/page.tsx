'use client'

import { useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useData } from '@/context/data-provider'
import Link from 'next/link'
import { produce } from 'immer'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'

import { Building, Layers, DoorOpen, BedDouble, PlusCircle, IndianRupee, Trash2, ArrowLeft } from 'lucide-react'
import type { PG, Floor, Room, Bed } from '@/lib/types'

const floorSchema = z.object({ name: z.string().min(2, "Floor name must be at least 2 characters.") })
const roomSchema = z.object({
  name: z.string().min(2, "Room name must be at least 2 characters."),
  rent: z.coerce.number().min(1, "Rent is required."),
  deposit: z.coerce.number().min(0, "Deposit is required."),
})
const bedSchema = z.object({ name: z.string().min(1, "Bed name/number is required.") })

export default function ManagePgPage() {
  const router = useRouter()
  const params = useParams()
  const { pgs, updatePg, guests } = useData()
  const pgId = params.pgId as string

  const [isAddFloorDialogOpen, setIsAddFloorDialogOpen] = useState(false)
  const [isAddRoomDialogOpen, setIsAddRoomDialogOpen] = useState(false)
  const [isAddBedDialogOpen, setIsAddBedDialogOpen] = useState(false)
  
  const [selectedFloorForRoomAdd, setSelectedFloorForRoomAdd] = useState<string | null>(null)
  const [selectedRoomForBedAdd, setSelectedRoomForBedAdd] = useState<{ floorId: string; roomId: string } | null>(null)

  const floorForm = useForm<z.infer<typeof floorSchema>>({ resolver: zodResolver(floorSchema) })
  const roomForm = useForm<z.infer<typeof roomSchema>>({ resolver: zodResolver(roomSchema) })
  const bedForm = useForm<z.infer<typeof bedSchema>>({ resolver: zodResolver(bedSchema) })
  
  const pg = useMemo(() => pgs.find(p => p.id === pgId), [pgs, pgId])

  if (!pg) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <Building className="mx-auto h-16 w-16 text-muted-foreground" />
        <h2 className="mt-6 text-2xl font-semibold">PG Not Found</h2>
        <p className="mt-2 text-muted-foreground max-w-md">The PG you are looking for does not exist or has been removed.</p>
        <Button asChild className="mt-6">
          <Link href="/dashboard/pg-management">Go Back to PG List</Link>
        </Button>
      </div>
    )
  }
  
  const handleAddFloorSubmit = (values: z.infer<typeof floorSchema>) => {
    const newFloor: Floor = {
      id: `floor-${new Date().getTime()}`,
      name: values.name,
      rooms: [],
    }
    const nextState = produce(pg, draft => {
        if (!draft.floors) draft.floors = [];
        draft.floors.push(newFloor)
    })
    updatePg(nextState)
    floorForm.reset({ name: '' })
    setIsAddFloorDialogOpen(false)
  }

  const handleAddRoomSubmit = (values: z.infer<typeof roomSchema>) => {
    if (!selectedFloorForRoomAdd) return
    const newRoom: Room = {
      id: `room-${new Date().getTime()}`,
      name: values.name,
      rent: values.rent,
      deposit: values.deposit,
      beds: [],
    }
    const nextState = produce(pg, draft => {
        const floor = draft.floors?.find(f => f.id === selectedFloorForRoomAdd)
        if (floor) {
            floor.rooms.push(newRoom)
        }
    })
    updatePg(nextState)
    roomForm.reset({ name: '', rent: undefined, deposit: undefined })
    setIsAddRoomDialogOpen(false)
  }
  
  const handleAddBedSubmit = (values: z.infer<typeof bedSchema>) => {
    if (!selectedRoomForBedAdd) return
    const { floorId, roomId } = selectedRoomForBedAdd
    const newBed: Bed = {
      id: `bed-${new Date().getTime()}`,
      name: values.name,
      guestId: null,
    }
    const nextState = produce(pg, draft => {
      const floor = draft.floors?.find(f => f.id === floorId)
      const room = floor?.rooms.find(r => r.id === roomId)
      if (room) {
        room.beds.push(newBed)
        draft.totalBeds = (draft.totalBeds || 0) + 1
      }
    })
    updatePg(nextState)
    bedForm.reset({ name: '' })
    setIsAddBedDialogOpen(false)
  }

  const handleDelete = (type: 'floor' | 'room' | 'bed', ids: { floorId: string; roomId?: string; bedId?: string }) => {
    if (!confirm(`Are you sure you want to delete this ${type}? This action cannot be undone.`)) return

    const nextState = produce(pg, draft => {
        const floorIndex = draft.floors?.findIndex(f => f.id === ids.floorId)
        if (floorIndex === undefined || floorIndex === -1) return

        if (type === 'floor') {
            const floor = draft.floors?.[floorIndex]
            if (floor?.rooms.some(r => r.beds.some(b => b.guestId))) {
                 alert("Cannot delete a floor with occupied rooms.")
                 return
            }
            const bedsInFloor = floor?.rooms.reduce((acc, room) => acc + room.beds.length, 0) || 0;
            draft.totalBeds -= bedsInFloor
            draft.floors?.splice(floorIndex, 1)
        } else if (type === 'room' && ids.roomId) {
            const roomIndex = draft.floors?.[floorIndex].rooms.findIndex(r => r.id === ids.roomId)
            if (roomIndex === undefined || roomIndex === -1) return
            const room = draft.floors?.[floorIndex].rooms[roomIndex]
            if (room?.beds.some(b => b.guestId)) {
                alert("Cannot delete a room with occupied beds.")
                return
            }
            draft.totalBeds -= room?.beds.length || 0
            draft.floors?.[floorIndex].rooms.splice(roomIndex, 1)
        } else if (type === 'bed' && ids.roomId && ids.bedId) {
            const room = draft.floors?.[floorIndex].rooms.find(r => r.id === ids.roomId)
            const bedIndex = room?.beds.findIndex(b => b.id === ids.bedId)
            if (bedIndex === undefined || bedIndex === -1) return
            if (room?.beds[bedIndex].guestId) {
                alert("Cannot delete an occupied bed.")
                return
            }
            room?.beds.splice(bedIndex, 1)
            draft.totalBeds -= 1
        }
    })
    updatePg(nextState)
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft />
        </Button>
        <div>
          <h1 className="text-3xl font-bold font-headline">Manage {pg.name}</h1>
          <p className="text-muted-foreground">Configure floors, rooms, and beds for this property.</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex-row justify-between items-center">
          <div>
            <CardTitle>Floors & Rooms</CardTitle>
            <CardDescription>Organize your PG's layout.</CardDescription>
          </div>
          <Button onClick={() => setIsAddFloorDialogOpen(true)}><PlusCircle className="mr-2" />Add Floor</Button>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="w-full" defaultValue={pg.floors?.map(f => f.id)}>
            {pg.floors?.map(floor => (
              <AccordionItem value={floor.id} key={floor.id}>
                <AccordionTrigger className="text-lg font-medium hover:no-underline">
                  <div className="flex items-center gap-4">
                    <Layers /> {floor.name}
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-500/10 hover:text-red-600" onClick={(e) => { e.stopPropagation(); handleDelete('floor', { floorId: floor.id })}}>
                        <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pl-2 border-l-2 ml-4">
                  <div className="flex justify-end mb-4">
                    <Button variant="outline" size="sm" onClick={() => { setSelectedFloorForRoomAdd(floor.id); setIsAddRoomDialogOpen(true); }}>
                      <PlusCircle className="mr-2 h-4 w-4" /> Add Room to {floor.name}
                    </Button>
                  </div>
                  {floor.rooms.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {floor.rooms.map(room => (
                        <Card key={room.id} className="flex flex-col">
                          <CardHeader className="flex-row items-center justify-between pb-2">
                             <CardTitle className="text-base flex items-center gap-2"><DoorOpen className="w-5 h-5" />{room.name}</CardTitle>
                             <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-500/10 hover:text-red-600" onClick={() => handleDelete('room', { floorId: floor.id, roomId: room.id })}>
                                <Trash2 className="w-4 h-4" />
                            </Button>
                          </CardHeader>
                          <CardContent className="flex-grow">
                             <div className="text-sm text-muted-foreground space-y-1 mb-4">
                                <p><Badge variant="secondary">{room.beds.length}-Sharing</Badge></p>
                                <p className="flex items-center gap-1"><IndianRupee className="w-4 h-4"/>Rent: {room.rent.toLocaleString('en-IN')}</p>
                                <p className="flex items-center gap-1"><IndianRupee className="w-4 h-4"/>Deposit: {room.deposit.toLocaleString('en-IN')}</p>
                            </div>
                            <h4 className="font-semibold mb-2 text-sm">Beds</h4>
                            <div className="flex flex-col gap-2">
                                {room.beds.map(bed => (
                                    <div key={bed.id} className="flex justify-between items-center text-sm p-2 rounded-md bg-muted/50">
                                        <div className="flex items-center gap-2">
                                            <BedDouble className="w-4 h-4" />
                                            <span>Bed {bed.name}</span>
                                            {bed.guestId && <Badge variant="outline">{guests.find(g => g.id === bed.guestId)?.name || 'Occupied'}</Badge>}
                                        </div>
                                         <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:bg-red-500/10 hover:text-red-600" onClick={() => handleDelete('bed', { floorId: floor.id, roomId: room.id, bedId: bed.id })}>
                                            <Trash2 className="w-3 h-3" />
                                        </Button>
                                    </div>
                                ))}
                                {room.beds.length === 0 && <p className="text-xs text-muted-foreground">No beds added yet.</p>}
                            </div>
                          </CardContent>
                          <CardFooter>
                             <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => { setSelectedRoomForBedAdd({ floorId: floor.id, roomId: room.id }); setIsAddBedDialogOpen(true); }}>
                                <PlusCircle className="mr-2 h-4 w-4" />Add Bed
                            </Button>
                          </CardFooter>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">No rooms in this floor yet.</div>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
             {pg.floors?.length === 0 && (
                <div className="text-center py-10 text-muted-foreground">No floors configured yet. Click "Add Floor" to start.</div>
            )}
          </Accordion>
        </CardContent>
      </Card>
      
      {/* Add Floor Dialog */}
      <Dialog open={isAddFloorDialogOpen} onOpenChange={setIsAddFloorDialogOpen}>
        <DialogContent><DialogHeader><DialogTitle>Add New Floor</DialogTitle></DialogHeader>
          <Form {...floorForm}>
            <form onSubmit={floorForm.handleSubmit(handleAddFloorSubmit)} id="add-floor-form" className="space-y-4">
              <FormField control={floorForm.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Floor Name</FormLabel><FormControl><Input placeholder="e.g., First Floor" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </form>
          </Form>
          <DialogFooter><DialogClose asChild><Button variant="secondary">Cancel</Button></DialogClose><Button type="submit" form="add-floor-form">Add Floor</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add Room Dialog */}
      <Dialog open={isAddRoomDialogOpen} onOpenChange={setIsAddRoomDialogOpen}>
        <DialogContent><DialogHeader><DialogTitle>Add New Room</DialogTitle></DialogHeader>
          <Form {...roomForm}>
            <form onSubmit={roomForm.handleSubmit(handleAddRoomSubmit)} id="add-room-form" className="space-y-4">
              <FormField control={roomForm.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Room Name / Number</FormLabel><FormControl><Input placeholder="e.g., Room 101" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={roomForm.control} name="rent" render={({ field }) => (
                <FormItem><FormLabel>Monthly Rent</FormLabel><FormControl><Input type="number" placeholder="e.g., 8000" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={roomForm.control} name="deposit" render={({ field }) => (
                <FormItem><FormLabel>Security Deposit</FormLabel><FormControl><Input type="number" placeholder="e.g., 16000" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </form>
          </Form>
          <DialogFooter><DialogClose asChild><Button variant="secondary">Cancel</Button></DialogClose><Button type="submit" form="add-room-form">Add Room</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Bed Dialog */}
       <Dialog open={isAddBedDialogOpen} onOpenChange={setIsAddBedDialogOpen}>
        <DialogContent><DialogHeader><DialogTitle>Add New Bed</DialogTitle></DialogHeader>
          <Form {...bedForm}>
            <form onSubmit={bedForm.handleSubmit(handleAddBedSubmit)} id="add-bed-form" className="space-y-4">
              <FormField control={bedForm.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Bed Name / Number</FormLabel><FormControl><Input placeholder="e.g., A, B, 1, 2..." {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </form>
          </Form>
          <DialogFooter><DialogClose asChild><Button variant="secondary">Cancel</Button></DialogClose><Button type="submit" form="add-bed-form">Add Bed</Button></DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
