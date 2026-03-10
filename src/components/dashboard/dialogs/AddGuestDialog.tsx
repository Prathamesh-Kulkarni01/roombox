'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import type { UseDashboardReturn } from "@/hooks/use-dashboard"
import { format } from "date-fns"
import { useAppSelector } from '@/lib/hooks'
import { usePermissionsStore } from '@/lib/stores/configStores';
import { canAccess } from '@/lib/permissions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RentCycleUnit } from "@/lib/types"
import { Loader2 } from "lucide-react"

type AddGuestDialogProps = Pick<UseDashboardReturn, 'isAddGuestDialogOpen' | 'setIsAddGuestDialogOpen' | 'selectedBedForGuestAdd' | 'addGuestForm' | 'handleAddGuestSubmit' | 'isAddingGuest'>

const rentCycleOptions: { value: RentCycleUnit, label: string }[] = [
  { value: 'minutes', label: 'Minutes (for testing)' },
  { value: 'hours', label: 'Hours' },
  { value: 'days', label: 'Days' },
  { value: 'weeks', label: 'Weeks' },
  { value: 'months', label: 'Months' },
];

export default function AddGuestDialog({ isAddGuestDialogOpen, setIsAddGuestDialogOpen, selectedBedForGuestAdd, addGuestForm, handleAddGuestSubmit, isAddingGuest }: AddGuestDialogProps) {
  const { currentUser } = useAppSelector((state) => state.user);
  const { featurePermissions } = usePermissionsStore();
  const canAddGuest = canAccess(featurePermissions, currentUser?.role, 'guests', 'add');

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
                  <FormItem><FormLabel>Email Address (Optional)</FormLabel><FormControl><Input type="email" placeholder="e.g., priya@example.com" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={addGuestForm.control} name="rentAmount" render={({ field }) => (
                  <FormItem><FormLabel>Monthly Rent</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={addGuestForm.control} name="depositAmount" render={({ field }) => (
                  <FormItem><FormLabel>Security Deposit (Optional)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <FormField control={addGuestForm.control} name="rentCycleUnit" render={({ field }) => (
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
                <FormField control={addGuestForm.control} name="rentCycleValue" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cycle Duration</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={addGuestForm.control} name="moveInDate" render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Move-in Date</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      value={field.value ? format(new Date(field.value), 'yyyy-MM-dd') : ''}
                      onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </form>
          </Form>
        </div>
        <DialogFooter className="pt-4">
          <DialogClose asChild><Button type="button" variant="secondary" disabled={isAddingGuest}>Cancel</Button></DialogClose>
          <Button type="submit" form="add-guest-form" disabled={!canAddGuest || isAddingGuest}>
            {isAddingGuest && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add Guest
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
