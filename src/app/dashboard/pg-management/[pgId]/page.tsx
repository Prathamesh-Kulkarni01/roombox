
'use client'

import { useState, useMemo, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useData } from '@/context/data-provider'
import Link from 'next/link'
import { produce } from 'immer'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

import { Building, Layers, DoorOpen, BedDouble, PlusCircle, IndianRupee, Trash2, ArrowLeft, Pencil } from 'lucide-react'
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

  const [isEditMode, setIsEditMode] = useState(false)

  const [isFloorDialogOpen, setIsFloorDialogOpen] = useState(false)
  const [isRoomDialogOpen, setIsRoomDialogOpen] = useState(false)
  const [isBedDialogOpen, setIsBedDialogOpen] = useState(false)

  const [floorToEdit, setFloorToEdit] = useState<Floor | null>(null)
  const [roomToEdit, setRoomToEdit] = useState<{ room: Room; floorId: string } | null>(null)
  const [bedToEdit, setBedToEdit] = useState<{ bed: Bed; roomId: string; floorId: string } | null>(null)
  
  const [selectedFloorForRoomAdd, setSelectedFloorForRoomAdd] = useState<string | null>(null)
  const [selectedRoomForBedAdd, setSelectedRoomForBedAdd] = useState<{ floorId: string; roomId: string } | null>(null)

  const floorForm = useForm<z.infer<typeof floorSchema>>({ resolver: zodResolver(floorSchema), defaultValues: { name: '' } })
  const roomForm = useForm<z.infer<typeof roomSchema>>({ resolver: zodResolver(roomSchema), defaultValues: { name: '', rent: 0, deposit: 0 } })
  const bedForm = useForm<z.infer<typeof bedSchema>>({ resolver: zodResolver(bedSchema), defaultValues: { name: '' } })
  
  const pg = useMemo(() => pgs.find(p => p.id === pgId), [pgs, pgId])

  useEffect(() => {
    if (floorToEdit) floorForm.reset({ name: floorToEdit.name })
    else floorForm.reset({ name: '' })
  }, [floorToEdit, floorForm])

  useEffect(() => {
    if (roomToEdit) roomForm.reset({ name: roomToEdit.room.name, rent: roomToEdit.room.rent, deposit: roomToEdit.room.deposit })
    else roomForm.reset({ name: '', rent: undefined, deposit: undefined })
  }, [roomToEdit, roomForm])

  useEffect(() => {
    if (bedToEdit) bedForm.reset({ name: bedToEdit.bed.name })
    else bedForm.reset({ name: '' })
  }, [bedToEdit, bedForm])

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
  
  const handleFloorSubmit = (values: z.infer<typeof floorSchema>) => {
    const nextState = produce(pg, draft => {
      if (!draft.floors) draft.floors = [];
      if (floorToEdit) { // Editing existing floor
        const floor = draft.floors.find(f => f.id === floorToEdit.id)
        if (floor) floor.name = values.name
      } else { // Adding new floor
        draft.floors.push({ id: `floor-${new Date().getTime()}`, name: values.name, rooms: [] })
      }
    })
    updatePg(nextState)
    setIsFloorDialogOpen(false)
    setFloorToEdit(null)
  }

  const handleRoomSubmit = (values: z.infer<typeof roomSchema>) => {
    const floorId = roomToEdit?.floorId || selectedFloorForRoomAdd
    if (!floorId) return

    const nextState = produce(pg, draft => {
        const floor = draft.floors?.find(f => f.id === floorId)
        if (!floor) return

        if (roomToEdit) { // Editing existing room
            const room = floor.rooms.find(r => r.id === roomToEdit.room.id)
            if(room) {
                room.name = values.name
                room.rent = values.rent
                room.deposit = values.deposit
            }
        } else { // Adding new room
             floor.rooms.push({ id: `room-${new Date().getTime()}`, name: values.name, rent: values.rent, deposit: values.deposit, beds: [] })
        }
    })
    updatePg(nextState)
    setIsRoomDialogOpen(false)
    setRoomToEdit(null)
    setSelectedFloorForRoomAdd(null)
  }
  
  const handleBedSubmit = (values: z.infer<typeof bedSchema>) => {
    const floorId = bedToEdit?.floorId || selectedRoomForBedAdd?.floorId
    const roomId = bedToEdit?.roomId || selectedRoomForBedAdd?.roomId
    if (!floorId || !roomId) return

    const nextState = produce(pg, draft => {
      const floor = draft.floors?.find(f => f.id === floorId)
      const room = floor?.rooms.find(r => r.id === roomId)
      if (!room) return

      if (bedToEdit) { // Editing existing bed
        const bed = room.beds.find(b => b.id === bedToEdit.bed.id)
        if (bed) bed.name = values.name
      } else { // Adding new bed
        room.beds.push({ id: `bed-${new Date().getTime()}`, name: values.name, guestId: null })
        draft.totalBeds = (draft.totalBeds || 0) + 1
      }
    })
    updatePg(nextState)
    setIsBedDialogOpen(false)
    setBedToEdit(null)
    setSelectedRoomForBedAdd(null)
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

  const openAddFloorDialog = () => { setFloorToEdit(null); setIsFloorDialogOpen(true) }
  const openEditFloorDialog = (floor: Floor) => { setFloorToEdit(floor); setIsFloorDialogOpen(true) }
  const openAddRoomDialog = (floorId: string) => { setRoomToEdit(null); setSelectedFloorForRoomAdd(floorId); setIsRoomDialogOpen(true) }
  const openEditRoomDialog = (room: Room, floorId: string) => { setRoomToEdit({room, floorId}); setIsRoomDialogOpen(true) }
  const openAddBedDialog = (floorId: string, roomId: string) => { setBedToEdit(null); setSelectedRoomForBedAdd({floorId, roomId}); setIsBedDialogOpen(true) }
  const openEditBedDialog = (bed: Bed, roomId: string, floorId: string) => { setBedToEdit({bed, roomId, floorId}); setIsBedDialogOpen(true) }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft />
            </Button>
        </div>
        <div className="flex items-center space-x-2">
            <Label htmlFor="edit-mode" className="font-medium">Edit Mode</Label>
            <Switch id="edit-mode" checked={isEditMode} onCheckedChange={setIsEditMode} />
        </div>
      </div>

      <Card>
        <CardHeader>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="w-full" defaultValue={pg.floors?.map(f => f.id)}>
            {pg.floors?.map(floor => (
              <AccordionItem value={floor.id} key={floor.id}>
                <AccordionTrigger className="text-lg font-medium hover:no-underline">
                  <div className="flex items-center gap-4 w-full">
                    <Layers /> {floor.name}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4">
                  <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${!isEditMode && floor.rooms.length === 0 ? 'hidden': ''}`}>
                    {floor.rooms.map(room => (
                        <Card key={room.id} className="flex flex-col">
                            <CardHeader className="flex-row items-start justify-between pb-2">
                                <CardTitle className="text-base flex items-center gap-2"><DoorOpen className="w-5 h-5" />{room.name}</CardTitle>
                                {isEditMode && (
                                    <div className="flex items-center -mt-2 -mr-2">
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditRoomDialog(room, floor.id)}> <Pencil className="w-4 h-4" /> </Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-500/10 hover:text-red-600" onClick={() => handleDelete('room', { floorId: floor.id, roomId: room.id })}> <Trash2 className="w-4 h-4" /> </Button>
                                    </div>
                                )}
                            </CardHeader>
                            <CardContent className="flex-grow">
                                <div className="text-sm text-muted-foreground space-y-1 mb-4">
                                    <p><Badge variant="secondary">{room.beds.length}-Sharing</Badge></p>
                                    <p className="flex items-center gap-1"><IndianRupee className="w-4 h-4"/>Rent: {(room.rent || 0).toLocaleString('en-IN')}</p>
                                    <p className="flex items-center gap-1"><IndianRupee className="w-4 h-4"/>Deposit: {(room.deposit || 0).toLocaleString('en-IN')}</p>
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
                                            {isEditMode && (
                                                <div className="flex items-center">
                                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditBedDialog(bed, room.id, floor.id)}> <Pencil className="w-3 h-3" /> </Button>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:bg-red-500/10 hover:text-red-600" onClick={() => handleDelete('bed', { floorId: floor.id, roomId: room.id, bedId: bed.id })}> <Trash2 className="w-3 h-3" /> </Button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {isEditMode && (
                                        <button onClick={() => openAddBedDialog(floor.id, room.id)} className="w-full mt-2 flex justify-center items-center p-1.5 rounded-md border-2 border-dashed hover:bg-muted text-sm">
                                            <PlusCircle className="w-3.5 h-3.5 mr-2" /> Add Bed
                                        </button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    {isEditMode && (
                        <button onClick={() => openAddRoomDialog(floor.id)} className="min-h-[200px] h-full w-full flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                            <PlusCircle className="w-8 h-8 mb-2" />
                            <span className="font-medium">Add New Room</span>
                        </button>
                    )}
                  </div>
                  {floor.rooms.length === 0 && !isEditMode && (
                    <div className="text-center py-8 text-muted-foreground">No rooms in this floor yet. Enable Edit Mode to add one.</div>
                  )}
                  <div className="mt-6 flex items-center gap-4">
                    {isEditMode && (
                        <Button variant="ghost" className="text-red-600 hover:text-red-600 hover:bg-red-500/10" onClick={(e) => { e.stopPropagation(); handleDelete('floor', { floorId: floor.id }) }}>
                            <Trash2 className="mr-2 h-4 w-4" /> Delete Floor
                        </Button>
                    )}
                     {isEditMode && (
                        <Button variant="ghost" onClick={(e) => { e.stopPropagation(); openEditFloorDialog(floor) }}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit Floor
                        </Button>
                     )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          {isEditMode && (
             <button onClick={openAddFloorDialog} className="mt-6 w-full flex items-center justify-center p-4 border-2 border-dashed rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                <PlusCircle className="mr-2 h-5 w-5" />
                <span className="font-medium">Add New Floor</span>
            </button>
          )}
          {pg.floors?.length === 0 && !isEditMode && (
            <div className="text-center py-10 text-muted-foreground">No floors configured yet. Enable Edit Mode to start.</div>
          )}
        </CardContent>
      </Card>
      
      {/* Floor Dialog */}
      <Dialog open={isFloorDialogOpen} onOpenChange={setIsFloorDialogOpen}>
        <DialogContent><DialogHeader><DialogTitle>{floorToEdit ? 'Edit Floor' : 'Add New Floor'}</DialogTitle></DialogHeader>
          <Form {...floorForm}>
            <form onSubmit={floorForm.handleSubmit(handleFloorSubmit)} id="floor-form" className="space-y-4">
              <FormField control={floorForm.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Floor Name</FormLabel><FormControl><Input placeholder="e.g., First Floor" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </form>
          </Form>
          <DialogFooter><DialogClose asChild><Button variant="secondary">Cancel</Button></DialogClose><Button type="submit" form="floor-form">{floorToEdit ? 'Save Changes' : 'Add Floor'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Room Dialog */}
      <Dialog open={isRoomDialogOpen} onOpenChange={setIsRoomDialogOpen}>
        <DialogContent><DialogHeader><DialogTitle>{roomToEdit ? 'Edit Room' : 'Add New Room'}</DialogTitle></DialogHeader>
          <Form {...roomForm}>
            <form onSubmit={roomForm.handleSubmit(handleRoomSubmit)} id="room-form" className="space-y-4">
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
          <DialogFooter><DialogClose asChild><Button variant="secondary">Cancel</Button></DialogClose><Button type="submit" form="room-form">{roomToEdit ? 'Save Changes' : 'Add Room'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bed Dialog */}
       <Dialog open={isBedDialogOpen} onOpenChange={setIsBedDialogOpen}>
        <DialogContent><DialogHeader><DialogTitle>{bedToEdit ? 'Edit Bed' : 'Add New Bed'}</DialogTitle></DialogHeader>
          <Form {...bedForm}>
            <form onSubmit={bedForm.handleSubmit(handleBedSubmit)} id="bed-form" className="space-y-4">
              <FormField control={bedForm.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Bed Name / Number</FormLabel><FormControl><Input placeholder="e.g., A, B, 1, 2..." {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </form>
          </Form>
          <DialogFooter><DialogClose asChild><Button variant="secondary">Cancel</Button></DialogClose><Button type="submit" form="bed-form">{bedToEdit ? 'Save Changes' : 'Add Bed'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
