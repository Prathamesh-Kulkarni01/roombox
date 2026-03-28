'use client'

import { useState, useMemo, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { useAppSelector } from '@/lib/hooks'
import { Checkbox } from "@/components/ui/checkbox"
import type { Guest, PG, Room, Bed } from '@/lib/types'
import { Loader2, ArrowRight, Building, Home, Bed as BedIcon } from "lucide-react"

interface TransferGuestDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  guest: Guest | null
  onTransfer: (values: {
    newPgId: string
    newBedId: string
    newRoomId: string
    newRoomName: string
    newRentAmount?: number
    newDepositAmount?: number
    shouldProrate?: boolean
    prorationAmount?: number
  }) => Promise<void>
  isTransferring: boolean
}

export default function TransferGuestDialog({
  isOpen,
  onOpenChange,
  guest,
  onTransfer,
  isTransferring
}: TransferGuestDialogProps) {
  const { pgs } = useAppSelector(state => state.pgs)
  
  const [selectedPgId, setSelectedPgId] = useState<string>('')
  const [selectedRoomId, setSelectedRoomId] = useState<string>('')
  const [selectedBedId, setSelectedBedId] = useState<string>('')
  const [rentAmount, setRentAmount] = useState<number>(0)
  const [depositAmount, setDepositAmount] = useState<number>(0)
  const [shouldProrate, setShouldProrate] = useState<boolean>(false)

  const selectedPg = useMemo(() => pgs.find(p => p.id === selectedPgId), [pgs, selectedPgId])
  
  const rooms = useMemo(() => {
    if (!selectedPg || !selectedPg.floors) return []
    const allRooms: Room[] = []
    selectedPg.floors.forEach(floor => {
        if (floor.rooms) allRooms.push(...floor.rooms)
    })
    return allRooms
  }, [selectedPg])

  const selectedRoom = useMemo(() => rooms.find(r => r.id === selectedRoomId), [rooms, selectedRoomId])

  const beds = useMemo(() => {
    if (!selectedRoom) return []
    return selectedRoom.beds.filter(b => b.guestId === null || b.id === guest?.bedId)
  }, [selectedRoom, guest])
  
  const prorationInfo = useMemo(() => {
    if (!guest || !rentAmount || rentAmount === guest.rentAmount) return null;
    
    const now = new Date();
    const totalDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const currentDay = now.getDate();
    const daysRemaining = totalDays - currentDay + 1;
    
    // Calculate delta for remaining days
    const rentDiff = rentAmount - guest.rentAmount;
    const amount = Math.round((rentDiff * daysRemaining) / totalDays);
    
    return {
        amount,
        daysRemaining,
        totalDays
    };
  }, [guest, rentAmount]);

  // Reset dependent fields when parent selection changes
  useEffect(() => {
    if (guest && isOpen) {
        setSelectedPgId(guest.pgId || '')
        setSelectedRoomId(guest.roomId || '')
        setSelectedBedId(guest.bedId || '')
        setRentAmount(guest.rentAmount || 0)
        setDepositAmount(guest.depositAmount || 0)
        setShouldProrate(false)
    }
  }, [guest, isOpen])

  const handlePgChange = (id: string) => {
    setSelectedPgId(id)
    setSelectedRoomId('')
    setSelectedBedId('')
  }

  const handleRoomChange = (id: string) => {
    setSelectedRoomId(id)
    setSelectedBedId('')
    const room = rooms.find(r => r.id === id)
    if (room) {
        setRentAmount(room.rent)
        setDepositAmount(room.deposit)
    }
  }

  const handleSubmit = async () => {
    if (!selectedPgId || !selectedRoomId || !selectedBedId || !selectedRoom) return

    await onTransfer({
      newPgId: selectedPgId,
      newRoomId: selectedRoomId,
      newBedId: selectedBedId,
      newRoomName: selectedRoom.name,
      newRentAmount: rentAmount,
      newDepositAmount: depositAmount,
      shouldProrate: shouldProrate,
      prorationAmount: prorationInfo?.amount
    })
  }

  if (!guest) return null

  const currentBalance = guest.balance || 0;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 flex flex-col max-h-[90dvh]">
        <DialogHeader className="p-6 pb-2 flex-shrink-0">
          <DialogTitle>Transfer Guest</DialogTitle>
          <DialogDescription>
            Move <strong>{guest.name}</strong> to a different bed or property.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 pt-0 flex-1 overflow-y-auto">
          {currentBalance > 0 && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg p-3 text-sm space-y-1 mb-4">
                  <p className="font-semibold text-amber-800 dark:text-amber-400">Outstanding Balance: ₹{currentBalance.toLocaleString()}</p>
                  <p className="text-amber-700 dark:text-amber-500 text-xs">
                      This debt from {guest.pgName} will be automatically carried over to the new property.
                  </p>
              </div>
          )}

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <Building className="w-3 h-3" /> Property
              </Label>
              <Select value={selectedPgId} onValueChange={handlePgChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select PG" />
                </SelectTrigger>
                <SelectContent>
                  {pgs.map(pg => (
                    <SelectItem key={pg.id} value={pg.id}>{pg.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <Home className="w-3 h-3" /> Room
                  </Label>
                  <Select 
                  value={selectedRoomId} 
                  onValueChange={handleRoomChange}
                  disabled={!selectedPgId}
                  >
                  <SelectTrigger>
                      <SelectValue placeholder="Select Room" />
                  </SelectTrigger>
                  <SelectContent>
                      {rooms.map(room => (
                      <SelectItem key={room.id} value={room.id}>
                          Room {room.name}
                      </SelectItem>
                      ))}
                  </SelectContent>
                  </Select>
              </div>

              <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <BedIcon className="w-3 h-3" /> Bed
                  </Label>
                  <Select 
                  value={selectedBedId} 
                  onValueChange={setSelectedBedId}
                  disabled={!selectedRoomId}
                  >
                  <SelectTrigger>
                      <SelectValue placeholder="Select Bed" />
                  </SelectTrigger>
                  <SelectContent>
                      {beds.length === 0 ? (
                          <SelectItem value="none" disabled>No beds available</SelectItem>
                      ) : (
                          beds.map(bed => (
                              <SelectItem key={bed.id} value={bed.id}>
                                  {bed.name} {bed.id === guest.bedId ? '(Current)' : ''}
                              </SelectItem>
                          ))
                      )}
                  </SelectContent>
                  </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                  <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">New Monthly Rent</Label>
                  <Input 
                  type="number" 
                  value={rentAmount} 
                  onChange={(e) => setRentAmount(Number(e.target.value))}
                  placeholder="Rent"
                  />
              </div>
              <div className="space-y-2">
                  <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">New Security Deposit</Label>
                  <Input 
                  type="number" 
                  value={depositAmount} 
                  onChange={(e) => setDepositAmount(Number(e.target.value))}
                  placeholder="Deposit"
                  />
              </div>
            </div>

            {prorationInfo && (
              <div className="p-3 bg-primary/5 rounded-lg border border-primary/10 space-y-3">
                <div className="flex items-start gap-3">
                  <Checkbox 
                    id="prorate" 
                    checked={shouldProrate}
                    onCheckedChange={(checked) => setShouldProrate(!!checked)}
                    className="mt-1"
                  />
                  <div className="space-y-1">
                    <Label htmlFor="prorate" className="text-sm font-medium leading-none cursor-pointer">
                      Apply mid-month rent adjustment
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Charge/Credit the difference for the remaining {prorationInfo.daysRemaining} days (out of {prorationInfo.totalDays}) of this month.
                    </p>
                  </div>
                </div>
                
                {shouldProrate && (
                  <div className="flex justify-between items-center text-sm pt-2 border-t border-primary/10">
                    <span className="text-muted-foreground">Calculated Adjustment:</span>
                    <span className={`font-bold ${prorationInfo.amount >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                      {prorationInfo.amount >= 0 ? '+' : ''}₹{Math.abs(prorationInfo.amount)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="p-6 pt-2 border-t flex-shrink-0 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
            <DialogClose asChild>
                <Button variant="outline" className="w-full sm:w-auto">Cancel</Button>
            </DialogClose>
            <Button 
            onClick={handleSubmit} 
            disabled={!selectedBedId || isTransferring || (selectedBedId === guest.bedId && selectedPgId === guest.pgId && selectedRoomId === guest.roomId && rentAmount === guest.rentAmount && depositAmount === guest.depositAmount && !shouldProrate)}
            className="bg-primary hover:bg-primary/90 w-full sm:w-auto"
            >
            {isTransferring ? (
                <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Transferring...
                </>
            ) : (
                <>
                <ArrowRight className="mr-2 h-4 w-4" />
                Confirm Transfer
                </>
            )}
            </Button>
          </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
