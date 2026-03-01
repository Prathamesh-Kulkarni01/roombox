

'use client'

import { useState, useMemo, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAppDispatch, useAppSelector } from '@/lib/hooks'
import Link from 'next/link'
import { produce } from "immer"
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import RoomDialog from '@/components/dashboard/dialogs/RoomDialog'

import { Building, Layers, DoorOpen, BedDouble, PlusCircle, IndianRupee, Trash2, ArrowLeft, Pencil } from 'lucide-react'
import type { PG, Floor, Room, Bed } from '@/lib/types'
import { updatePg as updatePgAction } from '@/lib/slices/pgsSlice'
import { useDashboard } from '@/hooks/use-dashboard'
import { canAccess } from '@/lib/permissions';


const floorSchema = z.object({ name: z.string().min(2, "Floor name must be at least 2 characters.") })
const bedSchema = z.object({ name: z.string().min(1, "Bed name/number is required.") })

export default function ManagePgPage() {
  const router = useRouter()
  const params = useParams()
  const dispatch = useAppDispatch()
  const { pgs } = useAppSelector(state => state.pgs)
  const { guests } = useAppSelector(state => state.guests)
  const { currentUser, currentPlan } = useAppSelector(state => state.user)
  const { featurePermissions } = useAppSelector(state => state.permissions);
  const pgId = params.pgId as string
  const { toast } = useToast()

  const [isEditMode, setIsEditMode] = useState(false)
  
  const {
      isRoomDialogOpen, setIsRoomDialogOpen, roomToEdit,
      isFloorDialogOpen, setIsFloorDialogOpen, floorToEdit,
      isBedDialogOpen, setIsBedDialogOpen, bedToEdit,
      roomForm, floorForm, bedForm,
      handleRoomSubmit, handleFloorSubmit, handleBedSubmit,
      handleOpenRoomDialog, handleOpenFloorDialog, handleOpenBedDialog,
      handleDelete,
      isSavingRoom
  } = useDashboard({ pgs, guests });

  const pg = useMemo(() => pgs.find(p => p.id === pgId), [pgs, pgId])
  const canAdd = canAccess(featurePermissions, currentUser?.role, 'properties', 'add');
  const canEdit = canAccess(featurePermissions, currentUser?.role, 'properties', 'edit');
  const canDelete = canAccess(featurePermissions, currentUser?.role, 'properties', 'delete');
  const canEditProperty = canEdit;
  
  const permissions = useMemo(() => {
    if (!featurePermissions || !currentUser) return null;
    return featurePermissions.properties;
  }, [featurePermissions, currentUser]);

  const canAddFloor = useMemo(() => {
      if (!pg || !currentPlan || !permissions?.add) return false;
      return currentPlan.floorLimit === 'unlimited' || (pg.floors?.length || 0) < currentPlan.floorLimit;
  }, [pg, currentPlan, permissions]);
  
  if (!pg) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <Building className="mx-auto h-16 w-16 text-muted-foreground" />
        <h2 className="mt-6 text-2xl font-semibold">Property Not Found</h2>
        <p className="mt-2 text-muted-foreground max-w-md">The property you are looking for does not exist or has been removed.</p>
        <Button asChild className="mt-6">
          <Link href="/dashboard/pg-management">Go Back to Property List</Link>
        </Button>
      </div>
    )
  }

  const openAddFloor = () => {
    if (!canAddFloor) {
        toast({ variant: 'destructive', title: 'Floor Limit Reached', description: 'Please upgrade your plan to add more floors.'});
        return;
    }
    handleOpenFloorDialog(null, pg);
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.push('/dashboard')}>
            <ArrowLeft />
            </Button>
            <h1 className="text-2xl font-bold">{pg.name} Layout</h1>
        </div>
        {canEditProperty && (
          <div className="flex items-center space-x-2">
              <Label htmlFor="edit-mode" className="font-medium">Edit Mode</Label>
              <Switch id="edit-mode" checked={isEditMode} onCheckedChange={setIsEditMode} />
          </div>
        )}
      </div>

      <Card>
        <CardContent className="p-4 md:p-6">
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
                                        {canEdit && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenRoomDialog(room)}> <Pencil className="w-4 h-4" /> </Button>}
                                        {canDelete && <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-500/10 hover:text-red-600" onClick={() => handleDelete('room', { floorId: floor.id, roomId: room.id, pgId: pg.id })}> <Trash2 className="w-4 h-4" /> </Button>}
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
                                                    {canEdit && <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleOpenBedDialog(bed, room.id, floor.id)}> <Pencil className="w-3 h-3" /> </Button>}
                                                     {canDelete && <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:bg-red-500/10 hover:text-red-600" onClick={() => handleDelete('bed', { floorId: floor.id, roomId: room.id, bedId: bed.id, pgId: pg.id })}> <Trash2 className="w-3 h-3" /> </Button>}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {isEditMode && canAdd && (
                                        <button onClick={() => handleOpenBedDialog(null, room.id, floor.id)} className="w-full mt-2 flex justify-center items-center p-1.5 rounded-md border-2 border-dashed hover:bg-muted text-sm">
                                            <PlusCircle className="w-3.5 h-3.5 mr-2" /> Add Bed
                                        </button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    {isEditMode && canAdd && (
                        <button onClick={() => handleOpenRoomDialog(null, floor.id, pg.id)} className="min-h-[200px] h-full w-full flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                            <PlusCircle className="w-8 h-8 mb-2" />
                            <span className="font-medium">Add New Room</span>
                        </button>
                    )}
                  </div>
                  {floor.rooms.length === 0 && !isEditMode && (
                    <div className="text-center py-8 text-muted-foreground">No rooms in this floor yet. Enable Edit Mode to add one.</div>
                  )}
                  {isEditMode && (
                    <div className="mt-6 flex items-center gap-4">
                        {canDelete && (
                            <Button variant="ghost" className="text-red-600 hover:text-red-600 hover:bg-red-500/10" onClick={(e) => { e.stopPropagation(); handleDelete('floor', { floorId: floor.id, pgId: pg.id }) }}>
                                <Trash2 className="mr-2 h-4 w-4" /> Delete Floor
                            </Button>
                        )}
                        {canEdit && (
                            <Button variant="ghost" onClick={(e) => { e.stopPropagation(); handleOpenFloorDialog(floor) }}>
                                <Pencil className="mr-2 h-4 w-4" /> Edit Floor Name
                            </Button>
                        )}
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          {isEditMode && permissions?.add && (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="inline-block mt-6 w-full">
                            <button onClick={openAddFloor} disabled={!canAddFloor} className="w-full flex items-center justify-center p-4 border-2 border-dashed rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:bg-muted/50 disabled:cursor-not-allowed">
                                <PlusCircle className="mr-2 h-5 w-5" />
                                <span className="font-medium">Add New Floor</span>
                            </button>
                        </div>
                    </TooltipTrigger>
                    {!canAddFloor && <TooltipContent><p>Upgrade your plan to add more floors.</p></TooltipContent>}
                </Tooltip>
            </TooltipProvider>
          )}
          {(pg.floors?.length || 0) === 0 && !isEditMode && (
            <div className="text-center py-10 text-muted-foreground">No floors configured yet. Enable Edit Mode to start.</div>
          )}
        </CardContent>
      </Card>
      
      {/* DIALOGS */}
      <RoomDialog {...{ isRoomDialogOpen, setIsRoomDialogOpen, roomToEdit, roomForm, handleRoomSubmit, isSavingRoom }} />
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
    </div>
  )
}
