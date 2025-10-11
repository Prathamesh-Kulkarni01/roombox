

import { useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import type { UseDashboardReturn } from "@/hooks/use-dashboard"
import type { Guest, LedgerEntry } from "@/lib/types"

type PaymentDialogProps = Pick<UseDashboardReturn, 'isPaymentDialogOpen' | 'setIsPaymentDialogOpen' | 'selectedGuestForPayment' | 'paymentForm' | 'handlePaymentSubmit'>

export default function PaymentDialog({ isPaymentDialogOpen, setIsPaymentDialogOpen, selectedGuestForPayment, paymentForm, handlePaymentSubmit }: PaymentDialogProps) {
  
  const { totalDue, dueItems } = useMemo(() => {
    if (!selectedGuestForPayment) return { totalDue: 0, dueItems: [] };
    
    const debits = selectedGuestForPayment.ledger.filter(e => e.type === 'debit');
    const credits = selectedGuestForPayment.ledger.filter(e => e.type === 'credit');
    
    const totalDebits = debits.reduce((sum, e) => sum + e.amount, 0);
    const totalCredits = credits.reduce((sum, e) => sum + e.amount, 0);
    
    return { 
        totalDue: totalDebits - totalCredits,
        dueItems: debits 
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
                            <span className="font-medium text-foreground">₹{item.amount.toLocaleString('en-IN')}</span>
                        </div>
                    )) : <p>No outstanding charges.</p>}
                </div>
                 <div className="flex justify-between items-center text-base pt-2 border-t">
                    <span className="font-bold">Total Amount Due:</span>
                    <span className="font-bold text-lg text-primary">₹{totalDue.toLocaleString('en-IN')}</span>
                </div>
              </div>
              <FormField control={paymentForm.control} name="amountPaid" render={({ field }) => (
                <FormItem><FormLabel>Amount to Collect</FormLabel><FormControl><Input type="number" placeholder="Enter amount" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
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
          <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
          <Button type="submit" form="payment-form">Confirm Payment</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
