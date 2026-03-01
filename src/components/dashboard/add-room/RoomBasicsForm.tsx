
'use client';

import { useFormContext } from 'react-hook-form';
import { z } from 'zod';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RoomFormValues } from '@/app/dashboard/add-room/page';

export const roomBasicsSchema = z.object({
  roomTitle: z.string().min(1, "Room name/number is required."),
  roomType: z.enum(['single', 'double', 'triple', 'dormitory']),
  gender: z.enum(['male', 'female', 'unisex', 'couples']),
  category: z.enum(['standard', 'premium', 'deluxe']),
  floor: z.coerce.number().optional(),
  block: z.string().optional(),
});

interface RoomBasicsFormProps {
    form: ReturnType<typeof useFormContext<RoomFormValues>>;
}

export function RoomBasicsForm({ form }: RoomBasicsFormProps) {
  return (
    <div className="space-y-6 pt-6">
      <FormField control={form.control} name="roomTitle" render={({ field }) => (
        <FormItem>
          <FormLabel>Room Name / Number</FormLabel>
          <FormControl><Input placeholder="e.g., Room 101, A-Block" {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
      <div className="grid md:grid-cols-2 gap-6">
        <FormField control={form.control} name="roomType" render={({ field }) => (
            <FormItem>
            <FormLabel>Room Type</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                    <SelectItem value="single">Single Sharing</SelectItem>
                    <SelectItem value="double">Double Sharing</SelectItem>
                    <SelectItem value="triple">Triple Sharing</SelectItem>
                    <SelectItem value="dormitory">Dormitory</SelectItem>
                </SelectContent>
            </Select>
            <FormMessage />
            </FormItem>
        )} />
        <FormField control={form.control} name="category" render={({ field }) => (
            <FormItem>
            <FormLabel>Room Category</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="deluxe">Deluxe</SelectItem>
                </SelectContent>
            </Select>
            <FormMessage />
            </FormItem>
        )} />
      </div>
      <div className="grid md:grid-cols-2 gap-6">
         <FormField control={form.control} name="gender" render={({ field }) => (
            <FormItem>
            <FormLabel>Gender Allowed</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="unisex">Unisex / Co-ed</SelectItem>
                    <SelectItem value="couples">Couples</SelectItem>
                </SelectContent>
            </Select>
            <FormMessage />
            </FormItem>
        )} />
         <FormField control={form.control} name="floor" render={({ field }) => (
            <FormItem>
            <FormLabel>Floor Number (Optional)</FormLabel>
            <FormControl><Input type="number" placeholder="e.g., 2" {...field} /></FormControl>
            <FormMessage />
            </FormItem>
        )} />
      </div>
       <FormField control={form.control} name="block" render={({ field }) => (
            <FormItem>
            <FormLabel>Block / Wing Name (Optional)</FormLabel>
            <FormControl><Input placeholder="e.g., A-Block" {...field} /></FormControl>
            <FormMessage />
            </FormItem>
        )} />
    </div>
  );
}
