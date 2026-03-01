
'use client'

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppSelector, useAppDispatch } from '@/lib/hooks';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Building, PlusCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { saveKycConfig } from '@/lib/slices/kycConfigSlice';
import type { KycDocumentConfig } from '@/lib/types';
import KycManagementTab from '@/components/dashboard/KycManagementTab';

const kycConfigItemSchema = z.object({
    id: z.string(),
    label: z.string().min(1, 'Label is required'),
    type: z.enum(['image', 'pdf']),
    required: z.boolean(),
});

const kycConfigSchema = z.object({
    configs: z.array(kycConfigItemSchema)
});

type KycConfigFormValues = z.infer<typeof kycConfigSchema>;


export default function KycPage() {
    const { guests, pgs, isLoading } = useAppSelector(state => ({
        guests: state.guests.guests,
        pgs: state.pgs.pgs,
        isLoading: state.app.isLoading
    }));
    const { kycConfigs } = useAppSelector((state) => state.kycConfig)
    const dispatch = useAppDispatch();
    const { toast } = useToast();

    const kycConfigForm = useForm<KycConfigFormValues>({
        resolver: zodResolver(kycConfigSchema),
        defaultValues: { configs: kycConfigs || [] }
    });

    const { fields, append, remove } = useFieldArray({
        control: kycConfigForm.control,
        name: "configs",
    });

    useState(() => {
        kycConfigForm.reset({ configs: kycConfigs || [] })
    });

    const handleSaveKycConfig = async (data: KycConfigFormValues) => {
        try {
            await dispatch(saveKycConfig(data.configs)).unwrap();
            toast({ title: "KYC Configuration Saved", description: "Your KYC document requirements have been updated." });
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Error", description: error.message || "Could not save KYC configuration." });
        }
    }

    const addNewKycDoc = () => {
      append({ id: `doc-${Date.now()}`, label: 'New Document', type: 'image', required: true });
    }
    
    if (isLoading) {
        return (
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-5 w-72" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-48 w-full" />
                    </CardContent>
                </Card>
            </div>
        )
    }

     if (pgs.length === 0) {
        return (
          <div className="flex items-center justify-center h-full min-h-[calc(100vh-250px)]">
              <div className="text-center p-8 bg-card rounded-lg border">
                  <Building className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h2 className="mt-4 text-xl font-semibold">Add a Property First</h2>
                  <p className="mt-2 text-muted-foreground max-w-sm">You need to add a property before you can manage guest KYC.</p>
                  <Button asChild className="mt-4">
                    <Link href="/dashboard/pg-management">Add Property</Link>
                  </Button>
              </div>
          </div>
        )
    }
    
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>KYC Management</CardTitle>
                    <CardDescription>Review guest documents and configure your verification requirements.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="verification">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="verification">Verification</TabsTrigger>
                            <TabsTrigger value="configuration">Configuration</TabsTrigger>
                        </TabsList>
                        <TabsContent value="verification" className="mt-4">
                             <KycManagementTab guests={guests} />
                        </TabsContent>
                        <TabsContent value="configuration" className="mt-4">
                             <Form {...kycConfigForm}>
                                <form id="kyc-config-form" onSubmit={kycConfigForm.handleSubmit(handleSaveKycConfig)} className="space-y-4">
                                    {fields && fields.map((field, index) => (
                                        <div key={field.id} className="grid grid-cols-1 md:grid-cols-8 gap-2 items-end p-2 border rounded-md">
                                            <FormField control={kycConfigForm.control} name={`configs.${index}.label`} render={({ field }) => (
                                                <FormItem className="md:col-span-3"><FormLabel>Document Label</FormLabel><FormControl><Input placeholder="e.g., Aadhaar Card" {...field} /></FormControl><FormMessage /></FormItem>
                                            )} />
                                            <FormField control={kycConfigForm.control} name={`configs.${index}.type`} render={({ field }) => (
                                                <FormItem className="md:col-span-2"><FormLabel>Type</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="image">Image</SelectItem>
                                                            <SelectItem value="pdf">PDF</SelectItem>
                                                        </SelectContent>
                                                    </Select><FormMessage />
                                                </FormItem>
                                            )} />
                                            <FormField control={kycConfigForm.control} name={`configs.${index}.required`} render={({ field }) => (
                                                <FormItem className="flex flex-col justify-end h-full md:col-span-2">
                                                    <div className="flex items-center space-x-2 h-10">
                                                        <Switch id={`required-${index}`} checked={field.value} onCheckedChange={field.onChange} />
                                                        <Label htmlFor={`required-${index}`}>Required</Label>
                                                    </div>
                                                </FormItem>
                                            )} />
                                            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                                        </div>
                                    ))}
                                    <Button type="button" variant="outline" onClick={addNewKycDoc} className="border-dashed"><PlusCircle className="mr-2 h-4 w-4" /> Add Document Requirement</Button>
                                    <div className="flex justify-end pt-4">
                                         <Button type="submit" form="kyc-config-form">Save KYC Configuration</Button>
                                    </div>
                                </form>
                            </Form>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
