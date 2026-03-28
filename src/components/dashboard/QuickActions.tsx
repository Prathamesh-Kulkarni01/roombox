'use client'

import React, { useState, useMemo } from 'react'
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { UserPlus, Wallet, BellRing, Search } from "lucide-react"
import type { PG, Room, Bed, Guest } from '@/lib/types'
import { Input } from '../ui/input'

const AddGuestDialog = ({ beds, onSelectBed, open, onOpenChange }: { beds: { pg: PG, room: Room, bed: Bed }[], onSelectBed: (bed: { pg: PG, room: Room, bed: Bed }) => void, open: boolean, onOpenChange: (open: boolean) => void }) => {
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
            <DialogContent className="sm:max-w-md p-0 flex flex-col max-h-[90dvh]">
                <DialogHeader className="p-6 pb-2 flex-shrink-0">
                    <DialogTitle>Add Guest to a Bed</DialogTitle>
                    <DialogDescription>Search for a vacant bed across all your properties.</DialogDescription>
                </DialogHeader>
                <div className="px-6 flex-shrink-0">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search by property, room, or bed..." className="pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    <div className="space-y-2">
                        {filteredBeds.map(item => (
                            <div key={item.bed.id} className="flex items-center justify-between p-3 rounded-xl border border-transparent hover:border-primary/20 hover:bg-primary/5 transition-all cursor-pointer shadow-sm group" onClick={() => { onSelectBed(item); onOpenChange(false); }}>
                                <div>
                                    <p className="font-bold text-base leading-tight group-hover:text-primary transition-colors">{item.pg.name}</p>
                                    <p className="text-sm text-muted-foreground font-medium">Room {item.room.name} — Bed {item.bed.name}</p>
                                </div>
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <UserPlus className="w-4 h-4 text-primary" />
                                </div>
                            </div>
                        ))}
                        {filteredBeds.length === 0 && <p className="text-center text-sm text-muted-foreground pt-4">No vacant beds found.</p>}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

const CollectRentDialog = ({ guests, onSelectGuest, open, onOpenChange }: { guests: Guest[], onSelectGuest: (guest: Guest) => void, open: boolean, onOpenChange: (open: boolean) => void }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const guestsWithDues = useMemo(() => {
        const withDues = guests.filter(g => !g.isVacated).map(g => {
            const totalDebits = (g.ledger || []).filter(e => e.type === 'debit').reduce((s, e) => s + (e.amount || 0), 0);
            const totalCredits = (g.ledger || []).filter(e => e.type === 'credit').reduce((s, e) => s + (e.amount || 0), 0);
            return { ...g, balance: totalDebits - totalCredits };
        }).filter(g => g.balance > 0);

        if (!searchTerm) return withDues;
        return withDues.filter(g =>
            g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (g.pgName || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [guests, searchTerm]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md p-0 flex flex-col max-h-[90dvh]">
                <DialogHeader className="p-6 pb-2 flex-shrink-0">
                    <DialogTitle>Collect Rent</DialogTitle>
                    <DialogDescription>Select a guest with pending dues to record a payment.</DialogDescription>
                </DialogHeader>
                <div className="px-6 flex-shrink-0">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search by guest name or property..." className="pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    <div className="space-y-2">
                        {guestsWithDues.map(guest => (
                            <div key={guest.id} className="flex items-center justify-between p-3 rounded-xl border border-transparent hover:border-primary/20 hover:bg-primary/5 transition-all cursor-pointer shadow-sm group" onClick={() => { onSelectGuest(guest); onOpenChange(false); }}>
                                <div>
                                    <p className="font-bold text-base leading-tight group-hover:text-primary transition-colors">{guest.name}</p>
                                    <p className="text-sm text-muted-foreground font-medium">{guest.pgName}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-destructive">₹{guest.balance.toLocaleString('en-IN')}</p>
                                    <p className="text-[0.65rem] text-muted-foreground font-semibold uppercase tracking-wider">Pending</p>
                                </div>
                            </div>
                        ))}
                        {guestsWithDues.length === 0 && <p className="text-center text-sm text-muted-foreground pt-4">No guests with pending dues.</p>}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default function QuickActions({ pgs, guests, handleOpenAddGuestDialog, handleOpenPaymentDialog, onSendReminders }: any) {
    const [isAddGuestOpen, setIsAddGuestOpen] = useState(false);
    const [isCollectRentOpen, setIsCollectRentOpen] = useState(false);

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

    const handleSelectBedForGuestAdd = (item: { pg: PG, room: Room, bed: Bed }) => {
        handleOpenAddGuestDialog(item.bed, item.room, item.pg);
    }

    const handleSelectGuestForPayment = (guest: Guest) => {
        handleOpenPaymentDialog(guest);
    }

    return (
        <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-auto py-5 flex flex-col items-center justify-center gap-3 hover:border-primary/50 hover:bg-primary/5 transition-all shadow-sm rounded-2xl border-border/80 group" onClick={() => setIsAddGuestOpen(true)}>
                <UserPlus className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" strokeWidth={1.5} />
                <span className="text-sm font-semibold text-foreground">Add Guest</span>
            </Button>

            <Button variant="outline" className="h-auto py-5 flex flex-col items-center justify-center gap-3 hover:border-primary/50 hover:bg-primary/5 transition-all shadow-sm rounded-2xl border-border/80 group" onClick={() => setIsCollectRentOpen(true)}>
                <Wallet className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" strokeWidth={1.5} />
                <span className="text-sm font-semibold text-foreground">Collect Rent</span>
            </Button>

            <AddGuestDialog beds={availableBeds} onSelectBed={handleSelectBedForGuestAdd} open={isAddGuestOpen} onOpenChange={setIsAddGuestOpen} />
            <CollectRentDialog guests={guests} onSelectGuest={handleSelectGuestForPayment} open={isCollectRentOpen} onOpenChange={setIsCollectRentOpen} />
        </div>
    );
};
