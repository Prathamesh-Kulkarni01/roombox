

'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAppSelector } from '@/lib/hooks'
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from '@/components/ui/badge'
import { UserPlus, Wallet, BellRing, Send, Search } from "lucide-react"
import type { PG, Room, Bed, Guest } from '@/lib/types'
import { Input } from '../ui/input'
import { useToast } from '@/hooks/use-toast'

const CollectRentDialog = ({ guests, onSelectGuest, open, onOpenChange }: { guests: Guest[], onSelectGuest: (guest: Guest) => void, open: boolean, onOpenChange: (open: boolean) => void }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const filteredGuests = useMemo(() => {
        if (!searchTerm) return guests.filter(g => !g.isVacated && (g.rentStatus === 'unpaid' || g.rentStatus === 'partial'));
        return guests.filter(g => 
            !g.isVacated && (g.rentStatus === 'unpaid' || g.rentStatus === 'partial') && (
                g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                g.pgName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                g.bedId.toLowerCase().includes(searchTerm.toLowerCase())
            )
        );
    }, [guests, searchTerm]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Collect Rent</DialogTitle>
                    <DialogDescription>Search for a guest with pending dues.</DialogDescription>
                </DialogHeader>
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search by name, property, room..." className="pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <ScrollArea className="h-64 mt-4">
                    <div className="space-y-2">
                        {filteredGuests.map(guest => (
                            <div key={guest.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted cursor-pointer" onClick={() => { onSelectGuest(guest); onOpenChange(false); }}>
                                <div>
                                    <p className="font-semibold">{guest.name}</p>
                                    <p className="text-sm text-muted-foreground">{guest.pgName} - Bed {guest.bedId}</p>
                                </div>
                                <Badge variant={guest.rentStatus === 'paid' ? 'default' : 'destructive'}>{guest.rentStatus}</Badge>
                            </div>
                        ))}
                         {filteredGuests.length === 0 && <p className="text-center text-sm text-muted-foreground pt-4">No guests with pending dues.</p>}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    )
}

export default function QuickActions ({ pgs, guests, handleOpenAddGuestDialog, handleOpenPaymentDialog, onSendMassReminder, onSendAnnouncement }: any) {
    const availableBeds = useMemo(() => {
        const beds: { pg: PG, room: Room, bed: Bed }[] = [];
        pgs.forEach((pg: PG) => {
            pg.floors?.forEach(floor => {
                floor.rooms.forEach(room => {
                    room.beds.forEach(bed => {
                        if (!bed.guestId) {
                            beds.push({ pg, room, bed });
                        }
                    });
                });
            });
        });
        return beds;
    }, [pgs]);

    const [isCollectRentOpen, setIsCollectRentOpen] = useState(false);
    
    const handleSelectGuestForPayment = (guest: Guest) => {
        handleOpenPaymentDialog(guest);
    }

    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                        <UserPlus className="w-4 h-4 mr-2" />
                        Add Guest
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64">
                    <DropdownMenuLabel>Select a Vacant Bed</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <ScrollArea className="h-[200px]">
                        {availableBeds.length > 0 ? availableBeds.map(({ pg, room, bed }) => (
                            <DropdownMenuItem key={bed.id} onClick={() => handleOpenAddGuestDialog(bed, room, pg)}>
                                <span>{pg.name} - {room.name} / Bed {bed.name}</span>
                            </DropdownMenuItem>
                        )) : <DropdownMenuItem disabled>No vacant beds</DropdownMenuItem>}
                    </ScrollArea>
                </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="outline" onClick={() => setIsCollectRentOpen(true)}>
                <Wallet className="w-4 h-4 mr-2" />
                Collect Rent
            </Button>

            <Button variant="outline" onClick={onSendMassReminder}>
                <BellRing className="w-4 h-4 mr-2" />
                Send Reminders
            </Button>

            <Button variant="outline" onClick={onSendAnnouncement}>
                <Send className="w-4 h-4 mr-2" />
                Announce
            </Button>
            <CollectRentDialog guests={guests} onSelectGuest={handleSelectGuestForPayment} open={isCollectRentOpen} onOpenChange={setIsCollectRentOpen} />
        </div>
    );
};
