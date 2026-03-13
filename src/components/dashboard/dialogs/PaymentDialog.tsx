

'use client';

import { useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import type { UseDashboardReturn } from "@/hooks/use-dashboard"
import type { Guest, LedgerEntry } from "@/lib/types"
import { getBalanceBreakdown } from "@/lib/ledger-utils";
import { produce } from "immer";
import { Loader2 } from "lucide-react"

type PaymentDialogProps = Pick<UseDashboardReturn, 'isPaymentDialogOpen' | 'setIsPaymentDialogOpen' | 'selectedGuestForPayment' | 'paymentForm' | 'handlePaymentSubmit' | 'isRecordingPayment'>

export default function PaymentDialog({ isPaymentDialogOpen, setIsPaymentDialogOpen, selectedGuestForPayment, paymentForm, handlePaymentSubmit, isRecordingPayment }: PaymentDialogProps) {

  const { totalDue, dueItems, localSymbolicBalance } = useMemo(() => {
    if (!selectedGuestForPayment) return { totalDue: 0, dueItems: [], localSymbolicBalance: null };

    const breakdown = getBalanceBreakdown(selectedGuestForPayment);
    const ledger = [...(selectedGuestForPayment.ledger || [])].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // We still want to show the items that sum up to the balance
    // This part is a bit tricky to extract perfectly from getBalanceBreakdown without changing its return type
    // So we'll keep the breakdown loop but use the Canonical values where possible
    
    let creditsToApply = ledger
      .filter(e => e.type === 'credit' && e.amountType !== 'symbolic')
      .reduce((sum, e) => sum + e.amount, 0);

    const symbolicCreditsMap: Record<string, number> = {};
    ledger
      .filter(e => e.type === 'credit' && e.amountType === 'symbolic')
      .forEach(e => {
        const val = e.symbolicValue || 'XXX';
        symbolicCreditsMap[val] = (symbolicCreditsMap[val] || 0) + 1;
      });

    const unpaidItems: (LedgerEntry & { isSymbolic?: boolean; displayAmount?: string })[] = [];
    const debits = ledger.filter(e => e.type === 'debit');

    for (const debit of debits) {
      if (debit.amountType === 'symbolic') {
        const val = debit.symbolicValue || 'XXX';
        if (symbolicCreditsMap[val] >= 1) {
          symbolicCreditsMap[val] -= 1;
        } else {
          unpaidItems.push({ ...debit, isSymbolic: true, displayAmount: val });
        }
      } else {
        if (creditsToApply >= debit.amount) {
          creditsToApply -= debit.amount;
        } else {
          unpaidItems.push({
            ...debit,
            amount: debit.amount - creditsToApply,
            displayAmount: `₹${(debit.amount - creditsToApply).toLocaleString('en-IN')}`
          });
          creditsToApply = 0;
        }
      }
    }

    return {
      totalDue: breakdown.total,
      dueItems: unpaidItems,
      localSymbolicBalance: breakdown.symbolic
    };
  }, [selectedGuestForPayment]);

  return (
    <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Collect Rent Payment</DialogTitle>
          <DialogDescription>Record a full or partial payment for {selectedGuestForPayment?.name}.</DialogDescription>
        </DialogHeader>
        {selectedGuestForPayment && (
          <Form {...paymentForm}>
            <form onSubmit={paymentForm.handleSubmit(handlePaymentSubmit)} id="payment-form" className="space-y-4">
              <div className="space-y-2 py-2 border-y my-2">
                <p className="font-semibold">Dues Breakdown:</p>
                <div className="text-sm text-muted-foreground max-h-32 overflow-y-auto pr-2">
                  {dueItems.length > 0 ? dueItems.map(item => (
                    <div key={item.id} className="flex justify-between">
                      <span>{item.description}</span>
                      <span className="font-medium text-foreground">{item.displayAmount}</span>
                    </div>
                  )) : !selectedGuestForPayment.symbolicBalance && <p>No outstanding charges.</p>}
                </div>
                <div className="flex justify-between items-center text-base pt-2 border-t">
                  <span className="font-bold">Total Due:</span>
                  <div className="text-right">
                    {selectedGuestForPayment.amountType === 'symbolic' ? (
                      <div className="font-bold text-lg text-primary">
                        {localSymbolicBalance || 'Settled'}
                      </div>
                    ) : (
                      <>
                        <div className="font-bold text-lg text-primary">₹{totalDue.toLocaleString('en-IN')}</div>
                        {localSymbolicBalance && (
                          <div className="text-xs font-semibold text-muted-foreground">
                            + {localSymbolicBalance}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>


              {paymentForm.watch('amountType') === 'numeric' && (
                <FormField control={paymentForm.control} name="amountPaid" render={({ field }) => (
                  <FormItem><FormLabel>Amount to Collect (₹)</FormLabel><FormControl><Input type="number" placeholder="Enter amount" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              )}
              <FormField control={paymentForm.control} name="paymentMethod" render={({ field }) => (
                <FormItem className="space-y-3"><FormLabel>Payment Method</FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4 pt-1">
                      <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="cash" id="cash-payment" /></FormControl><FormLabel htmlFor="cash-payment" className="font-normal cursor-pointer">Cash</FormLabel></FormItem>
                      <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="upi" id="upi-payment" /></FormControl><FormLabel htmlFor="upi-payment" className="font-normal cursor-pointer">UPI</FormLabel></FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </form>
          </Form>
        )}
        <DialogFooter>
          <DialogClose asChild><Button type="button" variant="secondary" disabled={isRecordingPayment}>Cancel</Button></DialogClose>
          <Button type="submit" form="payment-form" disabled={isRecordingPayment}>
            {isRecordingPayment && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
