
'use client';

import { useFormContext } from 'react-hook-form';
import { z } from 'zod';
import { FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { RoomFormValues } from '@/lib/actions/roomActions';

export const pricingSchema = z.object({
  monthlyRent: z.coerce.number().min(0).optional().default(0),
  securityDeposit: z.coerce.number().min(0).optional().default(0),
  lockInMonths: z.coerce.number().optional(),
  electricityBilling: z.enum(['included', 'metered', 'shared']).optional().default('included'),
  acCharge: z.object({
    included: z.boolean().optional().default(false),
    charge: z.coerce.number().optional(),
  }).optional().default({ included: false, charge: 0 }),
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
            <FormLabel>Monthly Rent (₹, Optional)</FormLabel>
            <FormControl><Input type="number" placeholder="e.g., 12000" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="securityDeposit" render={({ field }) => (
          <FormItem>
            <FormLabel>Security Deposit (₹, Optional)</FormLabel>
            <FormControl><Input type="number" placeholder="e.g., 24000" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <FormField control={form.control} name="maintenanceCharges" render={({ field }) => (
          <FormItem>
            <FormLabel>Maintenance Charges (₹, Optional)</FormLabel>
            <FormControl><Input type="number" placeholder="e.g., 500" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="lockInMonths" render={({ field }) => (
          <FormItem>
            <FormLabel>Lock-in Period (Months, Optional)</FormLabel>
            <FormControl><Input type="number" placeholder="e.g., 6" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
      </div>

      <FormField control={form.control} name="electricityBilling" render={({ field }) => (
        <FormItem>
          <FormLabel>Electricity Billing (Optional)</FormLabel>
          <Select onValueChange={field.onChange} defaultValue={field.value || 'included'}>
            <FormControl><SelectTrigger><SelectValue placeholder="Included in Rent" /></SelectTrigger></FormControl>
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
