
'use client'

import React, { useState, useMemo, useTransition } from 'react'
import { useAppSelector } from '@/lib/hooks'
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { UserPlus, Wallet, BellRing, Send, Search, Loader2 } from "lucide-react"
import type { PG, Room, Bed, Guest } from '@/lib/types'
import { Input } from '../ui/input'
import { Checkbox } from '../ui/checkbox'
import { Label } from '../ui/label'
import { useToast } from '@/hooks/use-toast'
import { auth } from '@/lib/firebase'
import { cn } from '@/lib/utils'

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

const SendRemindersDialog = ({ guests, open, onOpenChange }: { guests: Guest[], open: boolean, onOpenChange: (open: boolean) => void }) => {
    const { toast } = useToast();
    const [isSending, startSendingTransition] = useTransition();
    const [selectedGuests, setSelectedGuests] = useState<string[]>([]);

    // Reset selection when dialog opens or guests change
    React.useEffect(() => {
        if (open) {
            setSelectedGuests(guests.map(g => g.id));
        }
    }, [open, guests]);

    const handleSelectAll = (checked: boolean) => {
        setSelectedGuests(checked ? guests.map(g => g.id) : []);
    };
    
    const handleSelectGuest = (guestId: string, checked: boolean) => {
        setSelectedGuests(prev => checked ? [...prev, guestId] : prev.filter(id => id !== guestId));
    };

    const handleSend = () => {
        if (selectedGuests.length === 0) {
            toast({ variant: 'destructive', title: 'No Guests Selected', description: 'Please select at least one guest to send reminders to.' });
            return;
        }

        startSendingTransition(async () => {
            toast({ title: 'Sending Reminders...', description: `Sending reminders to ${selectedGuests.length} guest(s).` });
            try {
                const token = await auth.currentUser?.getIdToken();
                const response = await fetch('/api/reminders/send-manual', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ guestIds: selectedGuests }),
                });

                const result = await response.json();
                if (!response.ok) throw new Error(result.error || 'An unknown error occurred.');
                
                toast({ title: 'Reminders Sent!', description: `Successfully queued ${result.sentCount} reminders.` });
                onOpenChange(false);
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Error', description: error.message });
            }
        });
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Send Rent Reminders</DialogTitle>
                    <DialogDescription>Choose which guests with pending dues should receive a reminder.</DialogDescription>
                </DialogHeader>
                {guests.length > 0 ? (
                    <>
                    <div className="flex items-center space-x-2 py-2 border-y">
                        <Checkbox id="select-all" checked={selectedGuests.length === guests.length && guests.length > 0} onCheckedChange={(checked) => handleSelectAll(!!checked)} />
                        <Label htmlFor="select-all">Select All ({selectedGuests.length} / {guests.length})</Label>
                    </div>
                    <ScrollArea className="h-64">
                        <div className="space-y-2">
                            {guests.map(guest => (
                                <div key={guest.id} className="flex items-center space-x-3 p-2 rounded-md">
                                    <Checkbox id={`guest-${guest.id}`} checked={selectedGuests.includes(guest.id)} onCheckedChange={(checked) => handleSelectGuest(guest.id, !!checked)} />
                                    <Label htmlFor={`guest-${guest.id}`} className="flex flex-col cursor-pointer">
                                        <span className="font-semibold">{guest.name}</span>
                                        <span className="text-xs text-muted-foreground">{guest.pgName}</span>
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                    </>
                ) : (
                    <p className="text-center text-sm text-muted-foreground py-10">No guests with pending dues to remind.</p>
                )}
                <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
                    <Button onClick={handleSend} disabled={isSending || selectedGuests.length === 0}>
                        {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                        Send Reminders ({selectedGuests.length})
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}


export default function QuickActions ({ pgs, guests, handleOpenAddGuestDialog, handleOpenPaymentDialog, onSendAnnouncement }: any) {
    const [isAddGuestOpen, setIsAddGuestOpen] = useState(false);
    const [isCollectRentOpen, setIsCollectRentOpen] = useState(false);
    const [isSendRemindersOpen, setIsSendRemindersOpen] = useState(false);

    const availableBeds = useMemo(() => {
        const beds: { pg: PG, room: Room, bed: Bed }[] = [];
        pgs.forEach((pg: PG) => {
            pg.floors?.forEach(floor => {
                floor.rooms.forEach(room => {
                    room.beds.forEach(bed => {
                        if (!guests.some((g: Guest) => g.bedId === bed.id && !g.isVacated)) {
                            beds.push({ pg, room, bed });
                        }
                    });
                });
            });
        });
        return beds;
    }, [pgs, guests]);

    const guestsWithDuesForReminder = useMemo(() => {
        return guests.filter((g: Guest) => !g.isVacated && (g.rentStatus === 'unpaid' || g.rentStatus === 'partial') && g.userId);
    }, [guests]);

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

            <Button variant="outline" onClick={() => setIsSendRemindersOpen(true)}>
                <BellRing className="w-4 h-4 mr-2" />
                Send Reminders
            </Button>

            <Button variant="outline" onClick={onSendAnnouncement}>
                <Send className="w-4 h-4 mr-2" />
                Announce
            </Button>
            <AddGuestDialog beds={availableBeds} onSelectBed={handleSelectBedForGuestAdd} open={isAddGuestOpen} onOpenChange={setIsAddGuestOpen} />
            <CollectRentDialog guests={guests} onSelectGuest={handleSelectGuestForPayment} open={isCollectRentOpen} onOpenChange={setIsCollectRentOpen} />
            <SendRemindersDialog guests={guestsWithDuesForReminder} open={isSendRemindersOpen} onOpenChange={setIsSendRemindersOpen} />
        </div>
    );
};
