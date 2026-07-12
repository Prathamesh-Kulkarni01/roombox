'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

export default function PublicLeadForm({ pgId, ownerId, pgName }: { pgId: string; ownerId: string; pgName: string }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();
  const searchParams = useSearchParams();

  // Track page view on mount
  useEffect(() => {
    const source = searchParams.get('source') || 'direct';
    fetch('/api/marketing/track-view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pgId, ownerId, source })
    }).catch(console.error);
  }, [pgId, ownerId, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please fill in all fields.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const source = searchParams.get('source') || 'public_listing';
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          pgId,
          ownerId,
          source,
          status: 'new'
        })
      });

      const data = await res.json();
      if (data.success) {
        setIsSuccess(true);
        toast({ title: 'Success!', description: 'Your inquiry has been sent to the owner.' });
      } else {
        toast({ variant: 'destructive', title: 'Failed', description: data.error || 'Failed to submit.' });
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center text-green-500">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h3 className="font-semibold text-lg">Inquiry Sent</h3>
        <p className="text-sm text-muted-foreground">The owner of {pgName} will contact you soon on {phone}.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Your Name</Label>
        <Input 
          id="name" 
          placeholder="e.g. Rahul Sharma" 
          value={name} 
          onChange={e => setName(e.target.value)} 
          disabled={isSubmitting}
          className="bg-background/50"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number</Label>
        <Input 
          id="phone" 
          placeholder="e.g. 9876543210" 
          value={phone} 
          onChange={e => setPhone(e.target.value)} 
          disabled={isSubmitting}
          className="bg-background/50"
        />
      </div>
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Sending...
          </>
        ) : (
          'Send Inquiry'
        )}
      </Button>
    </form>
  );
}
