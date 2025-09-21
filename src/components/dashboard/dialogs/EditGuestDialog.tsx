

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import type { UseDashboardReturn } from "@/hooks/use-dashboard"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RentCycleUnit } from "@/lib/types"

const rentCycleOptions: { value: RentCycleUnit, label: string }[] = [
    { value: 'minutes', label: 'Minutes (for testing)' },
    { value: 'hours', label: 'Hours (for testing)' },
    { value: 'days', label: 'Days' },
    { value: 'weeks', label: 'Weeks' },
    { value: 'months', label: 'Months' },
];

type EditGuestDialogProps = Pick<UseDashboardReturn, 'isEditGuestDialogOpen' | 'setIsEditGuestDialogOpen' | 'guestToEdit' | 'editGuestForm' | 'handleEditGuestSubmit'>

export default function EditGuestDialog({ isEditGuestDialogOpen, setIsEditGuestDialogOpen, guestToEdit, editGuestForm, handleEditGuestSubmit }: EditGuestDialogProps) {
  return (
    <Dialog open={isEditGuestDialogOpen} onOpenChange={setIsEditGuestDialogOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Guest Profile</DialogTitle>
          <DialogDescription>
            Update the details for {guestToEdit?.name}.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto">
          <Form {...editGuestForm}>
            <form onSubmit={editGuestForm.handleSubmit(handleEditGuestSubmit)} className="space-y-4" id="edit-guest-form">
              <FormField control={editGuestForm.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="e.g., Priya Sharma" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={editGuestForm.control} name="phone" render={({ field }) => (
                <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input placeholder="e.g., 9876543210" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={editGuestForm.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>Email Address</FormLabel><FormControl><Input type="email" placeholder="e.g., priya@example.com" {...field} /></FormControl><FormMessage /></FormItem>
              )} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <FormField control={editGuestForm.control} name="rentCycleUnit" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Rent Cycle Unit</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                                {rentCycleOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={editGuestForm.control} name="rentCycleValue" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Cycle Duration</FormLabel>
                        <FormControl><Input type="number" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
              </div>
            </form>
          </Form>
        </div>
        <DialogFooter className="pt-4">
          <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
          <Button type="submit" form="edit-guest-form">Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
