
'use client'

import React, { useState, useTransition, useMemo } from "react"
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { produce } from 'immer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { plans } from "@/lib/mock-data"
import type { PlanName, ChargeTemplate, UserRole, KycDocumentConfig } from "@/lib/types"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { AlertCircle, PlusCircle, Pencil, Trash2, Settings, Loader2, TestTube2, Calendar, Users, Star, FileText } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { saveChargeTemplate, updateChargeTemplate, deleteChargeTemplate } from "@/lib/slices/chargeTemplatesSlice"
import { updatePermissions, type FeaturePermissions, type RolePermissions } from '@/lib/slices/permissionsSlice'
import { saveKycConfig } from '@/lib/slices/kycConfigSlice'
import { featurePermissionConfig } from '@/lib/permissions';
import { format, parseISO } from "date-fns"
import { cn } from "@/lib/utils"
import { setMockDate } from "@/lib/slices/appSlice"
import { reconcileRentCycle } from "@/lib/slices/guestsSlice"
import SubscriptionDialog from "@/components/dashboard/dialogs/SubscriptionDialog"

const chargeTemplateSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters."),
  calculation: z.enum(['fixed', 'unit']),
  unitCost: z.coerce.number().optional(),
  splitMethod: z.enum(['equal', 'room', 'custom']),
  frequency: z.enum(['monthly', 'one-time']),
  autoAddToDialog: z.boolean().default(true),
  billingDayOfMonth: z.coerce.number().min(1).max(28).default(1),
})

const kycConfigItemSchema = z.object({
    id: z.string(),
    label: z.string().min(1, 'Label is required'),
    type: z.enum(['image', 'pdf']),
    required: z.boolean(),
});
const kycConfigSchema = z.object({
    configs: z.array(kycConfigItemSchema)
});

type ChargeTemplateFormValues = z.infer<typeof chargeTemplateSchema>;
type KycConfigFormValues = z.infer<typeof kycConfigSchema>;


