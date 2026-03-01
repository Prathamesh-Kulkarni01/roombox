
'use client';

import { useFormContext } from 'react-hook-form';
import { z } from 'zod';
import { FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import MultiSelect from './MultiSelect';
import { RoomFormValues } from '@/app/dashboard/add-room/page';

export const foodServicesSchema = z.object({
  foodIncluded: z.boolean(),
  meals: z.array(z.string()).optional(),
  vegNonVeg: z.enum(['veg', 'non-veg', 'both']).optional(),
  housekeepingFrequency: z.enum(['daily', 'alternate', 'weekly']).optional(),
  laundryServices: z.boolean(),
});

const mealOptions = [
    { id: 'breakfast', label: 'Breakfast' },
    { id: 'lunch', label: 'Lunch' },
    { id: 'dinner', label: 'Dinner' },
];

interface FoodServicesFormProps {
    form: ReturnType<typeof useFormContext<RoomFormValues>>;
}

export function FoodServicesForm({ form }: FoodServicesFormProps) {
    const foodIncluded = form.watch('foodIncluded');
    const laundryServices = form.watch('laundryServices');
  return (
    <div className="space-y-6 pt-6">
        <FormField control={form.control} name="foodIncluded" render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                    <FormLabel>Food Included?</FormLabel>
                    <FormDescription>Is food provided as part of the rent package?</FormDescription>
                </div>
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
            </FormItem>
        )} />
        {foodIncluded && (
            <div className="space-y-4 pl-4 border-l-2 ml-2">
                 <FormField
                    control={form.control}
                    name="meals"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Meals Provided</FormLabel>
                            <FormControl>
                            <MultiSelect
                                    options={mealOptions}
                                    selected={field.value || []}
                                    onChange={field.onChange}
                                    placeholder="Select meals..."
                            />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="vegNonVeg"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Veg/Non-Veg Options</FormLabel>
                            <FormControl>
                                <ToggleGroup type="single" value={field.value} onValueChange={field.onChange} className="justify-start">
                                    <ToggleGroupItem value="veg">Veg Only</ToggleGroupItem>
                                    <ToggleGroupItem value="non-veg">Non-Veg Only</ToggleGroupItem>
                                    <ToggleGroupItem value="both">Both</ToggleGroupItem>
                                </ToggleGroup>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
        )}

        <FormField control={form.control} name="housekeepingFrequency" render={({ field }) => (
            <FormItem>
            <FormLabel>Housekeeping Frequency</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="alternate">Every Other Day</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
            </Select>
            <FormMessage />
            </FormItem>
        )} />

        <FormField control={form.control} name="laundryServices" render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                    <FormLabel>Laundry Services Available?</FormLabel>
                    <FormDescription>Are there on-site or partnered laundry services?</FormDescription>
                </div>
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
            </FormItem>
        )} />
    </div>
  );
}

