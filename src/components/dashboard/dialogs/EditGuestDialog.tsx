

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import type { UseDashboardReturn } from "@/hooks/use-dashboard"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RentCycleUnit } from "@/lib/types"
import { Loader2 } from "lucide-react"

const rentCycleOptions: { value: RentCycleUnit, label: string }[] = [
  { value: 'minutes', label: 'Minutes (for testing)' },
  { value: 'hours', label: 'Hours' },
  { value: 'days', label: 'Days' },
  { value: 'weeks', label: 'Weeks' },
  { value: 'months', label: 'Months' },
];

type EditGuestDialogProps = Pick<UseDashboardReturn, 'isEditGuestDialogOpen' | 'setIsEditGuestDialogOpen' | 'guestToEdit' | 'editGuestForm' | 'handleEditGuestSubmit' | 'isUpdatingGuest'>

export default function EditGuestDialog({ isEditGuestDialogOpen, setIsEditGuestDialogOpen, guestToEdit, editGuestForm, handleEditGuestSubmit, isUpdatingGuest }: EditGuestDialogProps) {
  return (
    <Dialog open={isEditGuestDialogOpen} onOpenChange={setIsEditGuestDialogOpen}>
      <DialogContent className="sm:max-w-lg p-0 flex flex-col max-h-[90dvh]">
        <DialogHeader className="p-6 pb-2 flex-shrink-0">
          <DialogTitle>Edit Guest Profile</DialogTitle>
          <DialogDescription>
            Update the details for {guestToEdit?.name}.
          </DialogDescription>
        </DialogHeader>
        <div className="p-6 pt-0 flex-1 overflow-y-auto">
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
        <DialogFooter className="p-6 pt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2 border-t flex-shrink-0">
          <DialogClose asChild><Button type="button" variant="secondary" disabled={isUpdatingGuest} className="w-full sm:w-auto">Cancel</Button></DialogClose>
          <Button type="submit" form="edit-guest-form" disabled={isUpdatingGuest} className="w-full sm:w-auto">
            {isUpdatingGuest && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
