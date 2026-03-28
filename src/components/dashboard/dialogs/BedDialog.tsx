import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import type { UseDashboardReturn } from "@/hooks/use-dashboard"

type BedDialogProps = Pick<UseDashboardReturn, 'isBedDialogOpen' | 'setIsBedDialogOpen' | 'bedToEdit' | 'bedForm' | 'handleBedSubmit'>

export default function BedDialog({ isBedDialogOpen, setIsBedDialogOpen, bedToEdit, bedForm, handleBedSubmit }: BedDialogProps) {
  const { handleSubmit, control } = bedForm
  const loading = bedForm.formState.isSubmitting

  return (
    <Dialog open={isBedDialogOpen} onOpenChange={setIsBedDialogOpen}>
      <DialogContent className="p-0 flex flex-col max-h-[90dvh]">
        <DialogHeader className="p-6 pb-2 flex-shrink-0">
          <DialogTitle>{bedToEdit ? "Edit Bed" : "Add Bed"}</DialogTitle>
          <DialogDescription>
            {bedToEdit ? "Update " : "Create a new "} bed in the selected room.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 py-2">
          <Form {...bedForm}>
            <form id="bed-form" onSubmit={handleSubmit(handleBedSubmit)} className="space-y-4 py-2">
              <FormField
                control={control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bed Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Bed 1, A, etc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>
        <DialogFooter className="p-6 pt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2 border-t flex-shrink-0">
          <DialogClose asChild>
            <Button variant="outline" disabled={loading} className="w-full sm:w-auto">
              Cancel
            </Button>
          </DialogClose>
          <Button type="submit" form="bed-form" disabled={loading} className="w-full sm:w-auto">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {bedToEdit ? "Update Bed" : "Add Bed"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
