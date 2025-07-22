
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import type { UseDashboardReturn } from "@/hooks/use-dashboard"

type EditGuestDialogProps = Pick<UseDashboardReturn, 'isEditGuestDialogOpen' | 'setIsEditGuestDialogOpen' | 'guestToEdit' | 'editGuestForm' | 'handleEditGuestSubmit'>

export default function EditGuestDialog({ isEditGuestDialogOpen, setIsEditGuestDialogOpen, guestToEdit, editGuestForm, handleEditGuestSubmit }: EditGuestDialogProps) {
  return (
    <Dialog open={isEditGuestDialogOpen} onOpenChange={setIsEditGuestDialogOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Guest Profile</DialogTitle>
          <DialogDescription>
            Update the contact details for {guestToEdit?.name}.
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
