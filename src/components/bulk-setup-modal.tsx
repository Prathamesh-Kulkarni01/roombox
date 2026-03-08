'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Building2, LayoutGrid, BedDouble, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async () => {
        if (!floors || !roomsPerFloor || !bedsPerRoom) {
            toast({ variant: 'destructive', title: 'Invalid input', description: 'All fields are required.' });
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/properties/bulk-setup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Zap className="w-5 h-5 text-primary" />
                        Bulk Setup — {pg.name}
                    </DialogTitle>
                    <DialogDescription>
                        Auto-generate floors, rooms, and beds in one click. You can always adjust individual rooms later.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-5 py-2">
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
                                type="number"
                                min={1}
                                max={20}
                                value={form.floors}
                                onChange={handleChange}
                                placeholder="e.g. 3"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="bulk-start-floor">Start Floor #</Label>
                            <Input
                                id="bulk-start-floor"
                                name="startFloorNumber"
                                type="number"
                                min={0}
                                max={20}
                                value={form.startFloorNumber}
                                onChange={handleChange}
                                placeholder="e.g. 1"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="bulk-rooms">Rooms per Floor</Label>
                            <Input
                                id="bulk-rooms"
                                name="roomsPerFloor"
                                type="number"
                                min={1}
                                max={50}
                                value={form.roomsPerFloor}
                                onChange={handleChange}
                                placeholder="e.g. 4"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="bulk-beds">Beds per Room</Label>
                            <Input
                                id="bulk-beds"
                                name="bedsPerRoom"
                                type="number"
                                min={1}
                                max={20}
                                value={form.bedsPerRoom}
                                onChange={handleChange}
                                placeholder="e.g. 3"
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={loading || !totalBeds}>
                        {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</> : `Generate ${totalBeds} Beds`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
