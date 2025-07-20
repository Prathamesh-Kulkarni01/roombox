
'use client';

import { useFormContext } from 'react-hook-form';
import { z } from 'zod';
import { FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { RoomFormValues } from '@/app/dashboard/add-room/page';

export const pricingSchema = z.object({
  monthlyRent: z.coerce.number().min(1, 'Monthly rent is required.'),
  securityDeposit: z.coerce.number().min(0, 'Security deposit is required.'),
  lockInMonths: z.coerce.number().optional(),
  electricityBilling: z.enum(['included', 'metered', 'shared']),
  acCharge: z.object({
    included: z.boolean(),
    charge: z.coerce.number().optional(),
  }),
  maintenanceCharges: z.coerce.number().optional(),
});

interface PricingFormProps {
    form: ReturnType<typeof useFormContext<RoomFormValues>>;
}

export function PricingForm({ form }: PricingFormProps) {
  const acChargeIncluded = form.watch('acCharge.included');
  return (
    <div className="space-y-6 pt-6">
      <div className="grid md:grid-cols-2 gap-6">
        <FormField control={form.control} name="monthlyRent" render={({ field }) => (
          <FormItem>
            <FormLabel>Monthly Rent (₹)</FormLabel>
            <FormControl><Input type="number" placeholder="e.g., 12000" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="securityDeposit" render={({ field }) => (
          <FormItem>
            <FormLabel>Security Deposit (₹)</FormLabel>
            <FormControl><Input type="number" placeholder="e.g., 24000" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
      </div>
       <div className="grid md:grid-cols-2 gap-6">
         <FormField control={form.control} name="maintenanceCharges" render={({ field }) => (
            <FormItem>
                <FormLabel>Maintenance Charges (₹, optional)</FormLabel>
                <FormControl><Input type="number" placeholder="e.g., 500" {...field} /></FormControl>
                <FormMessage />
            </FormItem>
            )} />
        <FormField control={form.control} name="lockInMonths" render={({ field }) => (
          <FormItem>
            <FormLabel>Lock-in Period (Months, optional)</FormLabel>
            <FormControl><Input type="number" placeholder="e.g., 6" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
      </div>

       <FormField control={form.control} name="electricityBilling" render={({ field }) => (
          <FormItem>
          <FormLabel>Electricity Billing</FormLabel>
          <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
              <SelectContent>
                  <SelectItem value="included">Included in Rent</SelectItem>
                  <SelectItem value="metered">Meter-based</SelectItem>
                  <SelectItem value="shared">Shared Among Tenants</SelectItem>
              </SelectContent>
          </Select>
          <FormMessage />
          </FormItem>
      )} />

       <div className="space-y-4 rounded-md border p-4">
        <FormField control={form.control} name="acCharge.included" render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between">
                <div className="space-y-0.5">
                    <FormLabel>AC Charge Included?</FormLabel>
                    <FormDescription>Is there an additional charge for AC usage?</FormDescription>
                </div>
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
            </FormItem>
        )} />
        {acChargeIncluded && (
            <FormField control={form.control} name="acCharge.charge" render={({ field }) => (
                <FormItem>
                    <FormLabel>AC Charge (₹, optional)</FormLabel>
                    <FormControl><Input type="number" placeholder="Enter additional charge for AC" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )} />
        )}
       </div>
    </div>
  );
}
