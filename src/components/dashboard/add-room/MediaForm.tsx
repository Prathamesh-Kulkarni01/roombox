
'use client';

import { useFormContext } from 'react-hook-form';
import { z } from 'zod';
import { FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { DatePicker } from './DatePicker';
import { Switch } from '@/components/ui/switch';
import { RoomFormValues } from '@/app/dashboard/add-room/page';

export const mediaSchema = z.object({
  images: z.array(z.string()).optional(),
  available: z.boolean(),
  availableFrom: z.date(),
  virtualTourLink: z.string().url().optional(),
});

interface MediaFormProps {
    form: ReturnType<typeof useFormContext<RoomFormValues>>;
}

export function MediaForm({ form }: MediaFormProps) {
  return (
    <div className="space-y-6 pt-6">
      <FormField control={form.control} name="images" render={({ field }) => (
        <FormItem>
          <FormLabel>Upload Room Images</FormLabel>
          <FormControl>
            <Input type="file" multiple accept="image/*" />
          </FormControl>
          <FormDescription>You can select multiple images. First image will be the cover.</FormDescription>
          <FormMessage />
        </FormItem>
      )} />
      <FormField control={form.control} name="virtualTourLink" render={({ field }) => (
        <FormItem>
          <FormLabel>Virtual Tour Link (Optional)</FormLabel>
          <FormControl>
            <Input placeholder="https://your-tour-link.com" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )} />
       <FormField control={form.control} name="available" render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                    <FormLabel>Is the room currently available?</FormLabel>
                </div>
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
            </FormItem>
        )} />
      <FormField
          control={form.control}
          name="availableFrom"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Available From</FormLabel>
              <DatePicker field={field} />
              <FormMessage />
            </FormItem>
          )}
        />
    </div>
  );
}
