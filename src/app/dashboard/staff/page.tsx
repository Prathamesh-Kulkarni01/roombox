
'use client'

import { useState, useMemo, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAppDispatch, useAppSelector } from '@/lib/hooks'
import { usePermissionsStore, type FeaturePermissions } from '@/lib/stores/configStores'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { produce } from "immer"
import { featurePermissionConfig, parseStaffPermissions, validateAndEnforceDependencies } from '@/lib/permissions';
import type { UserRole } from '@/lib/types';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Users, User, PlusCircle, MoreHorizontal, IndianRupee, Pencil, Trash2, Building, ShieldAlert } from 'lucide-react'
import type { Staff } from '@/lib/types'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { addStaff as addStaffAction, updateStaff as updateStaffAction, deleteStaff as deleteStaffAction, fetchStaff as fetchStaffAction } from '@/lib/slices/staffSlice'
import { updatePermissions as updateRolePermissionsAction } from '@/lib/slices/permissionsSlice'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { canAccess } from '@/lib/permissions';
import SubscriptionDialog from '@/components/dashboard/dialogs/SubscriptionDialog'
import { useToast } from "@/hooks/use-toast"


const staffSchema = z.object({
    pgId: z.string().min(1, "Please select a property"),
    name: z.string().min(2, "Name must be at least 2 characters."),
    email: z.string().email("Please enter a valid email address.").optional().or(z.literal('')),
    role: z.enum(['manager', 'cleaner', 'cook', 'security', 'other']),
    phone: z.string().regex(/^\d{10}$/, "Please enter a valid 10-digit phone number."),
    salary: z.coerce.number().min(1, "Salary is required."),
})

type StaffFormValues = z.infer<typeof staffSchema>

const roleColors: Record<Staff['role'], string> = {
    manager: "bg-blue-100 text-blue-800",
    cook: "bg-green-100 text-green-800",
    cleaner: "bg-orange-100 text-orange-800",
    security: "bg-purple-100 text-purple-800",
    other: "bg-gray-100 text-gray-800",
}

