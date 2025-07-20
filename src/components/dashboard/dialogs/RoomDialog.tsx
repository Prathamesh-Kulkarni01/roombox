
'use client'

import React from 'react';
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
import { LocationForm, locationSchema } from '@/components/dashboard/add-room/LocationForm';
import type { UseDashboardReturn } from '@/hooks/use-dashboard';

const tabs = [
  { value: 'basics', label: 'Basics' },
  { value: 'pricing', label: 'Pricing' },
  { value: 'amenities', label: 'Amenities' },
  { value: 'rules', label: 'Rules' },
  { value: 'food', label: 'Food' },
  { value: 'media', label: 'Media' },
  { value: 'location', label: 'Location' },
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
      <DialogContent className="sm:max-w-4xl max-h-[90dvh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{roomToEdit ? 'Edit Room' : 'Add a New Room'}</DialogTitle>
          <DialogDescription>
            Fill out the details below. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
            <Form {...roomForm}>
                <form onSubmit={roomForm.handleSubmit(onSubmit)} id="room-form" className="flex flex-col h-full">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full overflow-hidden">
                        <TabsList className="grid w-full grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
                            {tabs.map(tab => (
                                <TabsTrigger key={tab.value} value={tab.value}>
                                    {tab.label}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                        <div className="flex-1 overflow-y-auto pr-2 -mr-6 mt-4">
                            <TabsContent value="basics" forceMount className={activeTab === 'basics' ? '' : 'hidden'}><RoomBasicsForm form={roomForm} /></TabsContent>
                            <TabsContent value="pricing" forceMount className={activeTab === 'pricing' ? '' : 'hidden'}><PricingForm form={roomForm} /></TabsContent>
                            <TabsContent value="amenities" forceMount className={activeTab === 'amenities' ? '' : 'hidden'}><AmenitiesForm form={roomForm} /></TabsContent>
                            <TabsContent value="rules" forceMount className={activeTab === 'rules' ? '' : 'hidden'}><RulesForm form={roomForm} /></TabsContent>
                            <TabsContent value="food" forceMount className={activeTab === 'food' ? '' : 'hidden'}><FoodServicesForm form={roomForm} /></TabsContent>
                            <TabsContent value="media" forceMount className={activeTab === 'media' ? '' : 'hidden'}><MediaForm form={roomForm} /></TabsContent>
                            <TabsContent value="location" forceMount className={activeTab === 'location' ? '' : 'hidden'}><LocationForm form={roomForm} /></TabsContent>
                        </div>
                    </Tabs>
                </form>
            </Form>
        </div>
        <DialogFooter className="pt-4 border-t">
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
