
'use client'

import React, { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, ArrowLeft } from 'lucide-react';
import { useAppSelector } from '@/lib/hooks';

import { RoomBasicsForm, roomBasicsSchema } from '@/components/dashboard/add-room/RoomBasicsForm';
import { PricingForm, pricingSchema } from '@/components/dashboard/add-room/PricingForm';
import { AmenitiesForm, amenitiesSchema } from '@/components/dashboard/add-room/AmenitiesForm';
import { RulesForm, rulesSchema } from '@/components/dashboard/add-room/RulesForm';
import { FoodServicesForm, foodServicesSchema } from '@/components/dashboard/add-room/FoodServicesForm';
import { MediaForm, mediaSchema } from '@/components/dashboard/add-room/MediaForm';
import { LocationForm, locationSchema } from '@/components/dashboard/add-room/LocationForm';

import { saveRoomData } from '@/lib/actions/roomActions';


// Combine all schemas
const roomFormSchema = roomBasicsSchema
  .merge(pricingSchema)
  .merge(amenitiesSchema)
  .merge(rulesSchema)
  .merge(foodServicesSchema)
  .merge(mediaSchema)
  .merge(locationSchema);

export type RoomFormValues = z.infer<typeof roomFormSchema>;

const tabs = [
  { value: 'basics', label: 'Basics' },
  { value: 'pricing', label: 'Pricing' },
  { value: 'amenities', label: 'Amenities' },
  { value: 'rules', label: 'Rules' },
  { value: 'food', label: 'Food' },
  { value: 'media', label: 'Media' },
  { value: 'location', label: 'Location' },
];

export default function AddRoomPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState(tabs[0].value);
  const [isLoading, startTransition] = useTransition();
  const { currentUser } = useAppSelector(state => state.user);

  const form = useForm<RoomFormValues>({
    resolver: zodResolver(roomFormSchema),
    defaultValues: {
      roomTitle: '',
      roomType: 'single',
      gender: 'unisex',
      category: 'standard',
      electricityBilling: 'metered',
      acCharge: { included: false, charge: 0 },
      amenities: [],
      furnishingType: 'semi',
      rules: [],
      preferredTenants: [],
      foodIncluded: false,
      meals: [],
      housekeepingFrequency: 'daily',
      laundryServices: false,
      images: [],
      available: true,
      availableFrom: new Date(),
    },
  });

  const onSubmit = (data: RoomFormValues) => {
    if (!currentUser) {
        toast({
            variant: "destructive",
            title: "Authentication Error",
            description: "You must be logged in to create a room.",
        });
        return;
    }
    
    startTransition(async () => {
      const result = await saveRoomData({ ...data, ownerId: currentUser.id });
      if (result.success) {
        toast({
          title: 'Room Created!',
          description: 'The new room has been successfully added to your property list.',
        });
        router.push('/dashboard/pg-management');
      } else {
        toast({
          variant: 'destructive',
          title: 'An error occurred',
          description: result.error,
        });
      }
    });
  };

  return (
    <div className="space-y-6">
       <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.back()}>
                <ArrowLeft />
            </Button>
            <div>
                <h1 className="text-2xl font-bold">Add a New Room</h1>
                <p className="text-muted-foreground">Fill out the details below to list a new room.</p>
            </div>
       </div>

        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <Card>
                    <CardHeader>
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="grid w-full grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
                                {tabs.map(tab => (
                                    <TabsTrigger key={tab.value} value={tab.value}>
                                        {tab.label}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                            <TabsContent value="basics"><RoomBasicsForm form={form} /></TabsContent>
                            <TabsContent value="pricing"><PricingForm form={form} /></TabsContent>
                            <TabsContent value="amenities"><AmenitiesForm form={form} /></TabsContent>
                            <TabsContent value="rules"><RulesForm form={form} /></TabsContent>
                            <TabsContent value="food"><FoodServicesForm form={form} /></TabsContent>
                            <TabsContent value="media"><MediaForm form={form} /></TabsContent>
                            <TabsContent value="location"><LocationForm form={form} /></TabsContent>
                        </Tabs>
                    </CardHeader>
                    <CardFooter className="flex justify-end">
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Save Room
                        </Button>
                    </CardFooter>
                </Card>
            </form>
        </Form>
    </div>
  );
}
