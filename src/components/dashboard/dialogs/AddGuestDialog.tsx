'use client'

import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import type { UseDashboardReturn } from "@/hooks/use-dashboard"
import { format } from "date-fns"
import { useAppSelector } from '@/lib/hooks'
import { usePermissionsStore } from '@/lib/stores/configStores';
import { canAccess } from '@/lib/permissions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RentCycleUnit } from "@/lib/types"
import { Building2, BedDouble, User, Phone, IndianRupee, Calendar, Ghost, Info, Loader2 } from "lucide-react";
import { useGetPropertiesQuery } from "@/lib/api/apiSlice";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"

type AddGuestDialogProps = Pick<UseDashboardReturn, 'isAddGuestDialogOpen' | 'setIsAddGuestDialogOpen' | 'selectedBedForGuestAdd' | 'addGuestForm' | 'handleAddGuestSubmit' | 'isAddingGuest'>

const rentCycleOptions: { value: RentCycleUnit, label: string }[] = [
  { value: 'minutes', label: 'Minutes (for testing)' },
  { value: 'hours', label: 'Hours' },
  { value: 'days', label: 'Days' },
  { value: 'weeks', label: 'Weeks' },
  { value: 'months', label: 'Months' },
];

export default function AddGuestDialog({ isAddGuestDialogOpen, setIsAddGuestDialogOpen, selectedBedForGuestAdd, addGuestForm, handleAddGuestSubmit, isAddingGuest }: AddGuestDialogProps) {
  const { currentUser } = useAppSelector((state) => state.user);
  const { data: pgsData } = useGetPropertiesQuery(undefined, { skip: !currentUser?.id });
  const pgs = pgsData?.buildings || [];
  const { featurePermissions } = usePermissionsStore();
  const canAddGuest = canAccess(featurePermissions, currentUser?.role, 'guests', 'add');

  // Local state for cascading selection (only used when no pre-selected bed)
  const [selectedPgId, setSelectedPgId] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState('');

  const isManualSelection = !selectedBedForGuestAdd;

  // Rooms available from all floors of selected PG
  const availableRooms = useMemo(() => {
    if (!selectedPgId) return [];
    const pg = pgs.find(p => p.id === selectedPgId);
    if (!pg) return [];
    return (pg.floors || []).flatMap(floor =>
      (floor.rooms || []).map(room => ({ ...room, floorName: floor.name }))
    );
  }, [selectedPgId, pgs]);

  // Available beds in selected room (only vacant ones)
  const availableBeds = useMemo(() => {
    if (!selectedRoomId || !selectedPgId) return [];
    const pg = pgs.find(p => p.id === selectedPgId);
    if (!pg) return [];
    for (const floor of (pg.floors || [])) {
      for (const room of (floor.rooms || [])) {
        if (room.id === selectedRoomId) {
          return (room.beds || []).filter(b => !b.guestId);
        }
      }
    }
    return [];
  }, [selectedRoomId, selectedPgId, pgs]);

  // Auto-populate rent amounts from selected room
  useEffect(() => {
    if (isManualSelection && selectedRoomId && selectedPgId) {
      const pg = pgs.find(p => p.id === selectedPgId);
      for (const floor of (pg?.floors || [])) {
        for (const room of (floor.rooms || [])) {
          if (room.id === selectedRoomId) {
            addGuestForm.setValue('amountType', room.amountType || 'numeric');
            if (room.amountType === 'symbolic') {
              addGuestForm.setValue('symbolicRentValue', room.symbolicRentValue || 'XXX');
              addGuestForm.setValue('symbolicDepositValue', room.symbolicDepositValue || 'YYY');
            } else {
              addGuestForm.setValue('rentAmount', room.rent || 0);
              addGuestForm.setValue('depositAmount', room.deposit || 0);
            }
          }
        }
      }
    }
  }, [selectedRoomId, selectedPgId, isManualSelection, pgs, addGuestForm]);

  // Reset cascade when dialog closes
  useEffect(() => {
    if (!isAddGuestDialogOpen) {
      setSelectedPgId('');
      setSelectedRoomId('');
    } else if (pgs.length === 1 && !selectedPgId) {
      // Auto-select if only one property exists
      handlePgChange(pgs[0].id);
    }
  }, [isAddGuestDialogOpen, pgs, selectedPgId]);

  const handlePgChange = (pgId: string) => {
    setSelectedPgId(pgId);
    setSelectedRoomId('');
    addGuestForm.setValue('pgId', pgId);
    addGuestForm.setValue('roomId', '');
    addGuestForm.setValue('bedId', '');
  };

  const handleRoomChange = (roomId: string) => {
    setSelectedRoomId(roomId);
    addGuestForm.setValue('roomId', roomId);
    addGuestForm.setValue('bedId', '');
  };

  const handleBedChange = (bedId: string) => {
    addGuestForm.setValue('bedId', bedId);
  };

  return (
    <Dialog open={isAddGuestDialogOpen} onOpenChange={setIsAddGuestDialogOpen}>
      <DialogContent className="sm:max-w-lg p-0 flex flex-col max-h-[90dvh]">
        <DialogHeader className="p-6 pb-2 flex-shrink-0">
          <DialogTitle>Onboard New Guest</DialogTitle>
          <DialogDescription>
            {selectedBedForGuestAdd
              ? `Add a new guest to Bed ${selectedBedForGuestAdd.bed.name} in Room ${selectedBedForGuestAdd.room.name} at ${selectedBedForGuestAdd.pg.name}.`
              : 'Select a property, room, and bed for the new guest.'
            }
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 py-2">
          <Form {...addGuestForm}>
            <form onSubmit={addGuestForm.handleSubmit(handleAddGuestSubmit)} className="space-y-4 py-2" id="add-guest-form">

              {/* ── Bed Selection (only when not pre-selected) ── */}
              {isManualSelection && (
                <div className="space-y-3 p-4 rounded-xl border bg-muted/30">
                  <div className="flex items-center gap-2 mb-1">
                    <BedDouble className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold">Select Bed</span>
                  </div>

                  {/* PG picker */}
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Property</label>
                    <Select value={selectedPgId} onValueChange={handlePgChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a property..." />
                      </SelectTrigger>
                      <SelectContent>
                        {pgs.map(pg => (
                          <SelectItem key={pg.id} value={pg.id}>
                            <div className="flex items-center gap-2">
                              <Building2 className="w-3 h-3" />
                              {pg.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Room picker */}
                  {selectedPgId && (
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Room</label>
                      <Select value={selectedRoomId} onValueChange={handleRoomChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a room..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableRooms.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-muted-foreground">No rooms found</div>
                          ) : (
                            availableRooms.map(room => {
                              const vacantBeds = (room.beds || []).filter(b => !b.guestId).length;
                              return (
                                <SelectItem key={room.id} value={room.id} disabled={vacantBeds === 0}>
                                  <div className="flex items-center gap-2">
                                    <span>{room.name}</span>
                                    <span className="text-xs text-muted-foreground">({room.floorName})</span>
                                    {vacantBeds > 0 ? (
                                      <Badge variant="outline" className="text-[10px] h-4 border-green-300 text-green-700">{vacantBeds} vacant</Badge>
                                    ) : (
                                      <Badge variant="outline" className="text-[10px] h-4 border-red-200 text-red-500">full</Badge>
                                    )}
                                  </div>
                                </SelectItem>
                              );
                            })
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Bed picker */}
                  {selectedRoomId && (
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Bed</label>
                      {availableBeds.length === 0 ? (
                        <div className="text-sm text-destructive p-2 rounded-lg bg-destructive/5 border border-destructive/20">
                          ⚠️ No vacant beds in this room.
                        </div>
                      ) : (
                        <Select onValueChange={handleBedChange} defaultValue="">
                          <SelectTrigger>
                            <SelectValue placeholder="Select a bed..." />
                          </SelectTrigger>
                          <SelectContent>
                            {availableBeds.map(bed => (
                              <SelectItem key={bed.id} value={bed.id}>
                                <div className="flex items-center gap-2">
                                  <BedDouble className="w-3 h-3" />
                                  {bed.name}
                                  <Badge variant="outline" className="text-[10px] h-4 border-green-300 text-green-700">Vacant</Badge>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── Guest Details ── */}
              <FormField control={addGuestForm.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="e.g., Priya Sharma" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={addGuestForm.control} name="phone" render={({ field }) => (
                  <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input placeholder="e.g., 9876543210" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={addGuestForm.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>Email Address (Optional)</FormLabel><FormControl><Input type="email" placeholder="e.g., priya@example.com" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={addGuestForm.control} name="amountType" render={({ field }) => (
                <FormItem className="flex flex-col gap-2 p-4 rounded-2xl bg-muted/30 border border-primary/5">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <FormLabel className="flex items-center gap-2 text-base font-bold">
                        <Ghost className="w-4 h-4 text-purple-600" />
                        Ghost Mode
                      </FormLabel>
                      <p className="text-[11px] text-muted-foreground leading-tight max-w-[200px]">
                        Hide actual money amounts and use custom symbols like XXX or UNITS.
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value === 'symbolic'}
                        onCheckedChange={(checked) => field.onChange(checked ? 'symbolic' : 'numeric')}
                      />
                    </FormControl>
                  </div>
                  
                  {field.value === 'symbolic' && (
                    <div className="flex items-start gap-2 mt-2 p-2 rounded-lg bg-purple-500/5 border border-purple-500/10 text-[10px] text-purple-700/80 leading-normal">
                      <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span>
                        <strong>Why use this?</strong> If you prefer tracking rent in special units or want to keep financial numbers private from staff/system logs, Ghost Mode is for you.
                      </span>
                    </div>
                  )}
                </FormItem>
              )} />

              {addGuestForm.watch('amountType') === 'numeric' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={addGuestForm.control} name="rentAmount" render={({ field }) => (
                    <FormItem><FormLabel>Monthly Rent</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={addGuestForm.control} name="depositAmount" render={({ field }) => (
                    <FormItem><FormLabel>Security Deposit (Optional)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={addGuestForm.control} name="symbolicRentValue" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rent Label (Ghost Mode)</FormLabel>
                      <FormControl><Input placeholder="e.g., XXX" {...field} disabled /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={addGuestForm.control} name="symbolicDepositValue" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deposit Label (Ghost Mode)</FormLabel>
                      <FormControl><Input placeholder="e.g., YYY" {...field} disabled /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <FormField control={addGuestForm.control} name="rentCycleUnit" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rent Cycle Unit</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {rentCycleOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={addGuestForm.control} name="rentCycleValue" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cycle Duration</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={addGuestForm.control} name="moveInDate" render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Move-in Date</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      value={field.value ? format(new Date(field.value), 'yyyy-MM-dd') : ''}
                      onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </form>
          </Form>
        </div>
        <DialogFooter className="p-6 pt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2 border-t flex-shrink-0">
          <DialogClose asChild><Button type="button" variant="secondary" className="w-full sm:w-auto" disabled={isAddingGuest}>Cancel</Button></DialogClose>
          <Button type="submit" form="add-guest-form" className="w-full sm:w-auto" disabled={!canAddGuest || isAddingGuest}>
            {isAddingGuest && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add Guest
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
