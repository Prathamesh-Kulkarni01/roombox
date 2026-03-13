

'use client';

import { useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import type { UseDashboardReturn } from "@/hooks/use-dashboard"
import type { Guest, LedgerEntry } from "@/lib/types"
import { produce } from "immer";
import { Loader2 } from "lucide-react"

type PaymentDialogProps = Pick<UseDashboardReturn, 'isPaymentDialogOpen' | 'setIsPaymentDialogOpen' | 'selectedGuestForPayment' | 'paymentForm' | 'handlePaymentSubmit' | 'isRecordingPayment'>

export default function PaymentDialog({ isPaymentDialogOpen, setIsPaymentDialogOpen, selectedGuestForPayment, paymentForm, handlePaymentSubmit, isRecordingPayment }: PaymentDialogProps) {

  const { totalDue, dueItems } = useMemo(() => {
    if (!selectedGuestForPayment?.ledger) return { totalDue: 0, dueItems: [] };

    const ledger = [...selectedGuestForPayment.ledger].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Numeric tracking
    let creditsToApply = ledger
      .filter(e => e.type === 'credit' && e.amountType !== 'symbolic')
      .reduce((sum, e) => sum + e.amount, 0);

    // Symbolic tracking
    let symbolicCreditsToApply = ledger
      .filter(e => e.type === 'credit' && e.amountType === 'symbolic')
      .length;

    const unpaidItems: (LedgerEntry & { isSymbolic?: boolean; displayAmount?: string })[] = [];

    const debits = ledger.filter(e => e.type === 'debit');

    for (const debit of debits) {
      const isSymbolic = debit.amountType === 'symbolic';
      
      if (isSymbolic) {
        if (symbolicCreditsToApply >= 1) {
          symbolicCreditsToApply -= 1;
        } else {
          unpaidItems.push({
            ...debit,
            isSymbolic: true,
            displayAmount: debit.symbolicValue || 'XXX'
          });
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

    const numericBalance = unpaidItems.filter(i => !i.isSymbolic).reduce((sum, item) => sum + item.amount, 0);

    return {
      totalDue: numericBalance,
      dueItems: unpaidItems
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
                    <div className="font-bold text-lg text-primary">₹{totalDue.toLocaleString('en-IN')}</div>
                    {selectedGuestForPayment.amountType === 'symbolic' && selectedGuestForPayment.symbolicBalance && (
                      <div className="text-xs font-semibold text-muted-foreground">
                        + {selectedGuestForPayment.symbolicBalance}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {selectedGuestForPayment.amountType === 'symbolic' && (
                <FormField control={paymentForm.control} name="amountType" render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Collection Mode</FormLabel>
                    <FormControl>
                      <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4 pt-1">
                        <FormItem className="flex items-center space-x-2">
                          <FormControl><RadioGroupItem value="numeric" id="pay-numeric" /></FormControl>
                          <FormLabel htmlFor="pay-numeric" className="font-normal cursor-pointer">Numeric (₹)</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2">
                          <FormControl><RadioGroupItem value="symbolic" id="pay-symbolic" /></FormControl>
                          <FormLabel htmlFor="pay-symbolic" className="font-normal cursor-pointer">Special (XXX)</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              )}

              {paymentForm.watch('amountType') === 'numeric' ? (
                <FormField control={paymentForm.control} name="amountPaid" render={({ field }) => (
                  <FormItem><FormLabel>Amount to Collect (₹)</FormLabel><FormControl><Input type="number" placeholder="Enter amount" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              ) : (
                <FormField control={paymentForm.control} name="symbolicValue" render={({ field }) => (
                  <FormItem><FormLabel>Unit Name to Collect</FormLabel><FormControl><Input placeholder="e.g., XXX" {...field} /></FormControl><FormMessage /></FormItem>
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
