'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { recordUtilityReading } from '@/lib/actions/utilityActions';
import { useToast } from '@/hooks/use-toast';
import { Room } from '@/lib/types';

interface UtilityReadingModalProps {
  isOpen: boolean;
  onClose: () => void;
  ownerId: string;
  pgId: string;
  rooms: Room[];
  onSuccess: () => void;
}

export default function UtilityReadingModal({ isOpen, onClose, ownerId, pgId, rooms, onSuccess }: UtilityReadingModalProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    roomId: '',
    utilityType: 'electricity' as 'electricity' | 'water' | 'other',
    previousReading: '',
    currentReading: '',
    costPerUnit: '10', // Default ₹10/unit
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.roomId || !formData.previousReading || !formData.currentReading || !formData.costPerUnit) {
      toast({ title: 'Validation Error', description: 'Please fill all fields', variant: 'destructive' });
      return;
    }

    const prev = Number(formData.previousReading);
    const curr = Number(formData.currentReading);
    const cost = Number(formData.costPerUnit);

    if (curr < prev) {
      toast({ title: 'Validation Error', description: 'Current reading cannot be less than previous reading', variant: 'destructive' });
      return;
    }

    const totalAmount = (curr - prev) * cost;
    const room = rooms.find(r => r.id === formData.roomId);

    setLoading(true);
    try {
      await recordUtilityReading(ownerId, {
        pgId,
        roomId: formData.roomId,
        roomName: room?.name || 'Unknown Room',
        utilityType: formData.utilityType,
        previousReading: prev,
        currentReading: curr,
        readingDate: new Date().toISOString(),
        costPerUnit: cost,
        totalAmount,
      });

      toast({ title: 'Success', description: 'Reading recorded successfully.' });
      onSuccess();
      onClose();
      // Reset form
      setFormData({
        roomId: '',
        utilityType: 'electricity',
        previousReading: '',
        currentReading: '',
        costPerUnit: '10',
      });
    } catch (error: any) {
      console.error(error);
      toast({ title: 'Error', description: error.message || 'Failed to record reading', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Meter Reading</DialogTitle>
          <DialogDescription>
            Enter the latest reading to automatically calculate the total cost.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Select Room *</Label>
            <Select value={formData.roomId} onValueChange={(v) => setFormData({...formData, roomId: v})}>
              <SelectTrigger>
                <SelectValue placeholder="Select a room" />
              </SelectTrigger>
              <SelectContent>
                {rooms.map(room => (
                  <SelectItem key={room.id} value={room.id}>{room.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Utility Type *</Label>
            <Select value={formData.utilityType} onValueChange={(v: any) => setFormData({...formData, utilityType: v})}>
              <SelectTrigger>
                <SelectValue placeholder="Select utility type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="electricity">Electricity</SelectItem>
                <SelectItem value="water">Water</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Previous Reading *</Label>
              <Input 
                type="number" 
                value={formData.previousReading} 
                onChange={e => setFormData({...formData, previousReading: e.target.value})} 
                placeholder="e.g. 1000"
                required 
              />
            </div>
            <div className="space-y-2">
              <Label>Current Reading *</Label>
              <Input 
                type="number" 
                value={formData.currentReading} 
                onChange={e => setFormData({...formData, currentReading: e.target.value})} 
                placeholder="e.g. 1050"
                required 
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Cost Per Unit (₹) *</Label>
            <Input 
              type="number" 
              step="0.01"
              value={formData.costPerUnit} 
              onChange={e => setFormData({...formData, costPerUnit: e.target.value})} 
              required 
            />
          </div>

          {formData.previousReading && formData.currentReading && formData.costPerUnit && Number(formData.currentReading) >= Number(formData.previousReading) && (
            <div className="p-3 bg-primary/10 border border-primary/20 rounded-md flex justify-between items-center mt-2">
              <span className="text-sm text-primary font-medium">Calculated Total:</span>
              <span className="text-lg font-bold text-primary">
                ₹{((Number(formData.currentReading) - Number(formData.previousReading)) * Number(formData.costPerUnit)).toFixed(2)}
              </span>
            </div>
          )}

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save & Calculate'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
