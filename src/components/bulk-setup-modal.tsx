'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Building2, LayoutGrid, BedDouble, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase';
import type { PG } from '@/lib/types';

interface BulkSetupModalProps {
    pg: PG;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export default function BulkSetupModal({ pg, open, onOpenChange, onSuccess }: BulkSetupModalProps) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        floors: '3',
        roomsPerFloor: '4',
        bedsPerRoom: '3',
        startFloorNumber: '1',
    });

    const floors = Number(form.floors) || 0;
    const roomsPerFloor = Number(form.roomsPerFloor) || 0;
    const bedsPerRoom = Number(form.bedsPerRoom) || 0;
    const totalBeds = floors * roomsPerFloor * bedsPerRoom;
    const totalRooms = floors * roomsPerFloor;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value, name } = e.target;
        // Allow numeric values or empty string for clearing
        if (value === '' || /^\d*$/.test(value)) {
            setForm(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async () => {
        if (!floors || !roomsPerFloor || !bedsPerRoom) {
            toast({ variant: 'destructive', title: 'Invalid input', description: 'All fields are required.' });
            return;
        }

        setLoading(true);
        try {
            const token = await auth?.currentUser?.getIdToken();
            const res = await fetch('/api/properties/bulk-setup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    pgId: pg.id,
                    floors,
                    roomsPerFloor,
                    bedsPerRoom,
                    startFloorNumber: Number(form.startFloorNumber) || 1,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Setup failed');
            }

            toast({
                title: '✅ Bulk Setup Complete!',
                description: data.message,
            });
            onSuccess();
            onOpenChange(false);
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Setup Failed', description: err.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md p-0 flex flex-col max-h-[90dvh]">
                <DialogHeader className="p-6 pb-2 flex-shrink-0">
                    <DialogTitle className="flex items-center gap-2">
                        <Zap className="w-5 h-5 text-primary" />
                        Bulk Setup — {pg.name}
                    </DialogTitle>
                    <DialogDescription>
                        Auto-generate floors, rooms, and beds in one click. You can always adjust individual rooms later.
                    </DialogDescription>
                </DialogHeader>

                <div className="p-6 pt-0 flex-1 overflow-y-auto space-y-5">
                    {/* Preview Banner */}
                    <div className="rounded-lg bg-muted px-4 py-3 text-sm flex items-center justify-between">
                        <span className="text-muted-foreground">Will create</span>
                        <div className="flex items-center gap-4 font-semibold">
                            <span className="flex items-center gap-1.5"><Building2 className="w-4 h-4 text-blue-500" /> {floors} floor{floors !== 1 ? 's' : ''}</span>
                            <span className="flex items-center gap-1.5"><LayoutGrid className="w-4 h-4 text-violet-500" /> {totalRooms} rooms</span>
                            <span className="flex items-center gap-1.5"><BedDouble className="w-4 h-4 text-emerald-500" /> {totalBeds} beds</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="bulk-floors">Floors</Label>
                            <Input
                                id="bulk-floors"
                                name="floors"
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={form.floors}
                                onChange={handleChange}
                                onBlur={() => { if (!form.floors || Number(form.floors) < 1) setForm(prev => ({ ...prev, floors: '1' })); }}
                                placeholder="e.g. 3"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="bulk-start-floor">Start Floor #</Label>
                            <Input
                                id="bulk-start-floor"
                                name="startFloorNumber"
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={form.startFloorNumber}
                                onChange={handleChange}
                                onBlur={() => { if (form.startFloorNumber === '') setForm(prev => ({ ...prev, startFloorNumber: '1' })); }}
                                placeholder="e.g. 1"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="bulk-rooms">Rooms per Floor</Label>
                            <Input
                                id="bulk-rooms"
                                name="roomsPerFloor"
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={form.roomsPerFloor}
                                onChange={handleChange}
                                onBlur={() => { if (!form.roomsPerFloor || Number(form.roomsPerFloor) < 1) setForm(prev => ({ ...prev, roomsPerFloor: '1' })); }}
                                placeholder="e.g. 4"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="bulk-beds">Beds per Room</Label>
                            <Input
                                id="bulk-beds"
                                name="bedsPerRoom"
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={form.bedsPerRoom}
                                onChange={handleChange}
                                onBlur={() => { if (!form.bedsPerRoom || Number(form.bedsPerRoom) < 1) setForm(prev => ({ ...prev, bedsPerRoom: '1' })); }}
                                placeholder="e.g. 3"
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-6 pt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2 border-t flex-shrink-0">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading} className="w-full sm:w-auto">
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={loading || !totalBeds} className="w-full sm:w-auto">
                        {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</> : `Generate ${totalBeds} Beds`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
