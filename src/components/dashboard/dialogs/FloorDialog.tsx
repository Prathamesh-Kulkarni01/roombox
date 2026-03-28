
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import type { UseDashboardReturn } from "@/hooks/use-dashboard"

type FloorDialogProps = Pick<UseDashboardReturn, 'isFloorDialogOpen' | 'setIsFloorDialogOpen' | 'floorToEdit' | 'floorForm' | 'handleFloorSubmit'>

export default function FloorDialog({ isFloorDialogOpen, setIsFloorDialogOpen, floorToEdit, floorForm, handleFloorSubmit }: FloorDialogProps) {
  const loading = floorForm.formState.isSubmitting

  return (
    <Dialog open={isFloorDialogOpen} onOpenChange={setIsFloorDialogOpen}>
      <DialogContent className="p-0 flex flex-col max-h-[90dvh]">
        <DialogHeader className="p-6 pb-2 flex-shrink-0">
          <DialogTitle>{floorToEdit ? 'Edit Floor' : 'Add New Floor'}</DialogTitle>
          <DialogDescription>
            {floorToEdit ? "Update " : "Create a new "} floor for your property.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 py-2">
          <Form {...floorForm}>
            <form onSubmit={floorForm.handleSubmit(handleFloorSubmit)} id="floor-form" className="space-y-4 py-2">
              <FormField control={floorForm.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Floor Name</FormLabel>
                  <FormControl><Input placeholder="e.g., First Floor" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </form>
          </Form>
        </div>
        <DialogFooter className="p-6 pt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2 border-t flex-shrink-0">
          <DialogClose asChild>
            <Button variant="outline" disabled={loading} className="w-full sm:w-auto">
              Cancel
            </Button>
          </DialogClose>
          <Button type="submit" form="floor-form" disabled={loading} className="w-full sm:w-auto">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {floorToEdit ? 'Save Changes' : 'Add Floor'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
