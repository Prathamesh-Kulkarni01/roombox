'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { calculateMoveOutDues, processMoveOutSettlement } from '@/lib/actions/refundActions';
import { useToast } from '@/hooks/use-toast';
import { RefundRecord } from '@/lib/types';
import { AlertTriangle, IndianRupee } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface MoveOutSettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  ownerId: string;
  guestId: string;
  onSuccess?: () => void;
}

export default function MoveOutSettlementModal({ isOpen, onClose, ownerId, guestId, onSuccess }: MoveOutSettlementModalProps) {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const [settlementData, setSettlementData] = useState<Partial<RefundRecord> | null>(null);
  
  // Editable fields
  const [damageDeduction, setDamageDeduction] = useState('0');
  const [damageNotes, setDamageNotes] = useState('');
  const [refundMethod, setRefundMethod] = useState<'cash' | 'bank_transfer' | 'upi' | 'waived'>('upi');

  useEffect(() => {
    if (isOpen && ownerId && guestId) {
      loadSettlementData();
    }
  }, [isOpen, ownerId, guestId]);

  const loadSettlementData = async () => {
    setFetching(true);
    try {
      const data = await calculateMoveOutDues(ownerId, guestId);
      setSettlementData(data);
      setDamageDeduction('0');
      setDamageNotes('');
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'Failed to load guest dues.', variant: 'destructive' });
      onClose();
    } finally {
      setFetching(false);
    }
  };

  const handleProcess = async () => {
    if (!settlementData) return;

    setLoading(true);
    try {
      const damageAmt = Number(damageDeduction) || 0;
      const finalRefund = (settlementData.originalDeposit || 0) - (settlementData.unpaidRentDeduction || 0) - damageAmt;

      await processMoveOutSettlement(ownerId, {
        pgId: settlementData.pgId!,
        guestId: settlementData.guestId!,
        guestName: settlementData.guestName!,
        originalDeposit: settlementData.originalDeposit || 0,
        unpaidRentDeduction: settlementData.unpaidRentDeduction || 0,
        damageDeduction: damageAmt,
        damageNotes,
        finalRefundAmount: finalRefund > 0 ? finalRefund : 0,
        refundMethod,
      });

      toast({ title: 'Move-Out Complete', description: 'Guest has been vacated and settlement recorded.' });
      if (onSuccess) onSuccess();
      onClose();
      router.push('/dashboard/guests'); // Redirect back to guests list
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to process move out', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const currentFinalRefund = settlementData 
    ? (settlementData.originalDeposit || 0) - (settlementData.unpaidRentDeduction || 0) - (Number(damageDeduction) || 0)
    : 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" /> Initiate Move-Out
          </DialogTitle>
          <DialogDescription>
            Process the final settlement for {settlementData?.guestName || 'the guest'}. This will vacate them from their bed.
          </DialogDescription>
        </DialogHeader>

        {fetching ? (
          <div className="py-8 text-center text-muted-foreground">Calculating dues...</div>
        ) : settlementData ? (
          <div className="space-y-6 py-4">
            
            {/* Breakdown */}
            <div className="bg-muted/30 p-4 rounded-lg space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Original Security Deposit Held:</span>
                <span className="font-medium text-green-600">₹{settlementData.originalDeposit}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Unpaid Rent / Dues:</span>
                <span className="font-medium text-red-500">-₹{settlementData.unpaidRentDeduction}</span>
              </div>
            </div>

            {/* Editable Damages */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Damage / Other Deductions (₹)</Label>
                <Input 
                  type="number" 
                  value={damageDeduction} 
                  onChange={e => setDamageDeduction(e.target.value)} 
                  placeholder="e.g. 500"
                />
              </div>
              {Number(damageDeduction) > 0 && (
                <div className="space-y-2">
                  <Label>Reason for Deduction</Label>
                  <Input 
                    value={damageNotes} 
                    onChange={e => setDamageNotes(e.target.value)} 
                    placeholder="e.g. Broken chair, missing keys"
                  />
                </div>
              )}
            </div>

            {/* Final Calculation */}
            <div className="border-t pt-4 space-y-4">
              <div className="flex justify-between items-center px-3 py-4 bg-primary/5 border border-primary/20 rounded-lg">
                <span className="font-bold text-lg">Final Refund Due:</span>
                <span className={`font-bold text-2xl ${currentFinalRefund > 0 ? 'text-primary' : 'text-red-500'}`}>
                  ₹{currentFinalRefund > 0 ? currentFinalRefund : 0}
                </span>
              </div>

              {currentFinalRefund > 0 && (
                <div className="space-y-2">
                  <Label>Refund Method</Label>
                  <Select value={refundMethod} onValueChange={(v: any) => setRefundMethod(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="How was it refunded?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="upi">UPI / Online</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="waived">Waived / Forfeited</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">This will auto-create an Expense record in your books.</p>
                </div>
              )}
            </div>
            
          </div>
        ) : (
          <div className="py-8 text-center text-red-500">Could not load settlement data.</div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={loading || fetching}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleProcess} 
            disabled={loading || fetching || !settlementData}
            className="gap-2"
          >
            {loading ? 'Processing...' : 'Confirm Move-Out & Vacate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
