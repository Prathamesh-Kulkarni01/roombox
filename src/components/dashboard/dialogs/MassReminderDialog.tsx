'use client'

import React, { useState, useMemo } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Loader2, MessageCircle, Send, Users, AlertCircle, Info } from "lucide-react"

interface GuestForReminder {
    id: string;
    name: string;
    phone?: string;
    balance: number;
    symbolicBalance?: string | null;
    amountType?: 'numeric' | 'symbolic';
    roomName: string;
}

interface MassReminderDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    guests: GuestForReminder[];
    whatsappCredits: number;
    whatsappEnabled: boolean;
    onSend: (selectedGuests: GuestForReminder[]) => Promise<void>;
}

export default function MassReminderDialog({
    isOpen,
    onOpenChange,
    guests,
    whatsappCredits,
    whatsappEnabled,
    onSend
}: MassReminderDialogProps) {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(guests.map(g => g.id)));
    const [isSending, setIsSending] = useState(false);

    // Initial select all when opening
    React.useEffect(() => {
        if (isOpen) {
            setSelectedIds(new Set(guests.map(g => g.id)));
        }
    }, [isOpen, guests]);

    // Pricing from send-message.ts (TEMPLATE = 1.5)
    const WHATSAPP_TEMPLATE_COST = 1.5;

    const selectedGuests = useMemo(() => 
        guests.filter(g => selectedIds.has(g.id)), 
    [guests, selectedIds]);

    const totalCost = useMemo(() => {
        const eligibleGuests = selectedGuests.filter(g => !!g.phone);
        return eligibleGuests.length * WHATSAPP_TEMPLATE_COST;
    }, [selectedGuests]);

    const hasInsufficientCredits = whatsappEnabled && totalCost > whatsappCredits;

    const toggleGuest = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const toggleAll = () => {
        if (selectedIds.size === guests.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(guests.map(g => g.id)));
        }
    };

    const handleConfirm = async () => {
        if (selectedGuests.length === 0 || isSending) return;
        setIsSending(true);
        try {
            await onSend(selectedGuests);
            onOpenChange(false);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh] gap-0">
                <DialogHeader className="p-4 sm:p-6 pb-2 sm:pb-4 bg-muted/30 flex-shrink-0">
                    <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
                        <Send className="w-5 h-5 text-primary" />
                        Send Bulk Reminders
                    </DialogTitle>
                    <DialogDescription className="text-xs sm:text-sm">
                        Review and select guests to receive payment alerts via WhatsApp and Push.
                    </DialogDescription>
                </DialogHeader>

                <div className="p-3 sm:p-4 bg-primary/5 border-y border-primary/10 flex-shrink-0">
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Selected</span>
                            <span className="text-xl sm:text-2xl font-black text-primary">{selectedGuests.length} / {guests.length}</span>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Est. Cost</span>
                            <div className="flex flex-col items-end">
                                <span className={`text-xl sm:text-2xl font-black ${hasInsufficientCredits ? 'text-rose-600' : 'text-foreground'}`}>
                                    {totalCost.toFixed(1)} <span className="text-xs font-bold text-muted-foreground uppercase tracking-tight">Credits</span>
                                </span>
                                {!whatsappEnabled && totalCost > 0 && (
                                    <span className="text-[9px] font-bold text-rose-500 uppercase tracking-tighter">WA Disabled</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {whatsappEnabled && (
                        <div className="mt-2 text-[10px] sm:text-xs sm:mt-3 flex items-center justify-between bg-background/50 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 border border-primary/10">
                            <div className="flex items-center gap-2">
                                <Info className="w-3.5 h-3.5 text-primary" />
                                <span className="font-semibold text-[10px] sm:text-xs">Current Balance: {whatsappCredits.toFixed(1)} Credits</span>
                            </div>
                            {hasInsufficientCredits && (
                                <Badge variant="destructive" className="text-[9px] sm:text-[10px] h-4 sm:h-5 py-0">Low Balance</Badge>
                            )}
                        </div>
                    )}
                </div>

                <div className="p-3 sm:p-4 pb-1 sm:pb-2 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <Checkbox 
                            id="select-all" 
                            checked={selectedIds.size === guests.length && guests.length > 0}
                            onCheckedChange={toggleAll}
                            className="w-4 h-4 sm:w-5 sm:h-5 rounded-md"
                        />
                        <label htmlFor="select-all" className="text-xs sm:text-sm font-bold cursor-pointer select-none">
                            Select All
                        </label>
                    </div>
                </div>

                <ScrollArea className="flex-1 min-h-0 px-2">
                    <div className="space-y-1 p-2">
                        {guests.map((guest) => (
                            <div 
                                key={guest.id}
                                className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                                    selectedIds.has(guest.id) 
                                        ? 'bg-primary/5 border-primary/20 shadow-sm' 
                                        : 'bg-background border-transparent hover:bg-muted/50'
                                }`}
                                onClick={() => toggleGuest(guest.id)}
                            >
                                <div className="flex items-center gap-3">
                                    <Checkbox 
                                        checked={selectedIds.size === guests.length || selectedIds.has(guest.id)}
                                        onCheckedChange={() => toggleGuest(guest.id)}
                                        onClick={(e) => e.stopPropagation()}
                                        className="w-5 h-5 rounded-md"
                                    />
                                    <Avatar className="h-10 w-10 border">
                                        <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">
                                            {guest.name.slice(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-bold text-sm leading-none mb-1">{guest.name}</p>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-[10px] font-bold py-0 h-4 uppercase tracking-tighter">
                                                {guest.roomName}
                                            </Badge>
                                            <span className="text-[10px] font-bold text-rose-600 uppercase tracking-tighter">
                                                {guest.amountType === 'symbolic' ? `${guest.symbolicBalance} DUE` : `₹${guest.balance.toLocaleString('en-IN')} DUE`}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {guest.phone ? (
                                        <div className="p-1.5 bg-emerald-500/10 text-emerald-600 rounded-lg">
                                            <MessageCircle className="w-4 h-4" />
                                        </div>
                                    ) : (
                                        <AlertCircle className="w-4 h-4 text-muted-foreground/30" />
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>

                <DialogFooter className="p-4 sm:p-6 bg-muted/30 border-t flex-col sm:flex-row gap-2 sm:gap-3 flex-shrink-0">
                    <Button 
                        variant="ghost" 
                        onClick={() => onOpenChange(false)}
                        className="font-bold text-muted-foreground"
                    >
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleConfirm}
                        disabled={selectedGuests.length === 0 || isSending || hasInsufficientCredits}
                        className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-black shadow-lg rounded-xl h-12"
                    >
                        {isSending ? (
                            <>
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                Sending Alerts...
                            </>
                        ) : (
                            <>
                                <Send className="w-5 h-5 mr-2" />
                                Send {selectedGuests.length} Reminders
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