const StaffForm = ({ form, onSubmit }: { form: any, onSubmit: (data: StaffFormValues) => void }) => {
    const { pgs } = useAppSelector(state => state.pgs);
    const { currentUser } = useAppSelector(state => state.user);
    const { featurePermissions } = usePermissionsStore();
    const staffToEdit = form.getValues(); // Not ideal, but works for this context

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" id="staff-form">
                <FormField control={form.control} name="pgId" render={({ field }) => (
                    <FormItem><FormLabel>Property</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select a property" /></SelectTrigger></FormControl>
                            <SelectContent>{pgs.map(pg => <SelectItem key={pg.id} value={pg.id}>{pg.name}</SelectItem>)}</SelectContent>
                        </Select><FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="e.g., Suresh Kumar" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>Email (Optional)</FormLabel><FormControl><Input type="email" placeholder="e.g., suresh@example.com" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input placeholder="e.g., 9876543210" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="role" render={({ field }) => (
                    <FormItem><FormLabel>Role</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger></FormControl>
                            <SelectContent>{Object.keys(roleColors).map(role => (<SelectItem key={role} value={role} className="capitalize">{role}</SelectItem>))}</SelectContent>
                        </Select><FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="salary" render={({ field }) => (
                    <FormItem><FormLabel>Salary</FormLabel><FormControl><Input type="number" placeholder="e.g., 15000" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
                    <Button type="submit" disabled={staffToEdit.id ? !canAccess(featurePermissions, currentUser?.role, 'staff', 'edit') : !canAccess(featurePermissions, currentUser?.role, 'staff', 'add')}>{staffToEdit.id ? 'Save Changes' : 'Add Staff'}</Button>
                </DialogFooter>
            </form>
        </Form>
    )
}

export default function StaffPage() {
    const dispatch = useAppDispatch()
    const router = useRouter()
    const { pgs } = useAppSelector(state => state.pgs)
    const { staff } = useAppSelector(state => state.staff)
    const { isLoading, selectedPgId } = useAppSelector(state => state.app)
    const { currentPlan } = useAppSelector(state => state.user)
    const { currentUser } = useAppSelector(state => state.user);
    const { featurePermissions, updatePermissions: savePermissions } = usePermissionsStore();
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [staffToEdit, setStaffToEdit] = useState<Staff | null>(null)
    const [isSubDialogOpen, setIsSubDialogOpen] = useState(false)

    // Permissions State
    const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false);
    const [staffForPermissions, setStaffForPermissions] = useState<Staff | null>(null);
    const [selectedPermissions, setSelectedPermissions] = useState<FeaturePermissions>({});
    const [roleToEdit, setRoleToEdit] = useState<UserRole | null>(null); // Kept for legacy UI if needed, but not used for per-staff
    const { toast } = useToast();

    useEffect(() => {
        if (currentUser?.id) {
            dispatch(fetchStaffAction(currentUser.id));
        }
    }, [currentUser, dispatch]);


    const form = useForm<StaffFormValues>({
        resolver: zodResolver(staffSchema),
    })

    useEffect(() => {
        if (isDialogOpen) {
            if (staffToEdit) {
                form.reset({
                    ...staffToEdit,
                    phone: staffToEdit.phone.slice(-10) // Strip prefix for local editing
                });
            } else {
                form.reset({
                    pgId: selectedPgId || (pgs.length > 0 ? pgs[0].id : undefined),
                    name: '',
                    email: '',
                    phone: '',
                    salary: undefined as any,
                    role: undefined as any,
                });
            }
        }
    }, [isDialogOpen, staffToEdit, selectedPgId, pgs, form])

    const onSubmit = async (data: StaffFormValues) => {
        const pgName = pgs.find(p => p.id === data.pgId)?.name || 'Unknown Property';
        const staffData = {
            ...data,
            pgName,
            ownerId: currentUser?.id || '',
            permissions: staffToEdit?.permissions || [],
            isActive: true,
            schemaVersion: 1
        };

        if (staffToEdit) {
            await dispatch(updateStaffAction({ ...staffToEdit, ...staffData }));
        } else {
            await dispatch(addStaffAction(staffData as any));
        }
        setIsDialogOpen(false);
        setStaffToEdit(null);
    }

    const openDialog = (staffMember: Staff | null = null) => {
        setStaffToEdit(staffMember);
        setIsDialogOpen(true);
    }

    const handleDelete = (staffId: string) => {
        if (confirm('Are you sure you want to delete this staff member?')) {
            dispatch(deleteStaffAction(staffId));
        }
    }

    const handleOpenPermissionsDialog = (memberOrRole: Staff | UserRole) => {
        if (typeof memberOrRole === 'string') {
            setRoleToEdit(memberOrRole);
            setStaffForPermissions(null);
            // Assuming per-role permissions are stored differently or just using a dummy staff object?
            // Actually, let's just use the featurePermissions from the store for roles
            const rolePerms = (featurePermissions as any)[memberOrRole] || {};
            setSelectedPermissions(rolePerms);
        } else {
            setStaffForPermissions(memberOrRole);
            setRoleToEdit(null);
            const perms = parseStaffPermissions(memberOrRole.permissions || []);
            setSelectedPermissions(perms);
        }
        setIsPermissionsDialogOpen(true);
    }

    const handlePermissionChange = (feature: string, action: string, checked: boolean) => {
        const nextState = produce(selectedPermissions, (draft: any) => {
            if (!draft[feature]) {
                draft[feature] = {};
            }
            draft[feature][action] = checked;
        });
        setSelectedPermissions(nextState);
    }

    const handleSavePermissions = async () => {
        if (roleToEdit) {
            const validated = validateAndEnforceDependencies(selectedPermissions);
            const nextPermissions = {
                ...featurePermissions,
                [roleToEdit]: validated
            };
            await dispatch(updateRolePermissionsAction(nextPermissions as any)).unwrap();
            if (JSON.stringify(validated) !== JSON.stringify(selectedPermissions)) {
                toast({ title: "Dependencies Auto-Resolved", description: "'View' was auto-granted for modules with write permissions." });
            }
            toast({ title: "Role Updated", description: `Permissions for ${roleToEdit} have been saved.` });
        } else if (staffForPermissions) {
            const validated = validateAndEnforceDependencies(selectedPermissions);
            const flatPerms: string[] = [];
            Object.entries(validated).forEach(([feature, actions]) => {
                if (actions) {
                    Object.entries(actions as any).forEach(([action, allowed]) => {
                        if (allowed) flatPerms.push(`${feature}:${action}`);
                    });
                }
            });

            const updatedStaff = { ...staffForPermissions, permissions: flatPerms };
            await dispatch(updateStaffAction(updatedStaff));
            if (JSON.stringify(validated) !== JSON.stringify(selectedPermissions)) {
                toast({ title: "Dependencies Auto-Resolved", description: "'View' was auto-granted for modules with write permissions." });
            }
            toast({ title: "Permissions Updated", description: `Permissions for ${staffForPermissions.name} have been saved.` });
        }
        
        setIsPermissionsDialogOpen(false);
    }

    const currentRolePermissions = selectedPermissions;
    const staffRoles: UserRole[] = ['manager', 'cook', 'cleaner', 'security', 'other'];


    const filteredStaff = useMemo(() => {
        if (!selectedPgId) return staff;
        return staff.filter(s => s.pgId === selectedPgId);
    }, [staff, selectedPgId]);

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
                        <div className="hidden md:block space-y-2">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <Skeleton key={i} className="h-12 w-full" />
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (!currentPlan?.hasStaffManagement) {
        return (
            <>
                <SubscriptionDialog open={isSubDialogOpen} onOpenChange={setIsSubDialogOpen} />
                <Card>
                    <CardHeader>
                        <CardTitle>Staff Management</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col items-center justify-center text-center p-8 bg-muted/50 rounded-lg border">
                            <ShieldAlert className="mx-auto h-12 w-12 text-primary" />
                            <h2 className="mt-4 text-xl font-semibold">Feature Not Available</h2>
                            <p className="mt-2 text-muted-foreground max-w-sm">Staff Management is a premium feature. Please upgrade your plan to add and manage your team.</p>
                            <Button className="mt-4" onClick={() => setIsSubDialogOpen(true)}>Upgrade Plan</Button>
                        </div>
                    </CardContent>
                </Card>
            </>
        )
    }

    if (pgs.length === 0) {
        return (
            <div className="flex items-center justify-center h-full min-h-[calc(100vh-250px)]">
                <div className="text-center p-8 bg-card rounded-lg border">
                    <Building className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h2 className="mt-4 text-xl font-semibold">No Properties Found</h2>
                    <p className="mt-2 text-muted-foreground">Please add a property to start managing staff.</p>
                    <Button asChild className="mt-4">
                        <Link href="/dashboard/pg-management">Add Property</Link>
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-3xl font-bold flex items-center gap-2"><Users /> Staff & Operations</h1>
            <Tabs defaultValue="staff" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
                    <TabsTrigger value="staff">Staff Members</TabsTrigger>
                    <TabsTrigger value="permissions">Role Permissions</TabsTrigger>
                </TabsList>

                <TabsContent value="staff" className="mt-4">
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>Staff List</CardTitle>
                                    <CardDescription>
                                        A list of all staff members {selectedPgId ? `at ${pgs.find(p => p.id === selectedPgId)?.name}` : 'across all properties'}.
                                    </CardDescription>
                                </div>
                                <Button onClick={() => openDialog()} disabled={!canAccess(featurePermissions, currentUser?.role, 'staff', 'add')}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Add Staff
                                </Button>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Property</TableHead>
                                            <TableHead>Role</TableHead>
                                            <TableHead>Phone</TableHead>
                                            <TableHead className="text-right">Salary</TableHead>
                                            <TableHead><span className="sr-only">Actions</span></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredStaff.map((member) => (
                                            <TableRow 
                                                key={member.id} 
                                                className="cursor-pointer hover:bg-muted/50 transition-colors"
                                                onClick={() => router.push(`/dashboard/staff/${member.id}`)}
                                            >
                                                <TableCell className="font-medium">
                                                    <div className="flex flex-col">
                                                        <span>{member.name}</span>
                                                        <span className="text-[10px] text-muted-foreground md:hidden uppercase font-semibold">{member.role}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="hidden md:table-cell">{member.pgName}</TableCell>
                                                <TableCell className="hidden md:table-cell">
                                                    <Badge className={cn("capitalize border-transparent", roleColors[member.role])}>{member.role}</Badge>
                                                </TableCell>
                                                <TableCell>{member.phone}</TableCell>
                                                <TableCell className="text-right font-medium">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <IndianRupee className="h-3 w-3" />
                                                        {member.salary.toLocaleString('en-IN')}
                                                    </div>
                                                </TableCell>
                                                <TableCell onClick={(e) => e.stopPropagation()}>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button aria-haspopup="true" size="icon" variant="ghost">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                                <span className="sr-only">Toggle menu</span>
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => router.push(`/dashboard/staff/${member.id}`)}>
                                                                <User className="mr-2 h-4 w-4" /> View Profile
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleOpenPermissionsDialog(member)}>
                                                                <ShieldAlert className="mr-2 h-4 w-4" /> Permissions
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => openDialog(member)} disabled={!canAccess(featurePermissions, currentUser?.role, 'staff', 'edit')}>
                                                                <Pencil className="mr-2 h-4 w-4" /> Edit
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(member.id)} disabled={!canAccess(featurePermissions, currentUser?.role, 'staff', 'delete')}>
                                                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                {filteredStaff.length === 0 && (
                                    <div className="text-center py-10 text-muted-foreground">No staff members found.</div>
                                )}
                            </CardContent>
                        </Card>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{staffToEdit ? 'Edit Staff Member' : 'Add New Staff Member'}</DialogTitle>
                                <DialogDescription>Fill in the details for the staff member.</DialogDescription>
                            </DialogHeader>
                            <StaffForm form={form} onSubmit={onSubmit} />
                        </DialogContent>
                    </Dialog>
                </TabsContent>

                <TabsContent value="permissions" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><ShieldAlert className="w-5 h-5" /> Role Permissions</CardTitle>
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
                </TabsContent>
            </Tabs>

            <Dialog open={isPermissionsDialogOpen} onOpenChange={setIsPermissionsDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ShieldAlert className="w-5 h-5 text-primary" />
                            Manage Permissions - {roleToEdit ? (<span className="capitalize">{roleToEdit} Role</span>) : `${staffForPermissions?.name} (${staffForPermissions?.role})`}
                        </DialogTitle>
                        <DialogDescription>
                            Configure granular permissions for this staff member. These settings override default role behaviors.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 my-4">
                        {featurePermissionConfig.map((config) => (
                            <div key={config.featureId} className="border rounded-lg p-4 bg-muted/30">
                                <div className="flex items-center gap-2 mb-4">
                                    {config.icon && <config.icon className="w-5 h-5 text-primary" />}
                                    <h3 className="font-semibold">{config.featureName}</h3>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                    {config.actions.map((action) => (
                                        <div key={action.id} className="flex items-center space-x-2">
                                            <Switch
                                                id={`${config.featureId}-${action.id}`}
                                                checked={currentRolePermissions[config.featureId]?.[action.id] || false}
                                                onCheckedChange={(checked) =>
                                                    handlePermissionChange(config.featureId, action.id, checked as boolean)
                                                }
                                            />
                                            <Label
                                                htmlFor={`${config.featureId}-${action.id}`}
                                                className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                            >
                                                {action.label}
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <DialogFooter className="sticky bottom-0 bg-background pt-4 border-t">
                        <Button variant="outline" onClick={() => setIsPermissionsDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSavePermissions}>
                            Save Permissions
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )

}
