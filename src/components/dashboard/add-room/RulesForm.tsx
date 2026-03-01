
'use client';

import { useFormContext } from 'react-hook-form';
import { z } from 'zod';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import MultiSelect from './MultiSelect';
import { RoomFormValues } from '@/app/dashboard/add-room/page';

export const rulesSchema = z.object({
  rules: z.array(z.string()),
  preferredTenants: z.array(z.string()),
});

const allRules = [
    { id: 'no-smoking', label: 'No Smoking' },
    { id: 'no-alcohol', label: 'No Alcohol' },
    { id: 'no-pets', label: 'No Pets' },
    { id: 'no-visitors', label: 'No Visitors Allowed' },
    { id: 'strict-timings', label: 'Strict Timings' },
    { id: 'separate-entry', label: 'Separate Entry for Girls/Boys' },
];

const allTenantTypes = [
    { id: 'working-professionals', label: 'Working Professionals' },
    { id: 'students', label: 'Students' },
    { id: 'short-term', label: 'Short-term Stay' },
    { id: 'long-term', label: 'Long-term Stay' },
    { id: 'married-couples', label: 'Married Couples' },
];

interface RulesFormProps {
    form: ReturnType<typeof useFormContext<RoomFormValues>>;
}

export function RulesForm({ form }: RulesFormProps) {
  return (
    <div className="space-y-6 pt-6">
        <FormField
            control={form.control}
            name="rules"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>PG Rules</FormLabel>
                    <FormControl>
                       <MultiSelect
                            options={allRules}
                            selected={field.value}
                            onChange={field.onChange}
                            placeholder="Select applicable rules..."
                       />
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />
        <FormField
            control={form.control}
            name="preferredTenants"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Preferred Tenants</FormLabel>
                    <FormControl>
                       <MultiSelect
                            options={allTenantTypes}
                            selected={field.value}
                            onChange={field.onChange}
                            placeholder="Select preferred tenant types..."
                       />
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />
    </div>
  );
}
