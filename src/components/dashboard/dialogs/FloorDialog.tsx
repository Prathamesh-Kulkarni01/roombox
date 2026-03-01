
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import type { UseDashboardReturn } from "@/hooks/use-dashboard"

type FloorDialogProps = Pick<UseDashboardReturn, 'isFloorDialogOpen' | 'setIsFloorDialogOpen' | 'floorToEdit' | 'floorForm' | 'handleFloorSubmit'>

export default function FloorDialog({ isFloorDialogOpen, setIsFloorDialogOpen, floorToEdit, floorForm, handleFloorSubmit }: FloorDialogProps) {
  return (
    <Dialog open={isFloorDialogOpen} onOpenChange={setIsFloorDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{floorToEdit ? 'Edit Floor' : 'Add New Floor'}</DialogTitle>
        </DialogHeader>
        <Form {...floorForm}>
          <form onSubmit={floorForm.handleSubmit(handleFloorSubmit)} id="floor-form" className="space-y-4">
            <FormField control={floorForm.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Floor Name</FormLabel>
                <FormControl><Input placeholder="e.g., First Floor" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </form>
        </Form>
        <DialogFooter>
          <DialogClose asChild><Button variant="secondary">Cancel</Button></DialogClose>
          <Button type="submit" form="floor-form">{floorToEdit ? 'Save Changes' : 'Add Floor'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
