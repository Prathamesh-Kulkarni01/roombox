import { useFormContext } from 'react-hook-form';
import { z } from 'zod';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RoomFormValues } from '@/lib/actions/roomActions';
import { PG } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

interface RoomBasicsFormProps {
  form: ReturnType<typeof useFormContext<RoomFormValues>>;
  pg: PG;
  onOpenFloorDialog: () => void;
}

export function RoomBasicsForm({ form, pg, onOpenFloorDialog }: RoomBasicsFormProps) {
  const floors = pg.floors || [];

  return (
    <div className="space-y-6 pt-6">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          Floor Selection
        </label>
        <div className="flex items-center gap-2">
          <FormField control={form.control} name="floorId" render={({ field }) => (
            <FormItem className="flex-1">
              <Select onValueChange={field.onChange} value={field.value || (floors[0]?.id)}>
                <FormControl><SelectTrigger className="h-11"><SelectValue placeholder="Select Floor" /></SelectTrigger></FormControl>
                <SelectContent>
                  {floors.map((floor) => (
                    <SelectItem key={floor.id} value={floor.id}>
                      {floor.name}
                    </SelectItem>
                  ))}
                  {floors.length === 0 && <div className="p-2 text-sm text-muted-foreground">No floors found</div>}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-11 w-11 shrink-0"
            onClick={onOpenFloorDialog}
            title="Add New Floor"
          >
            <PlusCircle className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <FormField control={form.control} name="roomTitle" render={({ field }) => (
        <FormItem>
          <FormLabel>Room Name / Number</FormLabel>
          <FormControl><Input placeholder="e.g., Room 101, A-Block" className="h-11" {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />

      <div className="grid md:grid-cols-2 gap-6">
        <FormField control={form.control} name="roomType" render={({ field }) => (
          <FormItem>
            <FormLabel>Room Type</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value || 'double'}>
              <FormControl><SelectTrigger className="h-11"><SelectValue placeholder="Double Sharing" /></SelectTrigger></FormControl>
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
            <Select onValueChange={field.onChange} defaultValue={field.value || 'standard'}>
              <FormControl><SelectTrigger className="h-11"><SelectValue placeholder="Standard" /></SelectTrigger></FormControl>
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
            <Select onValueChange={field.onChange} defaultValue={field.value || 'unisex'}>
              <FormControl><SelectTrigger className="h-11"><SelectValue placeholder="Unisex" /></SelectTrigger></FormControl>
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
        <FormField control={form.control} name="block" render={({ field }) => (
          <FormItem>
            <FormLabel>Block / Wing (Optional)</FormLabel>
            <FormControl><Input placeholder="e.g., A-Block" className="h-11" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
      </div>
    </div>
  );
}
