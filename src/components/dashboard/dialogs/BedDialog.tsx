
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import type { UseDashboardReturn } from "@/hooks/use-dashboard"

type BedDialogProps = Pick<UseDashboardReturn, 'isBedDialogOpen' | 'setIsBedDialogOpen' | 'bedToEdit' | 'bedForm' | 'handleBedSubmit'>

export default function BedDialog({ isBedDialogOpen, setIsBedDialogOpen, bedToEdit, bedForm, handleBedSubmit }: BedDialogProps) {
  return (
    <Dialog open={isBedDialogOpen} onOpenChange={setIsBedDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{bedToEdit ? 'Edit Bed' : 'Add New Bed'}</DialogTitle>
        </DialogHeader>
        <Form {...bedForm}>
          <form onSubmit={bedForm.handleSubmit(handleBedSubmit)} id="bed-form" className="space-y-4">
            <FormField control={bedForm.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Bed Name / Number</FormLabel>
                <FormControl><Input placeholder="e.g., A, B, 1, 2..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </form>
        </Form>
        <DialogFooter>
          <DialogClose asChild><Button variant="secondary">Cancel</Button></DialogClose>
          <Button type="submit" form="bed-form">{bedToEdit ? 'Save Changes' : 'Add Bed'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