export default function SettingsPage() {
  const dispatch = useAppDispatch()
  const { currentUser, currentPlan } = useAppSelector((state) => state.user)
  const { chargeTemplates } = useAppSelector((state) => state.chargeTemplates)
  const { kycConfigs } = useAppSelector((state) => state.kycConfig)
  const { guests } = useAppSelector((state) => state.guests);
  const { featurePermissions } = useAppSelector((state) => state.permissions);
  const { mockDate } = useAppSelector((state) => state.app);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [templateToEdit, setTemplateToEdit] = useState<ChargeTemplate | null>(null);
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false);
  const [isSubDialogOpen, setIsSubDialogOpen] = useState(false);
  const [roleToEdit, setRoleToEdit] = useState<UserRole | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<RolePermissions>({});
  const { toast } = useToast();

  const chargeTemplateForm = useForm<ChargeTemplateFormValues>({
    resolver: zodResolver(chargeTemplateSchema),
  });

  const kycConfigForm = useForm<KycConfigFormValues>({
    resolver: zodResolver(kycConfigSchema),
    defaultValues: { configs: [] }
  });

  const { fields, append, remove, move } = useFieldArray({
    control: kycConfigForm.control,
    name: "configs",
  });
  
  React.useEffect(() => {
    kycConfigForm.reset({ configs: kycConfigs || [] })
  }, [kycConfigs, kycConfigForm]);

  const calculationType = chargeTemplateForm.watch('calculation');

  const handleOpenTemplateDialog = (template: ChargeTemplate | null) => {
    setTemplateToEdit(template);
    if (template) {
        chargeTemplateForm.reset(template);
    } else {
        chargeTemplateForm.reset({
            name: '',
            calculation: 'fixed',
            unitCost: undefined,
            splitMethod: 'equal',
            frequency: 'monthly',
            autoAddToDialog: true,
            billingDayOfMonth: 1,
        });
    }
    setIsTemplateDialogOpen(true);
  }

  const handleOpenPermissionsDialog = (role: UserRole) => {
    setRoleToEdit(role);
    setSelectedPermissions(featurePermissions || {});
    setIsPermissionsDialogOpen(true);
  }

  const handlePermissionChange = (feature: string, action: string, checked: boolean) => {
      if (!roleToEdit) return;
      
      const nextState = produce(selectedPermissions, draft => {
          if (!draft[roleToEdit]) {
              draft[roleToEdit] = {};
          }
          if (!draft[roleToEdit]![feature]) {
              draft[roleToEdit]![feature] = {};
          }
          draft[roleToEdit]![feature][action] = checked;
      });
      setSelectedPermissions(nextState);
  }

  const handleSavePermissions = () => {
    if (!roleToEdit || !featurePermissions) return;
    const updatedPermissions = produce(featurePermissions, draft => {
        draft[roleToEdit] = selectedPermissions[roleToEdit]!;
    });
    dispatch(updatePermissions(updatedPermissions));
    toast({ title: "Permissions Updated", description: `Permissions for ${roleToEdit} have been saved.`});
    setIsPermissionsDialogOpen(false);
  }
  
  const handleTemplateSubmit = async (data: ChargeTemplateFormValues) => {
    try {
        if (templateToEdit) {
            await dispatch(updateChargeTemplate({ ...templateToEdit, ...data })).unwrap();
            toast({ title: "Template Updated", description: "Your charge template has been updated." });
        } else {
            await dispatch(saveChargeTemplate(data)).unwrap();
            toast({ title: "Template Created", description: "Your new charge template is ready to use." });
        }
        setIsTemplateDialogOpen(false);
    } catch (error: any) {
        toast({ variant: 'destructive', title: "Error", description: error.message || "Could not save the template." });
    }
  }

  const handleDeleteTemplate = (templateId: string) => {
    if (confirm("Are you sure you want to delete this template? This cannot be undone.")) {
        dispatch(deleteChargeTemplate(templateId));
        toast({ title: "Template Deleted" });
    }
  }

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

  const handleReconcileAll = () => {
    toast({ title: 'Rent Reconciliation Started', description: 'Checking all guests for overdue rent based on the simulated date.' });
    guests.forEach(guest => {
        dispatch(reconcileRentCycle(guest.id));
    });
  }

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const dateValue = e.target.value;
      if(dateValue) {
          const date = new Date(dateValue);
          const timezoneOffset = date.getTimezoneOffset() * 60000;
          const adjustedDate = new Date(date.getTime() + timezoneOffset);
          dispatch(setMockDate(adjustedDate.toISOString()));
      } else {
          dispatch(setMockDate(null));
      }
  }

  const staffRoles: UserRole[] = ['manager', 'cook', 'cleaner', 'security', 'other'];
  const currentRolePermissions = roleToEdit ? selectedPermissions?.[roleToEdit] : {};

  if (!currentUser || !currentPlan) {
    return null
  }

  return (
    <>
    <SubscriptionDialog open={isSubDialogOpen} onOpenChange={setIsSubDialogOpen} />
    
    <div className="flex flex-col gap-8">
        <Card>
            <CardHeader>
            <CardTitle>Owner Profile</CardTitle>
            <CardDescription>Your account and subscription details.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
                <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} />
                <AvatarFallback>{currentUser.name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
                <p className="text-lg font-semibold">{currentUser.name}</p>
                <p className="text-muted-foreground">{currentUser.email}</p>
                <p className="text-sm text-muted-foreground capitalize">{currentUser.role} - <span className="font-medium text-primary">{currentPlan.name} Plan</span></p>
            </div>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Users /> Role Management</CardTitle>
                <CardDescription>Define what each staff role can see and do on the dashboard.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
                {staffRoles.map(role => (
                    <div key={role} className="flex items-center justify-between p-3 border rounded-lg">
                         <p className="font-semibold capitalize">{role}</p>
                         <Button variant="outline" size="sm" onClick={() => handleOpenPermissionsDialog(role)}>
                            <Pencil className="w-3 h-3 mr-2" />
                            Edit Permissions
                         </Button>
                    </div>
                ))}
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><FileText /> KYC Document Configuration</CardTitle>
                <CardDescription>Define which documents are required for tenant verification.</CardDescription>
            </CardHeader>
             <CardContent>
                <Form {...kycConfigForm}>
                    <form id="kyc-config-form" onSubmit={kycConfigForm.handleSubmit(handleSaveKycConfig)} className="space-y-4">
                        {fields.map((field, index) => (
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
                    </form>
                </Form>
             </CardContent>
              <CardFooter>
                 <Button type="submit" form="kyc-config-form">Save KYC Configuration</Button>
            </CardFooter>
        </Card>


        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Settings /> Shared Rent Settings</CardTitle>
                <CardDescription>Configure predefined charge types like electricity, water, etc., to automate bill splitting.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {chargeTemplates.map(template => (
                    <div key={template.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                            <p className="font-semibold">{template.name}</p>
                            <p className="text-sm text-muted-foreground capitalize">{template.frequency}, {template.calculation} based, cycle on day {template.billingDayOfMonth}</p>
                        </div>
                        <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleOpenTemplateDialog(template)}><Pencil className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteTemplate(template.id)}><Trash2 className="w-4 h-4"/></Button>
                        </div>
                    </div>
                ))}
                <Button variant="outline" className="w-full border-dashed" onClick={() => handleOpenTemplateDialog(null)}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add New Charge Template
                </Button>
            </CardContent>
        </Card>

        {process.env.NODE_ENV === 'development' && (
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><TestTube2 /> Developer Tools</CardTitle>
                    <CardDescription>These tools are for testing purposes and are only available in the development environment.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                         <Label>Time Travel</Label>
                         <div className="flex gap-2 items-center">
                            <div className="relative">
                                <Input
                                    type="date"
                                    value={mockDate ? format(parseISO(mockDate), 'yyyy-MM-dd') : ''}
                                    onChange={handleDateChange}
                                    className="w-[240px]"
                                />
                                {!mockDate && <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />}
                            </div>
                            <Button onClick={() => dispatch(setMockDate(null))} variant="secondary">Reset</Button>
                         </div>
                         <p className="text-xs text-muted-foreground">Simulate a different current date to test rent cycles.</p>
                    </div>
                    <div>
                         <Button onClick={handleReconcileAll}>Reconcile Rents Now</Button>
                          <p className="text-xs text-muted-foreground mt-2">Manually trigger rent reconciliation for all guests using the simulated date.</p>
                    </div>
                </CardContent>
            </Card>
        )}
        
        <Card>
            <CardHeader>
            <CardTitle className="flex items-center gap-2"><Star/> Subscription Plan</CardTitle>
            <CardDescription>Your current plan is <span className="font-semibold text-primary">{currentPlan.name}</span>. Upgrade for more features.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button onClick={() => setIsSubDialogOpen(true)}>
                    View & Manage Plans
                </Button>
            </CardContent>
        </Card>
    </div>

    <Dialog open={isPermissionsDialogOpen} onOpenChange={setIsPermissionsDialogOpen}>
        <DialogContent className="max-w-2xl">
            <DialogHeader>
                <DialogTitle>Edit Permissions for <span className="capitalize">{roleToEdit}</span></DialogTitle>
                <DialogDescription>Select the actions this role can perform on the dashboard.</DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4 max-h-[60vh] overflow-y-auto pr-2">
                {Object.entries(featurePermissionConfig).map(([featureKey, config]) => (
                    <div key={featureKey}>
                        <h4 className="font-semibold text-lg mb-2">{config.label}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-4 border-l">
                            {Object.entries(config.actions).map(([actionKey, actionLabel]) => (
                                <div key={actionKey} className="flex items-center space-x-2">
                                    <Switch
                                        id={`${roleToEdit}-${featureKey}-${actionKey}`}
                                        checked={currentRolePermissions?.[featureKey]?.[actionKey] || false}
                                        onCheckedChange={(checked) => handlePermissionChange(featureKey, actionKey, checked)}
                                    />
                                    <Label htmlFor={`${roleToEdit}-${featureKey}-${actionKey}`} className="font-normal">{actionLabel}</Label>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
             <DialogFooter>
                <DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose>
                <Button onClick={handleSavePermissions}>Save Permissions</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    
    <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
      <DialogContent className="sm:max-w-md">
           <DialogHeader>
              <DialogTitle>{templateToEdit ? 'Edit Template' : 'Create New Template'}</DialogTitle>
              <DialogDescription>
                  Define how a shared bill should be calculated and split.
              </DialogDescription>
          </DialogHeader>
          <Form {...chargeTemplateForm}>
              <form id="template-form" onSubmit={chargeTemplateForm.handleSubmit(handleTemplateSubmit)} className="space-y-4">
                   <FormField control={chargeTemplateForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>Template Name</FormLabel><FormControl><Input placeholder="e.g., Electricity Bill" {...field} /></FormControl><FormMessage /></FormItem>)} />
                   <FormField control={chargeTemplateForm.control} name="calculation" render={({ field }) => (<FormItem><FormLabel>Calculation Method</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="fixed">Fixed Total Amount</SelectItem><SelectItem value="unit">Per Unit</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                   {calculationType === 'unit' && (
                      <FormField control={chargeTemplateForm.control} name="unitCost" render={({ field }) => (<FormItem><FormLabel>Cost per Unit (₹)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="e.g., 8.50" {...field} /></FormControl><FormMessage /></FormItem>)} />
                   )}
                   <div className="grid grid-cols-2 gap-4">
                      <FormField control={chargeTemplateForm.control} name="frequency" render={({ field }) => (<FormItem><FormLabel>Frequency</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="one-time">One-Time</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                      <FormField control={chargeTemplateForm.control} name="billingDayOfMonth" render={({ field }) => (<FormItem><FormLabel>Billing Day</FormLabel><FormControl><Input type="number" min="1" max="28" placeholder="e.g., 10" {...field} /></FormControl><FormMessage /></FormItem>)} />
                   </div>
                   <FormField control={chargeTemplateForm.control} name="splitMethod" render={({ field }) => (<FormItem><FormLabel>Split Method</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="equal">Split Equally</SelectItem><SelectItem value="room" disabled>By Room Type (soon)</SelectItem><SelectItem value="custom" disabled>Custom (soon)</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                   <FormField control={chargeTemplateForm.control} name="autoAddToDialog" render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                              <div className="space-y-0.5">
                                  <FormLabel>Show in Dialog</FormLabel>
                                  <p className="text-xs text-muted-foreground">Show this template as a quick-add tab.</p>
                              </div>
                              <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                          </FormItem>
                       )} />
              </form>
          </Form>
          <DialogFooter>
              <DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose>
              <Button type="submit" form="template-form">Save Template</Button>
          </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
