
'use client';

import { useFormContext, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RoomFormValues } from '@/app/dashboard/add-room/page';
import MultiSelect from './MultiSelect';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

export const amenitiesSchema = z.object({
  amenities: z.array(z.string()),
  furnishingType: z.enum(['fully', 'semi', 'unfurnished']),
});

const allAmenities = [
  { id: 'wifi', label: 'Wi-Fi' },
  { id: 'ac', label: 'AC' },
  { id: 'power-backup', label: 'Power Backup' },
  { id: 'attached-bathroom', label: 'Attached Bathroom' },
  { id: 'geyser', label: 'Geyser' },
  { id: 'tv', label: 'TV' },
  { id: 'fridge', label: 'Fridge' },
  { id: 'laundry', label: 'Laundry' },
  { id: 'housekeeping', label: 'Housekeeping' },
  { id: 'water-purifier', label: 'Water Purifier' },
  { id: 'cctv', label: 'CCTV' },
  { id: 'bed-with-mattress', label: 'Bed with Mattress' },
  { id: 'study-table', label: 'Study Table' },
  { id: 'almirah', label: 'Almirah' },
  { id: 'common-area', label: 'Common Area Access' },
  { id: 'kitchen-access', label: 'Kitchen Access' },
  { id: 'dining-hall', label: 'Dining Hall' },
  { id: 'parking', label: 'Parking (Bike/Car)' },
];

interface AmenitiesFormProps {
    form: ReturnType<typeof useFormContext<RoomFormValues>>;
}

export function AmenitiesForm({ form }: AmenitiesFormProps) {
  return (
    <div className="space-y-6 pt-6">
        <FormField
            control={form.control}
            name="amenities"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Amenities</FormLabel>
                    <FormControl>
                       <MultiSelect
                            options={allAmenities}
                            selected={field.value}
                            onChange={field.onChange}
                            placeholder="Select amenities..."
                       />
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />
        <FormField
            control={form.control}
            name="furnishingType"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Furnishing Type</FormLabel>
                    <FormControl>
                        <ToggleGroup type="single" value={field.value} onValueChange={field.onChange} className="justify-start">
                            <ToggleGroupItem value="fully">Fully Furnished</ToggleGroupItem>
                            <ToggleGroupItem value="semi">Semi-Furnished</ToggleGroupItem>
                            <ToggleGroupItem value="unfurnished">Unfurnished</ToggleGroupItem>
                        </ToggleGroup>
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />
    </div>
  );
}
