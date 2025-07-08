
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import type { UseDashboardReturn } from "@/hooks/use-dashboard"

type AddGuestDialogProps = Pick<UseDashboardReturn, 'isAddGuestDialogOpen' | 'setIsAddGuestDialogOpen' | 'selectedBedForGuestAdd' | 'addGuestForm' | 'handleAddGuestSubmit'>

export default function AddGuestDialog({ isAddGuestDialogOpen, setIsAddGuestDialogOpen, selectedBedForGuestAdd, addGuestForm, handleAddGuestSubmit }: AddGuestDialogProps) {
  return (
    <Dialog open={isAddGuestDialogOpen} onOpenChange={setIsAddGuestDialogOpen}>
      <DialogContent className="sm:max-w-lg flex flex-col max-h-[90dvh]">
        <DialogHeader>
          <DialogTitle>Onboard New Guest</DialogTitle>
          <DialogDescription>
            Add a new guest to Bed {selectedBedForGuestAdd?.bed.name} in Room {selectedBedForGuestAdd?.room.name} at {selectedBedForGuestAdd?.pg.name}.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto -mr-6 pr-6">
          <Form {...addGuestForm}>
            <form onSubmit={addGuestForm.handleSubmit(handleAddGuestSubmit)} className="space-y-4" id="add-guest-form">
              <FormField control={addGuestForm.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="e.g., Priya Sharma" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={addGuestForm.control} name="phone" render={({ field }) => (
                  <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input placeholder="e.g., 9876543210" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={addGuestForm.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>Email Address</FormLabel><FormControl><Input type="email" placeholder="e.g., priya@example.com" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={addGuestForm.control} name="rentAmount" render={({ field }) => (
                  <FormItem><FormLabel>Monthly Rent</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={addGuestForm.control} name="depositAmount" render={({ field }) => (
                  <FormItem><FormLabel>Security Deposit</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={addGuestForm.control} name="moveInDate" render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Move-in Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} initialFocus />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={addGuestForm.control} name="kycDocument" render={({ field }) => (
                <FormItem>
                  <FormLabel>KYC Document</FormLabel>
                  <FormControl><Input type="file" /></FormControl>
                  <FormDescription>Upload Aadhar, PAN, or other ID. This is for demo purposes.</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
            </form>
          </Form>
        </div>
        <DialogFooter className="pt-4">
          <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
          <Button type="submit" form="add-guest-form">Add Guest</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
