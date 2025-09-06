
'use client'

import React, { useState, useMemo } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Plus, UserPlus, Wallet } from 'lucide-react';
import { useAppSelector } from '@/lib/hooks';
import type { PG, Room, Bed, Guest } from '@/lib/types';
import { useDashboard } from '@/hooks/use-dashboard';
import { ScrollArea } from '../ui/scroll-area';
import AddGuestDialog from './dialogs/AddGuestDialog';
import PaymentDialog from './dialogs/PaymentDialog';

export default function QuickAddFAB() {
    const { pgs, guests } = useAppSelector(state => ({
        pgs: state.pgs.pgs,
        guests: state.guests.guests,
    }));
    
    // Using a subset of the dashboard hooks for dialogs
    const {
        isAddGuestDialogOpen, setIsAddGuestDialogOpen,
        isPaymentDialogOpen, setIsPaymentDialogOpen,
        handleOpenAddGuestDialog,
        handleAddGuestSubmit,
        addGuestForm,
        selectedBedForGuestAdd,
        handleOpenPaymentDialog,
        selectedGuestForPayment,
        paymentForm,
        handlePaymentSubmit
    } = useDashboard({ pgs, guests });
    
    const [isMenuOpen, setIsMenuOpen] = useState(false);

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

    const guestsWithDues = useMemo(() => {
        return guests.filter(g => !g.isVacated && (g.rentStatus === 'unpaid' || g.rentStatus === 'partial'));
    }, [guests]);
    
    const handleAddGuest = (bed: Bed, room: Room, pg: PG) => {
        handleOpenAddGuestDialog(bed, room, pg);
        setIsMenuOpen(false);
    }
    
    const handleCollectRent = (guest: Guest) => {
        handleOpenPaymentDialog(guest);
        setIsMenuOpen(false);
    }

    return (
        <>
            <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                <DropdownMenuTrigger asChild>
                    <Button
                        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 h-14 w-14 rounded-full shadow-lg z-40 bg-accent hover:bg-accent/90 text-accent-foreground"
                        size="icon"
                    >
                        <Plus className="h-6 w-6" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64 mb-2 mr-2" align="end" side="top">
                    <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                            <UserPlus className="mr-2 h-4 w-4" />
                            <span>Add Guest</span>
                        </DropdownMenuSubTrigger>
                        <DropdownMenuPortal>
                             <DropdownMenuSubContent>
                                <DropdownMenuLabel>Select a Vacant Bed</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <ScrollArea className="h-[200px]">
                                    {availableBeds.length > 0 ? availableBeds.map(({ pg, room, bed }) => (
                                        <DropdownMenuItem key={bed.id} onClick={() => handleAddGuest(bed, room, pg)}>
                                            <span>{pg.name} - {room.name} / Bed {bed.name}</span>
                                        </DropdownMenuItem>
                                    )) : <DropdownMenuItem disabled>No vacant beds</DropdownMenuItem>}
                                </ScrollArea>
                            </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                    </DropdownMenuSub>
                    <DropdownMenuSub>
                         <DropdownMenuSubTrigger>
                            <Wallet className="mr-2 h-4 w-4" />
                            <span>Collect Rent</span>
                        </DropdownMenuSubTrigger>
                         <DropdownMenuPortal>
                            <DropdownMenuSubContent>
                                <DropdownMenuLabel>Select Guest with Dues</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <ScrollArea className="h-[200px]">
                                    {guestsWithDues.length > 0 ? guestsWithDues.map((guest) => (
                                        <DropdownMenuItem key={guest.id} onClick={() => handleCollectRent(guest)}>
                                            <span>{guest.name} (₹{guest.rentAmount - (guest.rentPaidAmount || 0)})</span>
                                        </DropdownMenuItem>
                                    )) : <DropdownMenuItem disabled>No pending dues</DropdownMenuItem>}
                                </ScrollArea>
                            </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                    </DropdownMenuSub>
                </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Dialogs that are controlled by this component */}
            <AddGuestDialog 
                isAddGuestDialogOpen={isAddGuestDialogOpen}
                setIsAddGuestDialogOpen={setIsAddGuestDialogOpen}
                selectedBedForGuestAdd={selectedBedForGuestAdd}
                addGuestForm={addGuestForm}
                handleAddGuestSubmit={handleAddGuestSubmit}
            />
             <PaymentDialog 
                isPaymentDialogOpen={isPaymentDialogOpen}
                setIsPaymentDialogOpen={setIsPaymentDialogOpen}
                selectedGuestForPayment={selectedGuestForPayment}
                paymentForm={paymentForm}
                handlePaymentSubmit={handlePaymentSubmit}
            />
        </>
    );
}
