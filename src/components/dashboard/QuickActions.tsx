
'use client'

import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAppSelector } from '@/lib/hooks'
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from '@/components/ui/badge'
import { UserPlus, Wallet, BellRing, Send, Search, Loader2 } from "lucide-react"
import type { PG, Room, Bed, Guest } from '@/lib/types'
import { Input } from '../ui/input'
import { useToast } from '@/hooks/use-toast'
import { auth } from '@/lib/firebase'

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

export default function QuickActions ({ handleOpenAddGuestDialog, handleOpenPaymentDialog }: any) {
    const { pgs, guests } = useAppSelector(state => ({
        pgs: state.pgs.pgs,
        guests: state.guests.guests,
    }));
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
    const [isSendingReminders, startReminderTransition] = useTransition();
    const { toast } = useToast();

    const handleSelectGuestForPayment = (guest: Guest) => {
        handleOpenPaymentDialog(guest);
    }
    
    const handleSendMassReminder = async () => {
        const pendingGuests = guests.filter(g => !g.isVacated && (g.rentStatus === 'unpaid' || g.rentStatus === 'partial'));
        if (pendingGuests.length === 0) {
            toast({ title: 'All Clear!', description: 'No pending rent reminders to send.' });
            return;
        }
      
        startReminderTransition(async () => {
            toast({ title: 'Sending Reminders...', description: `Sending ${pendingGuests.length} rent reminders.` });
            const user = auth.currentUser;
            if (!user) {
                toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to send reminders.'});
                return;
            }

            try {
                const token = await user.getIdToken();
                
                const response = await fetch('/api/reminders/send-all', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                });

                if (!response.ok) {
                    // Try to get a specific error message, otherwise show a generic one
                    let errorMsg = 'Failed to send reminders due to a server issue.';
                    try {
                        const errorResult = await response.json();
                        errorMsg = errorResult.error || errorMsg;
                    } catch (e) {
                        // The response was not JSON, which is the case for a 500 error page.
                        errorMsg = `Server error (${response.status}). Please check server logs.`;
                    }
                    throw new Error(errorMsg);
                }

                const result = await response.json();
                if(result.success) {
                    toast({ title: 'Reminders Sent!', description: `Successfully sent ${result.sentCount} reminders.` });
                } else {
                    throw new Error(result.error || 'An unknown error occurred.');
                }
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Error', description: error.message });
            }
        });
    }

  const handleSendAnnouncement = () => {
    toast({ title: "Feature Coming Soon", description: "A dialog to send announcements to all guests will be implemented here."})
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

            <Button variant="outline" onClick={handleSendMassReminder} disabled={isSendingReminders}>
                {isSendingReminders ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <BellRing className="w-4 h-4 mr-2" />}
                Reminders
            </Button>

            <Button variant="outline" onClick={handleSendAnnouncement}>
                <Send className="w-4 h-4 mr-2" />
                Announce
            </Button>
            <CollectRentDialog guests={guests} onSelectGuest={handleSelectGuestForPayment} open={isCollectRentOpen} onOpenChange={setIsCollectRentOpen} />
        </div>
    );
};
