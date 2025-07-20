
'use client';

import { useFormContext } from 'react-hook-form';
import { z } from 'zod';
import { FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { RoomFormValues } from '@/app/dashboard/add-room/page';

export const locationSchema = z.object({
  address: z.string().optional(),
  landmark: z.string().optional(),
  distanceCollege: z.string().optional(),
  distanceOffice: z.string().optional(),
  distanceMetro: z.string().optional(),
  description: z.string().optional(),
  showLocation: z.boolean().optional(),
});

interface LocationFormProps {
    form: ReturnType<typeof useFormContext<RoomFormValues>>;
}

export function LocationForm({ form }: LocationFormProps) {
  return (
    <div className="space-y-6 pt-6">
        <FormField control={form.control} name="address" render={({ field }) => (
          <FormItem>
            <FormLabel>Full Address</FormLabel>
            <FormControl><Textarea placeholder="Enter the full address of the property" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="landmark" render={({ field }) => (
          <FormItem>
            <FormLabel>Nearest Landmark</FormLabel>
            <FormControl><Input placeholder="e.g., Near Forum Mall" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
         <div className="grid md:grid-cols-3 gap-6">
             <FormField control={form.control} name="distanceCollege" render={({ field }) => (
                <FormItem><FormLabel>Distance from College</FormLabel><FormControl><Input placeholder="e.g., 2km" {...field} /></FormControl><FormMessage /></FormItem>
             )} />
             <FormField control={form.control} name="distanceOffice" render={({ field }) => (
                <FormItem><FormLabel>Distance from Office Hub</FormLabel><FormControl><Input placeholder="e.g., 5km" {...field} /></FormControl><FormMessage /></FormItem>
             )} />
             <FormField control={form.control} name="distanceMetro" render={({ field }) => (
                <FormItem><FormLabel>Distance from Metro</FormLabel><FormControl><Input placeholder="e.g., 500m" {...field} /></FormControl><FormMessage /></FormItem>
             )} />
        </div>
         <FormField control={form.control} name="description" render={({ field }) => (
            <FormItem>
                <FormLabel>Room/Property Description</FormLabel>
                <FormControl><Textarea rows={5} placeholder="Describe the room, property, or neighborhood..." {...field} /></FormControl>
                <FormMessage />
            </FormItem>
         )} />
        <FormField control={form.control} name="showLocation" render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                    <FormLabel>Show Location on Map</FormLabel>
                    <FormDescription>Allow tenants to see the approximate location on a map.</FormDescription>
                </div>
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
            </FormItem>
        )} />
    </div>
  );
}
