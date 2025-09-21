
'use client'

import { useState, useMemo } from 'react'
import { useAppSelector } from '@/lib/hooks'
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { UserPlus, Wallet, BellRing, Send, Search, Loader2 } from "lucide-react"
import type { PG, Room, Bed, Guest } from '@/lib/types'
import { Input } from '../ui/input'

const AddGuestDialog = ({ beds, onSelectBed, open, onOpenChange }: { beds: {pg: PG, room: Room, bed: Bed}[], onSelectBed: (bed: { pg: PG, room: Room, bed: Bed }) => void, open: boolean, onOpenChange: (open: boolean) => void }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const filteredBeds = useMemo(() => {
        if (!searchTerm) return beds;
        return beds.filter(({ pg, room, bed }) => 
            pg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            bed.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [beds, searchTerm]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Add Guest to a Bed</DialogTitle>
                    <DialogDescription>Search for a vacant bed across all your properties.</DialogDescription>
                </DialogHeader>
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search by property, room, or bed..." className="pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <ScrollArea className="h-64 mt-4">
                    <div className="space-y-2">
                        {filteredBeds.map(item => (
                            <div key={item.bed.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted cursor-pointer" onClick={() => { onSelectBed(item); onOpenChange(false); }}>
                                <div>
                                    <p className="font-semibold">{item.pg.name}</p>
                                    <p className="text-sm text-muted-foreground">Room {item.room.name} - Bed {item.bed.name}</p>
                                </div>
                            </div>
                        ))}
                         {filteredBeds.length === 0 && <p className="text-center text-sm text-muted-foreground pt-4">No vacant beds found.</p>}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    )
}

const CollectRentDialog = ({ guests, onSelectGuest, open, onOpenChange }: { guests: Guest[], onSelectGuest: (guest: Guest) => void, open: boolean, onOpenChange: (open: boolean) => void }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const guestsWithDues = useMemo(() => {
        const guestsWithDues = guests.filter(g => !g.isVacated && (g.rentStatus === 'unpaid' || g.rentStatus === 'partial'));
        if (!searchTerm) return guestsWithDues;
        return guestsWithDues.filter(g => 
            g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            g.pgName.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [guests, searchTerm]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Collect Rent</DialogTitle>
                    <DialogDescription>Select a guest with pending dues to record a payment.</DialogDescription>
                </DialogHeader>
                 <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search by guest name or property..." className="pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <ScrollArea className="h-64 mt-4">
                    <div className="space-y-2">
                        {guestsWithDues.map(guest => (
                             <div key={guest.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted cursor-pointer" onClick={() => { onSelectGuest(guest); onOpenChange(false); }}>
                                <div>
                                    <p className="font-semibold">{guest.name}</p>
                                    <p className="text-sm text-muted-foreground">{guest.pgName}</p>
                                </div>
                                 <p className="text-sm font-semibold text-destructive">₹{(guest.rentAmount + (guest.balanceBroughtForward || 0) - (guest.rentPaidAmount || 0)).toLocaleString('en-IN')}</p>
                            </div>
                        ))}
                         {guestsWithDues.length === 0 && <p className="text-center text-sm text-muted-foreground pt-4">No guests with pending dues.</p>}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    )
}

export default function QuickActions ({ pgs, guests, handleOpenAddGuestDialog, handleOpenPaymentDialog, onSendMassReminder, isSendingReminders, onSendAnnouncement }: any) {
    const [isAddGuestOpen, setIsAddGuestOpen] = useState(false);
    const [isCollectRentOpen, setIsCollectRentOpen] = useState(false);

    const availableBeds = useMemo(() => {
        const beds: { pg: PG, room: Room, bed: Bed }[] = [];
        pgs.forEach((pg: PG) => {
            pg.floors?.forEach(floor => {
                floor.rooms.forEach(room => {
                    room.beds.forEach(bed => {
                        if (!guests.some(g => g.bedId === bed.id && !g.isVacated)) {
                            beds.push({ pg, room, bed });
                        }
                    });
                });
            });
        });
        return beds;
    }, [pgs, guests]);

    const handleSelectBedForGuestAdd = (item: {pg: PG, room: Room, bed: Bed}) => {
        handleOpenAddGuestDialog(item.bed, item.room, item.pg);
    }

    const handleSelectGuestForPayment = (guest: Guest) => {
        handleOpenPaymentDialog(guest);
    }

    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
             <Button variant="outline" onClick={() => setIsAddGuestOpen(true)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Add Guest
            </Button>

            <Button variant="outline" onClick={() => setIsCollectRentOpen(true)}>
                <Wallet className="w-4 h-4 mr-2" />
                Collect Rent
            </Button>

            <Button variant="outline" onClick={onSendMassReminder} disabled={isSendingReminders}>
                {isSendingReminders ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <BellRing className="w-4 h-4 mr-2" />}
                Send Reminders
            </Button>

            <Button variant="outline" onClick={onSendAnnouncement}>
                <Send className="w-4 h-4 mr-2" />
                Announce
            </Button>
            <AddGuestDialog beds={availableBeds} onSelectBed={handleSelectBedForGuestAdd} open={isAddGuestOpen} onOpenChange={setIsAddGuestOpen} />
            <CollectRentDialog guests={guests} onSelectGuest={handleSelectGuestForPayment} open={isCollectRentOpen} onOpenChange={setIsCollectRentOpen} />
        </div>
    );
};
