
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import type { UseDashboardReturn } from "@/hooks/use-dashboard"

type RoomDialogProps = Pick<UseDashboardReturn, 'isRoomDialogOpen' | 'setIsRoomDialogOpen' | 'roomToEdit' | 'roomForm' | 'handleRoomSubmit'>

export default function RoomDialog({ isRoomDialogOpen, setIsRoomDialogOpen, roomToEdit, roomForm, handleRoomSubmit }: RoomDialogProps) {
  return (
    <Dialog open={isRoomDialogOpen} onOpenChange={setIsRoomDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{roomToEdit ? 'Edit Room' : 'Add New Room'}</DialogTitle>
        </DialogHeader>
        <Form {...roomForm}>
          <form onSubmit={roomForm.handleSubmit(handleRoomSubmit)} id="room-form" className="space-y-4">
            <FormField control={roomForm.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>Room Name / Number</FormLabel><FormControl><Input placeholder="e.g., Room 101" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={roomForm.control} name="rent" render={({ field }) => (
              <FormItem><FormLabel>Monthly Rent</FormLabel><FormControl><Input type="number" placeholder="e.g., 8000" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={roomForm.control} name="deposit" render={({ field }) => (
              <FormItem><FormLabel>Security Deposit</FormLabel><FormControl><Input type="number" placeholder="e.g., 16000" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </form>
        </Form>
        <DialogFooter>
          <DialogClose asChild><Button variant="secondary">Cancel</Button></DialogClose>
          <Button type="submit" form="room-form">{roomToEdit ? 'Save Changes' : 'Add Room'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
