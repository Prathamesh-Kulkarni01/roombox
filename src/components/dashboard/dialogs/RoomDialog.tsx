
'use client'

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save } from 'lucide-react';

import { RoomBasicsForm, roomBasicsSchema } from '@/components/dashboard/add-room/RoomBasicsForm';
import { PricingForm, pricingSchema } from '@/components/dashboard/add-room/PricingForm';
import { AmenitiesForm, amenitiesSchema } from '@/components/dashboard/add-room/AmenitiesForm';
import { RulesForm, rulesSchema } from '@/components/dashboard/add-room/RulesForm';
import { FoodServicesForm, foodServicesSchema } from '@/components/dashboard/add-room/FoodServicesForm';
import { MediaForm, mediaSchema } from '@/components/dashboard/add-room/MediaForm';
import type { UseDashboardReturn } from '@/hooks/use-dashboard';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

const tabs = [
  { value: 'basics', label: 'Basics' },
  { value: 'pricing', label: 'Pricing' },
  { value: 'amenities', label: 'Amenities' },
  { value: 'rules', label: 'Rules' },
  { value: 'food', label: 'Food' },
  { value: 'media', label: 'Media' },
];

type RoomDialogProps = Pick<UseDashboardReturn, 
  'isRoomDialogOpen' | 
  'setIsRoomDialogOpen' | 
  'roomToEdit' |
  'roomForm' |
  'handleRoomSubmit' |
  'isSavingRoom'
>;

export default function RoomDialog({ isRoomDialogOpen, setIsRoomDialogOpen, roomToEdit, roomForm, handleRoomSubmit, isSavingRoom }: RoomDialogProps) {
  const [activeTab, setActiveTab] = React.useState(tabs[0].value);

  const onSubmit = (data: any) => {
    handleRoomSubmit(data);
  };
  
  return (
    <Dialog open={isRoomDialogOpen} onOpenChange={setIsRoomDialogOpen}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle>{roomToEdit ? 'Edit Room' : 'Add a New Room'}</DialogTitle>
          <DialogDescription>
            Fill out the details below. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <Form {...roomForm}>
          <form onSubmit={form.handleSubmit(onSubmit)} id="room-form" className="flex flex-col flex-1 overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 overflow-hidden">
                <div className="px-6 border-b">
                  <ScrollArea className="w-full whitespace-nowrap">
                      <TabsList className="inline-flex h-10 items-center justify-start rounded-none bg-transparent p-0 w-full">
                          {tabs.map(tab => (
                              <TabsTrigger key={tab.value} value={tab.value} className="relative inline-flex items-center justify-center whitespace-nowrap rounded-none bg-transparent px-4 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:scale-x-0 data-[state=active]:after:scale-x-100 data-[state=active]:after:bg-primary after:transition-transform">
                                  {tab.label}
                              </TabsTrigger>
                          ))}
                      </TabsList>
                      <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                </div>
                <ScrollArea className="flex-1 overflow-y-auto">
                    <div className="p-6">
                        <TabsContent value="basics"><RoomBasicsForm form={roomForm} /></TabsContent>
                        <TabsContent value="pricing"><PricingForm form={roomForm} /></TabsContent>
                        <TabsContent value="amenities"><AmenitiesForm form={roomForm} /></TabsContent>
                        <TabsContent value="rules"><RulesForm form={roomForm} /></TabsContent>
                        <TabsContent value="food"><FoodServicesForm form={roomForm} /></TabsContent>
                        <TabsContent value="media"><MediaForm form={roomForm} /></TabsContent>
                    </div>
                </ScrollArea>
            </Tabs>
          </form>
        </Form>
        <DialogFooter className="p-6 pt-4 border-t bg-background">
            <DialogClose asChild>
                <Button type="button" variant="secondary">Cancel</Button>
            </DialogClose>
            <Button type="submit" form="room-form" disabled={isSavingRoom}>
                {isSavingRoom ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {roomToEdit ? 'Save Changes' : 'Add Room'}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
