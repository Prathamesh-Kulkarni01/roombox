
'use client'

import React, { useState, useTransition, useMemo } from "react"
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { produce } from "immer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { AlertCircle, PlusCircle, Pencil, Trash2, Settings, Loader2, TestTube2, Calendar, Users, Star, FileText, IndianRupee, BellRing, Wand2, Globe, BotIcon, UserCheck, History, CreditCard, Banknote, MoreVertical, Check, Smartphone } from "lucide-react"
import { PWASettings } from "@/components/dashboard/pwa-settings"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { useChargeTemplatesStore, usePermissionsStore, type RolePermissions } from '@/lib/stores/configStores'
import { featurePermissionConfig } from '@/lib/permissions';
import { format, parseISO } from "date-fns"
import { cn } from "@/lib/utils"
import { setMockDate } from "@/lib/slices/appSlice"
import { getBillingDetails } from "@/lib/actions/billingActions"
import { togglePremiumFeature } from "@/lib/slices/userSlice"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { ChargeTemplate, UserRole, PaymentMethod, BankPaymentMethod, UpiPaymentMethod } from '@/lib/types'
import { PRICING_CONFIG } from '@/lib/mock-data';
import { addPayoutMethod, deletePayoutMethod, setPrimaryPayoutMethod } from "@/lib/actions/payoutActions"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"


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
    const { currentUser, currentPlan } = useAppSelector((state) => state.user)
    const { templates: chargeTemplates, addTemplate, updateTemplate: updateTemplateZustand, deleteTemplate } = useChargeTemplatesStore()
    const { featurePermissions, updatePermissions: savePermissions } = usePermissionsStore();
    const { mockDate } = useAppSelector((state) => state.app);
    const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
    const [templateToEdit, setTemplateToEdit] = useState<ChargeTemplate | null>(null);
    const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false);
    const [roleToEdit, setRoleToEdit] = useState<UserRole | null>(null);
    const [selectedPermissions, setSelectedPermissions] = useState<RolePermissions>({});
    const { toast } = useToast();
    const [isTestingBilling, startBillingTest] = useTransition();
    const [isTestingReminders, startReminderTest] = useTransition();
    const [isTestingReconciliation, startReconciliationTest] = useTransition();

    const [phoneNumber, setPhoneNumber] = useState(currentUser?.phone || '');
    const [isOtpSent, setIsOtpSent] = useState(false);
    const [otp, setOtp] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);

    const chargeTemplateForm = useForm<ChargeTemplateFormValues>({
        resolver: zodResolver(chargeTemplateSchema),
    });

    const calculationType = chargeTemplateForm.watch('calculation');

    const handleOpenTemplateDialog = (template: ChargeTemplate | null) => {
        setTemplateToEdit(template);
        if (template) {
            // Convert null -> undefined for the form schema (Zod uses undefined not null)
            chargeTemplateForm.reset({
                ...template,
                unitCost: template.unitCost ?? undefined,
            });
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
        if (!roleToEdit) return;
        const updatedPermissions = { ...(featurePermissions ?? {}), [roleToEdit]: selectedPermissions[roleToEdit]! } as import('@/lib/permissions').RolePermissions;
        savePermissions(updatedPermissions);
        toast({ title: "Permissions Updated", description: `Permissions for ${roleToEdit} have been saved.` });
        setIsPermissionsDialogOpen(false);
    }

    const handleTemplateSubmit = async (data: ChargeTemplateFormValues) => {
        try {
            // Convert undefined -> null (ChargeTemplate type uses null)
            const templateData = { ...data, unitCost: data.unitCost ?? null };
            if (templateToEdit) {
                updateTemplateZustand({ ...templateToEdit, ...templateData });
                toast({ title: "Template Updated", description: "Your charge template has been updated." });
            } else {
                addTemplate(templateData);
                toast({ title: "Template Created", description: "Your new charge template is ready to use." });
            }
            setIsTemplateDialogOpen(false);
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Error", description: error.message || "Could not save the template." });
        }
    }

    const handleDeleteTemplate = (templateId: string) => {
        if (confirm("Are you sure you want to delete this template? This cannot be undone.")) {
            deleteTemplate(templateId);
            toast({ title: "Template Deleted" });
        }
    }

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const dateValue = e.target.value;
        if (dateValue) {
            const date = new Date(dateValue);
            const timezoneOffset = date.getTimezoneOffset() * 60000;
            const adjustedDate = new Date(date.getTime() + timezoneOffset);
            dispatch(setMockDate(adjustedDate.toISOString()));
        } else {
            dispatch(setMockDate(null));
        }
    }

    const handleRunBillingTest = () => {
        if (!currentUser) return;
        startBillingTest(async () => {
            const result = await getBillingDetails(currentUser.id);
            if (result.success && result.data) {
                const { currentCycle, nextCycleEstimate, details } = result.data;
                const description = `
Current Cycle Estimate: ₹${currentCycle.totalAmount}
Next Cycle Estimate:    ₹${nextCycleEstimate.totalAmount}
---------------------------
Properties: ${details.propertyCount} x ₹${details.pricingConfig.perProperty} = ₹${currentCycle.propertyCharge}
Tenants: ${details.billableTenantCount} x ₹${details.pricingConfig.perTenant} = ₹${currentCycle.tenantCharge}
            `;
                toast({
                    title: "Billing Test Result",
                    description: <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4"><code className="text-white">{description.trim()}</code></pre>
                });
            } else {
                toast({ variant: 'destructive', title: 'Test Failed', description: result.error });
            }
        })
    }

    const handleTestReconciliation = () => {
        startReconciliationTest(async () => {
            try {
                const response = await fetch('/api/cron/reconcile-rent', {
                    headers: { 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET}` }
                });
                const result = await response.json();
                if (result.success) {
                    toast({ title: "Reconciliation Test Complete", description: result.message });
                } else {
                    throw new Error(result.message || 'Cron job failed');
                }
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Reconciliation Test Failed', description: error.message || 'Could not complete the rent reconciliation flow.' });
            }
        });
    };

    const handleTestRentReminders = () => {
        startReminderTest(async () => {
            try {
                const response = await fetch('/api/cron/send-rent-reminders', {
                    headers: { 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET}` }
                });
                const result = await response.json();
                if (result.success) {
                    toast({ title: "Reminder Test Complete", description: result.message });
                } else {
                    throw new Error(result.message || 'Cron job failed');
                }
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Reminder Test Failed', description: error.message || 'Could not complete the rent reminder flow.' });
            }
        });
    };

    const handleSendVerificationOtp = async () => {
        if (!currentUser || !phoneNumber) return;
        setIsVerifying(true);
        try {
            const res = await fetch('/api/whatsapp/send-verification-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ownerId: currentUser.id, phone: phoneNumber })
            });
            const data = await res.json();
            if (data.success) {
                setIsOtpSent(true);
                toast({ title: 'OTP Sent', description: 'Please check your WhatsApp for the verification code.' });
            } else {
                throw new Error(data.error);
            }
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Error', description: err.message || 'Could not send OTP.' });
        } finally {
            setIsVerifying(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (!currentUser || !otp) return;
        setIsVerifying(true);
        try {
            const res = await fetch('/api/whatsapp/verify-phone-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ownerId: currentUser.id, otp })
            });
            const data = await res.json();
            if (data.success) {
                toast({ title: 'Verified!', description: 'Your WhatsApp number has been verified. You can now use Magic Login.' });
                setIsOtpSent(false);
                setOtp('');
            } else {
                throw new Error(data.error);
            }
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Verification Failed', description: err.message || 'Invalid OTP.' });
        } finally {
            setIsVerifying(false);
        }
    };

    const staffRoles: UserRole[] = ['manager', 'cook', 'cleaner', 'security', 'other'];
    const currentRolePermissions = roleToEdit ? selectedPermissions?.[roleToEdit] : {};

    if (!currentUser || !currentPlan) {
        return null
    }

    return (
        <>
            <div className="flex flex-col gap-8">
                <PWASettings />
                <Card>
                    <CardHeader>
                        <CardTitle>Owner Profile</CardTitle>
                        <CardDescription>Your account and subscription details.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center gap-4">
                        <Avatar className="h-16 w-16">
                            <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} />
                            <AvatarFallback>{currentUser.name.slice(0, 2).toUpperCase()} </AvatarFallback>
                        </Avatar>
                        <div>
                            <div className="text-lg font-semibold">{currentUser.name}</div>
                            <div className="text-muted-foreground">{currentUser.email}</div>
                            <div className="text-sm text-muted-foreground capitalize">
                                {currentUser.role} -
                                <span className="font-medium text-primary">
                                    {currentUser.subscription?.status === 'trialing' ? ` Pro Trial` : ` ${currentPlan.name} Plan`}
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Smartphone className="w-5 h-5" /> WhatsApp Integration</CardTitle>
                        <CardDescription>Verify your phone number to enable the RentSutra Magic Login on WhatsApp.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-col gap-3">
                            <Label htmlFor="whatsapp-phone">Registered Phone Number</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="whatsapp-phone"
                                    value={phoneNumber}
                                    onChange={(e) => {
                                        setPhoneNumber(e.target.value);
                                        setIsOtpSent(false); // Reset flow if number changes
                                    }}
                                    placeholder="e.g. 9876543210"
                                    disabled={isOtpSent || isVerifying}
                                />
                                {!isOtpSent ? (
                                    <Button onClick={handleSendVerificationOtp} disabled={isVerifying || !phoneNumber || phoneNumber.length < 10}>
                                        {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {currentUser.phone === phoneNumber ? 'Re-Verify' : 'Send OTP'}
                                    </Button>
                                ) : (
                                    <Button variant="outline" onClick={() => setIsOtpSent(false)} disabled={isVerifying}>Change Number</Button>
                                )}
                            </div>
                            {isOtpSent && (
                                <div className="flex gap-2 items-end mt-2 animate-in fade-in slide-in-from-top-2">
                                    <div className="flex-1 space-y-1">
                                        <Label htmlFor="whatsapp-otp">Enter OTP</Label>
                                        <Input
                                            id="whatsapp-otp"
                                            value={otp}
                                            onChange={(e) => setOtp(e.target.value)}
                                            placeholder="4-digit code"
                                            maxLength={4}
                                        />
                                    </div>
                                    <Button onClick={handleVerifyOtp} disabled={isVerifying || otp.length < 4} className="bg-green-600 hover:bg-green-700">
                                        {isVerifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                                        Verify Number
                                    </Button>
                                </div>
                            )}
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
                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteTemplate(template.id)}><Trash2 className="w-4 h-4" /></Button>
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
                            <div className="space-y-2">
                                <Button onClick={handleTestReconciliation} disabled={isTestingReconciliation}>
                                    {isTestingReconciliation && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Reconcile Rents Now
                                </Button>
                                <p className="text-xs text-muted-foreground">Manually trigger rent reconciliation for all guests using the simulated date.</p>
                            </div>
                            <div className="space-y-2">
                                <Button onClick={handleRunBillingTest} disabled={isTestingBilling}>
                                    {isTestingBilling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    <IndianRupee className="mr-2 h-4 w-4" />
                                    Test Monthly Billing
                                </Button>
                                <p className="text-xs text-muted-foreground">Simulate the monthly billing cron job and see the calculated bill amount.</p>
                            </div>
                            <div className="space-y-2">
                                <Button onClick={handleTestRentReminders} disabled={isTestingReminders}>
                                    {isTestingReminders && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    <BellRing className="mr-2 h-4 w-4" />
                                    Test Rent Reminders
                                </Button>
                                <p className="text-xs text-muted-foreground">Manually run the rent reminder job and send notifications.</p>
                            </div>
                            <div className="space-y-2">
                                <h4 className="font-semibold pt-4 border-t">Premium Feature Pricing Config</h4>
                                <pre className="text-xs bg-muted p-4 rounded-md whitespace-pre-wrap">
                                    <code>
                                        {JSON.stringify(PRICING_CONFIG, null, 2)}
                                    </code>
                                </pre>
                            </div>
                        </CardContent>
                    </Card>
                )}
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
                            <FormField control={chargeTemplateForm.control} name="calculation" render={({ field }) => (<FormItem><FormLabel>Calculation Method</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="fixed">Fixed Total Amount</SelectItem><SelectItem value="unit">Per Unit</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                            {calculationType === 'unit' && (
                                <FormField control={chargeTemplateForm.control} name="unitCost" render={({ field }) => (<FormItem><FormLabel>Cost per Unit (₹)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="e.g., 8.50" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            )}
                            <div className="grid grid-cols-2 gap-4">
                                <FormField control={chargeTemplateForm.control} name="frequency" render={({ field }) => (<FormItem><FormLabel>Frequency</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="one-time">One-Time</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                                <FormField control={chargeTemplateForm.control} name="billingDayOfMonth" render={({ field }) => (<FormItem><FormLabel>Billing Day</FormLabel><FormControl><Input type="number" min="1" max="28" placeholder="e.g., 10" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            </div>
                            <FormField control={chargeTemplateForm.control} name="splitMethod" render={({ field }) => (<FormItem><FormLabel>Split Method</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="equal">Split Equally</SelectItem><SelectItem value="room" disabled>By Room Type (soon)</SelectItem><SelectItem value="custom" disabled>Custom (soon)</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
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
