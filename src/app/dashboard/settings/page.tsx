
'use client'

import { useState } from "react"
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { plans } from "@/lib/mock-data"
import type { PlanName, ChargeTemplate } from "@/lib/types"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { AlertCircle, PlusCircle, Pencil, Trash2, Settings, Loader2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { updateUserPlan as updateUserPlanAction } from "@/lib/slices/userSlice"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { saveChargeTemplate, updateChargeTemplate, deleteChargeTemplate } from "@/lib/slices/chargeTemplatesSlice"

const chargeTemplateSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters."),
  calculation: z.enum(['fixed', 'unit']),
  unitCost: z.coerce.number().optional(),
  splitMethod: z.enum(['equal', 'room', 'custom']),
  frequency: z.enum(['monthly', 'one-time']),
  autoAddToDialog: z.boolean().default(true),
  billingDayOfMonth: z.coerce.number().min(1).max(28).default(1),
})

type ChargeTemplateFormValues = z.infer<typeof chargeTemplateSchema>;

export default function SettingsPage() {
  const dispatch = useAppDispatch()
  const [notificationMethod, setNotificationMethod] = useState("manual")
  const { currentUser, currentPlan } = useAppSelector((state) => state.user)
  const { chargeTemplates } = useAppSelector((state) => state.chargeTemplates)
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [templateToEdit, setTemplateToEdit] = useState<ChargeTemplate | null>(null);
  const { toast } = useToast();

  const form = useForm<ChargeTemplateFormValues>({
    resolver: zodResolver(chargeTemplateSchema),
  })

  const calculationType = form.watch('calculation');

  const handleOpenTemplateDialog = (template: ChargeTemplate | null) => {
    setTemplateToEdit(template);
    if (template) {
        form.reset(template);
    } else {
        form.reset({
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

  if (!currentUser || !currentPlan) {
    return null // Or a loading state
  }

  const handlePlanChange = (planId: PlanName) => {
      dispatch(updateUserPlanAction(planId));
  }

  return (
    <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
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
            
            <Card>
                <CardHeader>
                <CardTitle>Developer Settings</CardTitle>
                <CardDescription>For development and testing purposes only.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Warning</AlertTitle>
                        <AlertDescription>
                            Changing your plan here is for development testing and does not reflect a real subscription change.
                        </AlertDescription>
                    </Alert>
                    <div className="grid gap-2 max-w-sm">
                        <Label htmlFor="plan-switcher">Switch Plan</Label>
                        <Select
                            value={currentPlan.id}
                            onValueChange={(planId) => handlePlanChange(planId as PlanName)}
                        >
                            <SelectTrigger id="plan-switcher">
                                <SelectValue placeholder="Select a plan" />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.values(plans).map(plan => (
                                    <SelectItem key={plan.id} value={plan.id}>
                                        {plan.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>
        </div>

        <DialogContent className="sm:max-w-md">
             <DialogHeader>
                <DialogTitle>{templateToEdit ? 'Edit Template' : 'Create New Template'}</DialogTitle>
                <DialogDescription>
                    Define how a shared bill should be calculated and split.
                </DialogDescription>
            </DialogHeader>
            <Form {...form}>
                <form id="template-form" onSubmit={form.handleSubmit(handleTemplateSubmit)} className="space-y-4">
                     <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Template Name</FormLabel><FormControl><Input placeholder="e.g., Electricity Bill" {...field} /></FormControl><FormMessage /></FormItem>)} />
                     <FormField control={form.control} name="calculation" render={({ field }) => (<FormItem><FormLabel>Calculation Method</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="fixed">Fixed Total Amount</SelectItem><SelectItem value="unit">Per Unit</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                     {calculationType === 'unit' && (
                        <FormField control={form.control} name="unitCost" render={({ field }) => (<FormItem><FormLabel>Cost per Unit (₹)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="e.g., 8.50" {...field} /></FormControl><FormMessage /></FormItem>)} />
                     )}
                     <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="frequency" render={({ field }) => (<FormItem><FormLabel>Frequency</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="one-time">One-Time</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="billingDayOfMonth" render={({ field }) => (<FormItem><FormLabel>Billing Day</FormLabel><FormControl><Input type="number" min="1" max="28" placeholder="e.g., 10" {...field} /></FormControl><FormMessage /></FormItem>)} />
                     </div>
                     <FormField control={form.control} name="splitMethod" render={({ field }) => (<FormItem><FormLabel>Split Method</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="equal">Split Equally</SelectItem><SelectItem value="room" disabled>By Room Type (soon)</SelectItem><SelectItem value="custom" disabled>Custom (soon)</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                     <FormField control={form.control} name="autoAddToDialog" render={({ field }) => (
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
  )
}
