
import { useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import type { UseDashboardReturn } from "@/hooks/use-dashboard"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Users, IndianRupee } from "lucide-react"

type SharedChargeDialogProps = Pick<UseDashboardReturn, 'isSharedChargeDialogOpen' | 'setIsSharedChargeDialogOpen' | 'sharedChargeForm' | 'handleSharedChargeSubmit' | 'roomForSharedCharge'>;

export default function SharedChargeDialog({ isSharedChargeDialogOpen, setIsSharedChargeDialogOpen, sharedChargeForm, handleSharedChargeSubmit, roomForSharedCharge }: SharedChargeDialogProps) {
    const totalAmount = sharedChargeForm.watch('totalAmount');
    const occupiedGuests = roomForSharedCharge?.guests || [];
    const chargePerGuest = occupiedGuests.length > 0 && totalAmount ? (totalAmount / occupiedGuests.length) : 0;
  
    useEffect(() => {
        if (roomForSharedCharge) {
            sharedChargeForm.reset();
        }
    }, [roomForSharedCharge, sharedChargeForm])

    return (
        <Dialog open={isSharedChargeDialogOpen} onOpenChange={setIsSharedChargeDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add Shared Charge to Room {roomForSharedCharge?.name}</DialogTitle>
                    <DialogDescription>Split a bill equally among all occupied beds in this room.</DialogDescription>
                </DialogHeader>
                <Form {...sharedChargeForm}>
                    <form onSubmit={sharedChargeForm.handleSubmit(handleSharedChargeSubmit)} id="shared-charge-form" className="space-y-4">
                        <FormField control={sharedChargeForm.control} name="description" render={({ field }) => (
                            <FormItem><FormLabel>Description</FormLabel><FormControl><Input placeholder="e.g., May Electricity Bill" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={sharedChargeForm.control} name="totalAmount" render={({ field }) => (
                            <FormItem><FormLabel>Total Bill Amount (₹)</FormLabel><FormControl><Input type="number" placeholder="e.g., 2500" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />

                        {occupiedGuests.length > 0 && (
                            <Alert>
                                <Users className="h-4 w-4" />
                                <AlertTitle>Charge Distribution</AlertTitle>
                                <AlertDescription className="flex items-center justify-between">
                                    <span>
                                        ₹{chargePerGuest.toFixed(2)} per guest ({occupiedGuests.length} guests)
                                    </span>
                                </AlertDescription>
                            </Alert>
                        )}
                         <div className="space-y-2">
                            <p className="text-sm font-medium">Affected Guests:</p>
                            <ul className="text-sm text-muted-foreground list-disc list-inside">
                                {occupiedGuests.map(guest => <li key={guest.id}>{guest.name}</li>)}
                            </ul>
                        </div>
                    </form>
                </Form>
                 <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
                    <Button type="submit" form="shared-charge-form" disabled={occupiedGuests.length === 0}>Apply Charge</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
