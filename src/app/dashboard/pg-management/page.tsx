'use client'

import { useState } from 'react'
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { PlusCircle, MoreHorizontal, IndianRupee, Users, MapPin, Pencil, Building, Trash2, Zap } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { useAppSelector } from "@/lib/hooks"
import { usePermissionsStore, useChargeTemplatesStore } from '@/lib/stores/configStores'
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from '@/hooks/use-toast'
import AddPgSheet from '@/components/add-pg-sheet'
import type { PG, ChargeTemplate } from '@/lib/types'
import Access from '@/components/ui/PermissionWrapper';
import { useGetPropertiesQuery, useGetGuestsQuery, useDeletePropertyMutation } from '@/lib/api/apiSlice'
import BulkSetupModal from '@/components/bulk-setup-modal'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const genderBadgeColor = {
    male: 'bg-blue-100 text-blue-800',
    female: 'bg-pink-100 text-pink-800',
    'co-ed': 'bg-purple-100 text-purple-800',
    'co-living': 'bg-purple-100 text-purple-800',
};

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


export default function PgManagementPage() {
    const { currentUser, currentPlan } = useAppSelector(state => state.user);
    const { featurePermissions } = usePermissionsStore();
    const router = useRouter();
    const { toast } = useToast()
    const [isAddPgSheetOpen, setIsAddPgSheetOpen] = useState(false)
    const [pgToDelete, setPgToDelete] = useState<PG | null>(null);
    const [pgForBulkSetup, setPgForBulkSetup] = useState<PG | null>(null);

    // RTK Query hooks
    const { data: pgsData, isLoading: isLoadingPgs, refetch: refetchPgs } = useGetPropertiesQuery(undefined, {
        skip: !currentUser?.id
    });
    const { data: guestsData, isLoading: isLoadingGuests } = useGetGuestsQuery(undefined, {
        skip: !currentUser?.id
    });
    const [deleteProperty] = useDeletePropertyMutation();

    const { templates: chargeTemplates, addTemplate, updateTemplate: updateTemplateZustand, deleteTemplate } = useChargeTemplatesStore()
    const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
    const [templateToEdit, setTemplateToEdit] = useState<ChargeTemplate | null>(null);

    const chargeTemplateForm = useForm<ChargeTemplateFormValues>({
        resolver: zodResolver(chargeTemplateSchema),
    });

    const calculationType = chargeTemplateForm.watch('calculation');

    const handleOpenTemplateDialog = (template: ChargeTemplate | null) => {
        setTemplateToEdit(template);
        if (template) {
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

    const handleTemplateSubmit = async (data: ChargeTemplateFormValues) => {
        try {
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

    const pgs = pgsData?.buildings || [];
    const guests = guestsData?.guests || [];
    const isLoading = isLoadingPgs || isLoadingGuests;

    const canAddPg = currentPlan && (currentPlan.pgLimit === 'unlimited' || pgs.length < (currentPlan.pgLimit as number));

    const handleAddPgClick = () => {
        if (!canAddPg) {
            toast({
                variant: 'destructive',
                title: 'Property Limit Reached',
                description: `You have reached the ${currentPlan?.pgLimit} property limit for your current plan. Please upgrade to add more.`,
            })
            return;
        }
        setIsAddPgSheetOpen(true)
    }

    const handleDeletePg = async (pgId: string, pgName: string) => {
        if (!currentUser) return;

        const pgHasGuests = guests.some(g => g.pgId === pgId && !g.exitDate);
        if (pgHasGuests) {
            toast({
                variant: "destructive",
                title: "Deletion Failed",
                description: `Cannot delete "${pgName}" as it has active guests. Please vacate all guests first.`,
            });
            setPgToDelete(null);
            return;
        }

        try {
            await deleteProperty({ pgId }).unwrap();
            toast({
                title: "Property Deleted",
                description: `"${pgName}" has been successfully removed.`,
            });
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Deletion Failed",
                description: error.data?.message || error.message || "An unexpected error occurred.",
            });
        } finally {
            setPgToDelete(null);
        }
    }


    if (isLoading) {
        return (
            <div className="flex flex-col gap-8">
                <div>
                    <Skeleton className="h-9 w-64 mb-2" />
                    <Skeleton className="h-5 w-80" />
                </div>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div className="space-y-2">
                            <Skeleton className="h-7 w-24" />
                            <Skeleton className="h-5 w-32" />
                        </div>
                        <Skeleton className="h-10 w-32" />
                    </CardHeader>
                    <CardContent>
                        {/* Mobile skeleton */}
                        <div className="md:hidden space-y-4">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <Skeleton key={i} className="h-32 w-full rounded-lg" />
                            ))}
                        </div>
                        {/* Desktop skeleton */}
                        <div className="hidden md:block space-y-2">
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-3xl font-bold flex items-center gap-2"><Building /> PG Management</h1>
            <Tabs defaultValue="properties" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
                    <TabsTrigger value="properties">Your Properties</TabsTrigger>
                    <TabsTrigger value="templates">Charge Templates</TabsTrigger>
                </TabsList>

                <TabsContent value="properties" className="mt-4">
                    <div className="flex flex-col gap-8">
                        {isAddPgSheetOpen && <Access feature="properties" action="add" limitKey="pgs" currentCount={pgs.length}>
                            <AddPgSheet
                                open={isAddPgSheetOpen}
                                onOpenChange={setIsAddPgSheetOpen}
                                onPgAdded={() => refetchPgs()}
                            />
                        </Access>}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>Your Properties</CardTitle>
                                    <CardDescription>You have {pgs.length} properties.</CardDescription>
                                </div>
                                <div data-tour="add-pg-button">
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <div className="inline-block">
                                                    <Access feature="properties" action="add" limitKey="pgs" currentCount={pgs.length}>
                                                        <Button onClick={handleAddPgClick}>
                                                            <PlusCircle className="mr-2 h-4 w-4" /> Add New Property
                                                        </Button>
                                                    </Access>
                                                </div>
                                            </TooltipTrigger>
                                            {(() => {
                                                const planLimit = currentPlan?.id ? (currentPlan.id === 'free' || currentPlan.id === 'starter' ? 1 : 'unlimited') : 0;
                                                return (pgs.length >= 1 && (currentPlan?.id === 'free' || currentPlan?.id === 'starter')) ? (
                                                    <TooltipContent>
                                                        <p>You can only add 1 property on the {currentPlan?.name} plan. <Link href='/dashboard/settings' className='text-primary underline'>Upgrade to Pro</Link> to add more.</p>
                                                    </TooltipContent>
                                                ) : !canAddPg ? (
                                                    <TooltipContent>
                                                        <p>You have reached your plan's property limit.</p>
                                                    </TooltipContent>
                                                ) : null;
                                            })()}
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {pgs.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center text-center py-10 px-4">
                                        <Building className="mx-auto h-12 w-12 text-muted-foreground" />
                                        <h3 className="mt-4 text-lg font-semibold">No Properties Found</h3>
                                        <p className="mt-2 text-sm text-muted-foreground">
                                            Get started by adding your first property.
                                        </p>
                                        <Access feature="properties" action="add" limitKey="pgs" currentCount={pgs.length}>
                                            <Button className="mt-4" onClick={handleAddPgClick}>
                                                <PlusCircle className="mr-2 h-4 w-4" /> Add Property
                                            </Button>
                                        </Access>
                                    </div>
                                ) : (
                                    <>
                                        {/* Desktop Table View */}
                                        <div className="hidden md:block">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Name</TableHead>
                                                        <TableHead>Location</TableHead>
                                                        <TableHead>Gender</TableHead>
                                                        <TableHead>Occupancy</TableHead>
                                                        <TableHead>Price Range</TableHead>
                                                        <TableHead>
                                                            <span className="sr-only">Actions</span>
                                                        </TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {pgs.map((pg) => (
                                                        <TableRow key={pg.id}>
                                                            <TableCell className="font-medium">{pg.name}</TableCell>
                                                            <TableCell>{pg.location}</TableCell>
                                                            <TableCell>
                                                                <Badge className={cn("capitalize border-transparent", pg.gender ? genderBadgeColor[pg.gender as keyof typeof genderBadgeColor] : "bg-gray-100 text-gray-800")}>
                                                                    {pg.gender || 'Unknown'}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell>{pg.occupancy}/{pg.totalBeds}</TableCell>
                                                            <TableCell className="flex items-center">
                                                                <IndianRupee className="w-4 h-4 mr-1 text-muted-foreground" />
                                                                {pg.priceRange?.min ?? 0} - {pg.priceRange?.max ?? 0}
                                                            </TableCell>
                                                            <TableCell>
                                                                <DropdownMenu>
                                                                    <DropdownMenuTrigger asChild>
                                                                        <Button aria-haspopup="true" size="icon" variant="ghost">
                                                                            <MoreHorizontal className="h-4 w-4" />
                                                                            <span className="sr-only">Toggle menu</span>
                                                                        </Button>
                                                                    </DropdownMenuTrigger>
                                                                    <DropdownMenuContent align="end">
                                                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                                        <DropdownMenuItem onClick={() => router.push(`/dashboard/pg-management/${pg.id}`)}>
                                                                            <Pencil className="mr-2 h-4 w-4" /> Configure
                                                                        </DropdownMenuItem>
                                                                        <DropdownMenuItem onClick={() => setPgForBulkSetup(pg)}>
                                                                            <Zap className="mr-2 h-4 w-4" /> Bulk Setup Rooms
                                                                        </DropdownMenuItem>
                                                                        <DropdownMenuItem>View Guests</DropdownMenuItem>
                                                                        <Access feature="properties" action="delete">
                                                                            <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-500/10" onClick={() => setPgToDelete(pg)}>
                                                                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                                            </DropdownMenuItem>
                                                                        </Access>
                                                                    </DropdownMenuContent>
                                                                </DropdownMenu>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                        {/* Mobile Card View */}
                                        <div className="md:hidden grid gap-4">
                                            {pgs.map((pg) => (
                                                <div key={pg.id} className="p-4 border rounded-lg flex flex-col gap-3 bg-muted/20">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <p className="font-bold">{pg.name}</p>
                                                            <div className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                                                                <MapPin className="w-3.5 h-3.5" />
                                                                {pg.location}
                                                            </div>
                                                        </div>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button aria-haspopup="true" size="icon" variant="ghost" className="-mr-2 -mt-2">
                                                                    <MoreHorizontal className="h-4 w-4" />
                                                                    <span className="sr-only">Toggle menu</span>
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                                <DropdownMenuItem onClick={() => router.push(`/dashboard/pg-management/${pg.id}`)}>
                                                                    <Pencil className="mr-2 h-4 w-4" /> Configure
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => setPgForBulkSetup(pg)}>
                                                                    <Zap className="mr-2 h-4 w-4" /> Bulk Setup Rooms
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem>View Guests</DropdownMenuItem>
                                                                <Access feature="properties" action="delete">
                                                                    <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-500/10" onClick={() => setPgToDelete(pg)}>
                                                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                                    </DropdownMenuItem>
                                                                </Access>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
                                                    <div className="flex justify-between items-end text-sm">
                                                        <div className="flex flex-col gap-2">
                                                            <div className="flex items-center gap-2">
                                                                <Users className="w-4 h-4 text-muted-foreground" />
                                                                <span>{pg.occupancy}/{pg.totalBeds} Occupancy</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <IndianRupee className="w-4 h-4 text-muted-foreground" />
                                                                <span>{pg.priceRange?.min ?? 0} - {pg.priceRange?.max ?? 0}</span>
                                                            </div>
                                                        </div>
                                                        <Badge className={cn("capitalize border-transparent", pg.gender ? genderBadgeColor[pg.gender as keyof typeof genderBadgeColor] : "bg-gray-100 text-gray-800")}>
                                                            {pg.gender || 'Unknown'}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="templates" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Zap className="w-5 h-5" /> Billing Templates</CardTitle>
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
                </TabsContent>
            </Tabs>

            {pgForBulkSetup && (
                <BulkSetupModal
                    pg={pgForBulkSetup}
                    open={!!pgForBulkSetup}
                    onOpenChange={(open) => !open && setPgForBulkSetup(null)}
                    onSuccess={() => refetchPgs()}
                />
            )}

            <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{templateToEdit ? 'Edit Template' : 'Add New Template'}</DialogTitle>
                        <DialogDescription>
                            Templates help you quickly add common charges to guests.
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...chargeTemplateForm}>
                        <form onSubmit={chargeTemplateForm.handleSubmit(handleTemplateSubmit)} className="space-y-4">
                            <FormField
                                control={chargeTemplateForm.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Template Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g., Electricity Bill" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={chargeTemplateForm.control}
                                    name="calculation"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Calculation Type</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                                                    <SelectItem value="unit">Unit Based</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                {calculationType === 'unit' && (
                                    <FormField
                                        control={chargeTemplateForm.control}
                                        name="unitCost"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Cost Per Unit</FormLabel>
                                                <FormControl>
                                                    <Input type="number" placeholder="₹" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={chargeTemplateForm.control}
                                    name="splitMethod"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Split Method</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="equal">Split Equally</SelectItem>
                                                    <SelectItem value="room">By Room Type</SelectItem>
                                                    <SelectItem value="custom">Manual Custom</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={chargeTemplateForm.control}
                                    name="frequency"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Frequency</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="monthly">Monthly Recurring</SelectItem>
                                                    <SelectItem value="one-time">One-Time Charge</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <FormField
                                control={chargeTemplateForm.control}
                                name="billingDayOfMonth"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Billing Day (1-28)</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} min={1} max={28} />
                                        </FormControl>
                                        <FormDescription>The day of month when the bill is generated.</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={chargeTemplateForm.control}
                                name="autoAddToDialog"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                        <div className="space-y-0.5">
                                            <FormLabel>Auto-Suggest</FormLabel>
                                            <FormDescription>Show this template by default in rent collection.</FormDescription>
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            <DialogFooter>
                                <Button type="submit" className="w-full">
                                    {templateToEdit ? 'Update Template' : 'Create Template'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!pgToDelete} onOpenChange={(open) => !open && setPgToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the
                            property "{pgToDelete?.name}" and all of its associated data.
                            Please ensure all guests have been vacated first.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setPgToDelete(null)}>Cancel</AlertDialogCancel>
                        <Access feature="properties" action="delete">
                            <AlertDialogAction
                                className="bg-destructive hover:bg-destructive/90"
                                onClick={() => handleDeletePg(pgToDelete!.id, pgToDelete!.name)}
                            >
                                Continue
                            </AlertDialogAction>
                        </Access>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
