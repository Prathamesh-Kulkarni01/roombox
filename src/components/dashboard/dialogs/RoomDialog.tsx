
'use client'

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Save } from 'lucide-react';

import { RoomBasicsForm } from '@/components/dashboard/add-room/RoomBasicsForm';
import { PricingForm } from '@/components/dashboard/add-room/PricingForm';
import { AmenitiesForm } from '@/components/dashboard/add-room/AmenitiesForm';
import { RulesForm } from '@/components/dashboard/add-room/RulesForm';
import { FoodServicesForm } from '@/components/dashboard/add-room/FoodServicesForm';
import { MediaForm } from '@/components/dashboard/add-room/MediaForm';
import type { UseDashboardReturn } from '@/hooks/use-dashboard';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { RoomFormValues } from '@/lib/actions/roomActions';
import type { Room, PG } from '@/lib/types';
import { parseISO } from 'date-fns';

const tabs = [
  { value: 'basics', label: 'Basics' },
  { value: 'pricing', label: 'Pricing (Optional)' },
  { value: 'amenities', label: 'Amenities (Optional)' },
  { value: 'rules', label: 'Rules (Optional)' },
  { value: 'food', label: 'Food (Optional)' },
  { value: 'media', label: 'Media (Optional)' },
];

interface RoomDialogProps extends Pick<UseDashboardReturn,
  'isRoomDialogOpen' |
  'setIsRoomDialogOpen' |
  'roomToEdit' |
  'roomForm' |
  'handleRoomSubmit' |
  'isSavingRoom'
> {
  pg: PG;
  onOpenFloorDialog: () => void;
}

export default function RoomDialog({
  isRoomDialogOpen,
  setIsRoomDialogOpen,
  roomToEdit,
  roomForm,
  handleRoomSubmit,
  isSavingRoom,
  pg,
  onOpenFloorDialog
}: RoomDialogProps) {
  const [activeTab, setActiveTab] = React.useState(tabs[0].value);

  React.useEffect(() => {
    if (isRoomDialogOpen && roomToEdit) {
      // When editing, map all the room data to the form values
      // This is the fix for the data loss bug.
      const rawDate = (roomToEdit as any).availableFrom;
      const availableFromDate = typeof rawDate === 'string' ? parseISO(rawDate) : rawDate instanceof Date ? rawDate : new Date();

      const formValues: Partial<RoomFormValues> = {
        // RoomBasicsForm
        roomTitle: roomToEdit.name,
        roomType: (roomToEdit as any).roomType,
        gender: (roomToEdit as any).gender,
        category: (roomToEdit as any).category,
        floor: (roomToEdit as any).floor,
        block: (roomToEdit as any).block,

        // PricingForm
        monthlyRent: roomToEdit.rent,
        securityDeposit: roomToEdit.deposit,
        lockInMonths: (roomToEdit as any).lockInMonths,
        electricityBilling: (roomToEdit as any).electricityBilling,
        acCharge: (roomToEdit as any).acCharge,
        maintenanceCharges: (roomToEdit as any).maintenanceCharges,

        // AmenitiesForm
        amenities: roomToEdit.amenities,
        furnishingType: (roomToEdit as any).furnishingType,

        // RulesForm
        rules: (roomToEdit as any).rules,
        preferredTenants: (roomToEdit as any).preferredTenants,

        // FoodServicesForm
        foodIncluded: (roomToEdit as any).foodIncluded,
        meals: (roomToEdit as any).meals,
        vegNonVeg: (roomToEdit as any).vegNonVeg,
        housekeepingFrequency: (roomToEdit as any).housekeepingFrequency,
        laundryServices: (roomToEdit as any).laundryServices,

        // MediaForm
        images: (roomToEdit as any).images,
        available: (roomToEdit as any).available,
        availableFrom: availableFromDate,
        virtualTourLink: (roomToEdit as any).virtualTourLink,
      };
      roomForm.reset(formValues);
    } else if (isRoomDialogOpen) {
      // When adding, reset to default
      roomForm.reset({
        amenities: [],
        rules: [],
        preferredTenants: [],
        meals: [],
        images: [],
      });
    }
  }, [isRoomDialogOpen, roomToEdit, roomForm]);

  return (
    <Dialog open={isRoomDialogOpen} onOpenChange={setIsRoomDialogOpen}>
      <DialogContent className="sm:max-w-4xl p-0 flex flex-col max-h-[90dvh]">
        <DialogHeader className="p-6 pb-2 flex-shrink-0 border-b">
          <DialogTitle>{roomToEdit ? 'Edit Room' : 'Add a New Room'}</DialogTitle>
          <DialogDescription>
            {roomToEdit ? `Editing room: ${roomToEdit.name}.` : "Fill out the details below. Click save when you're done."}
          </DialogDescription>
        </DialogHeader>
        <Form {...roomForm}>
          <form onSubmit={handleRoomSubmit} id="room-form" className="flex flex-col flex-1 overflow-hidden min-h-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 overflow-hidden min-h-0">
              <div className="px-6 border-b flex-shrink-0">
                <ScrollArea className="w-full whitespace-nowrap">
                  <TabsList className="inline-flex h-10 items-center justify-start rounded-none bg-transparent p-0 w-full">
                    {tabs.map(tab => (
                      <TabsTrigger key={tab.value} value={tab.value} className="relative inline-flex items-center justify-center whitespace-nowrap rounded-sm px-4 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary">
                        {tab.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </div>
              <div className="flex-1 overflow-y-auto">
                <div className="p-6">
                  <TabsContent value="basics" forceMount={true} hidden={activeTab !== 'basics'} className="m-0"><RoomBasicsForm form={roomForm} pg={pg} onOpenFloorDialog={onOpenFloorDialog} /></TabsContent>
                  <TabsContent value="pricing" forceMount={true} hidden={activeTab !== 'pricing'} className="m-0"><PricingForm form={roomForm} /></TabsContent>
                  <TabsContent value="amenities" forceMount={true} hidden={activeTab !== 'amenities'} className="m-0"><AmenitiesForm form={roomForm} /></TabsContent>
                  <TabsContent value="rules" forceMount={true} hidden={activeTab !== 'rules'} className="m-0"><RulesForm form={roomForm} /></TabsContent>
                  <TabsContent value="food" forceMount={true} hidden={activeTab !== 'food'} className="m-0"><FoodServicesForm form={roomForm} /></TabsContent>
                  <TabsContent value="media" forceMount={true} hidden={activeTab !== 'media'} className="m-0"><MediaForm form={roomForm} /></TabsContent>
                </div>
              </div>
            </Tabs>
          </form>
        </Form>
        <DialogFooter className="p-6 pt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2 border-t flex-shrink-0 bg-background">
          <DialogClose asChild>
            <Button type="button" variant="secondary" className="w-full sm:w-auto">Cancel</Button>
          </DialogClose>
          <Button type="submit" form="room-form" disabled={isSavingRoom} className="w-full sm:w-auto">
            {isSavingRoom ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {roomToEdit ? 'Save Changes' : 'Add Room'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
