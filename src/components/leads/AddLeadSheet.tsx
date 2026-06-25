'use client';

import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Lead, LeadStatus } from '@/lib/types';
import { createLead, updateLeadDetails } from '@/lib/actions/leadActions';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';

interface AddLeadSheetProps {
  isOpen: boolean;
  onClose: () => void;
  ownerId: string;
  onSuccess: () => void;
  existingLead?: Lead;
}

export default function AddLeadSheet({ isOpen, onClose, ownerId, onSuccess, existingLead }: AddLeadSheetProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState<Partial<Lead>>({
    name: '',
    phone: '',
    status: 'new',
    source: 'walk-in',
    expectedRent: undefined,
    notes: '',
  });

  useEffect(() => {
    if (existingLead && isOpen) {
      setFormData(existingLead);
    } else if (!isOpen) {
      setFormData({
        name: '',
        phone: '',
        status: 'new',
        source: 'walk-in',
        expectedRent: undefined,
        notes: '',
      });
    }
  }, [existingLead, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      toast({ title: 'Validation Error', description: 'Name and Phone are required.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      if (existingLead) {
        await updateLeadDetails(ownerId, existingLead.id, formData);
        toast({ title: 'Success', description: 'Lead updated successfully.' });
      } else {
        await createLead(ownerId, formData as Omit<Lead, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>);
        toast({ title: 'Success', description: 'Lead created successfully.' });
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error(error);
      toast({ title: 'Error', description: error.message || 'Failed to save lead', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{existingLead ? 'Edit Lead' : 'Add New Lead'}</SheetTitle>
          <SheetDescription>
            {existingLead ? 'Update details for this prospective tenant.' : 'Create a new lead to track in your CRM pipeline.'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input 
              id="name" 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})} 
              placeholder="e.g. Rahul Kumar"
              required 
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number *</Label>
            <Input 
              id="phone" 
              type="tel"
              value={formData.phone} 
              onChange={e => setFormData({...formData, phone: e.target.value})} 
              placeholder="e.g. 9876543210"
              required 
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status} onValueChange={(v: LeadStatus) => setFormData({...formData, status: v})}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">New Inquiry</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="visited">Visited Property</SelectItem>
                <SelectItem value="negotiation">In Negotiation</SelectItem>
                <SelectItem value="converted">Converted (Won)</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="source">Source</Label>
            <Select value={formData.source} onValueChange={(v: any) => setFormData({...formData, source: v})}>
              <SelectTrigger>
                <SelectValue placeholder="Select lead source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="walk-in">Walk-in</SelectItem>
                <SelectItem value="website">Website / Online</SelectItem>
                <SelectItem value="broker">Broker</SelectItem>
                <SelectItem value="referral">Referral</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expectedRent">Expected Rent (₹)</Label>
            <Input 
              id="expectedRent" 
              type="number"
              value={formData.expectedRent || ''} 
              onChange={e => setFormData({...formData, expectedRent: e.target.value ? Number(e.target.value) : undefined})} 
              placeholder="e.g. 8000"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nextFollowUpDate">Next Follow-up Date</Label>
            <Input 
              id="nextFollowUpDate" 
              type="date"
              value={formData.nextFollowUpDate ? formData.nextFollowUpDate.split('T')[0] : ''} 
              onChange={e => setFormData({...formData, nextFollowUpDate: e.target.value ? new Date(e.target.value).toISOString() : undefined})} 
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea 
              id="notes" 
              value={formData.notes || ''} 
              onChange={e => setFormData({...formData, notes: e.target.value})} 
              placeholder="Add any context, preferences, or requirements here..."
              className="resize-none"
              rows={3}
            />
          </div>

          <SheetFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Lead'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
