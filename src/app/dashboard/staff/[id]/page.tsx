
'use client'

import React, { useState, useMemo, useEffect } from "react"
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAppSelector, useAppDispatch } from "@/lib/hooks"
import { usePermissionsStore } from '@/lib/stores/configStores'
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, User, IndianRupee, Phone, Mail, Building, Pencil, Loader2, ShieldCheck, Copy, MessageCircle, MoreHorizontal, ShieldAlert, Link as LinkIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { fetchStaff as fetchStaffAction, updateStaff as updateStaffAction } from '@/lib/slices/staffSlice'
import { useGenerateStaffMagicLinkMutation } from '@/lib/api/apiSlice'
import { featurePermissionConfig, parseStaffPermissions } from '@/lib/permissions'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { produce } from "immer"

const roleColors: Record<string, string> = {
    manager: "bg-blue-100 text-blue-800",
    cook: "bg-green-100 text-green-800",
    cleaner: "bg-orange-100 text-orange-800",
    security: "bg-purple-100 text-purple-800",
    other: "bg-gray-100 text-gray-800",
}

export default function StaffProfilePage() {
    const params = useParams()
    const router = useRouter()
    const dispatch = useAppDispatch()
    const { toast } = useToast()
    const staffId = params.id as string

    const { staff } = useAppSelector(state => state.staff)
    const { pgs } = useAppSelector(state => state.pgs)
    const { isLoading } = useAppSelector(state => state.app)
    const { currentUser } = useAppSelector(state => state.user)
    
    const staffMember = useMemo(() => staff.find(s => s.id === staffId), [staff, staffId])
    const pg = useMemo(() => staffMember ? pgs.find(p => p.id === staffMember.pgId) : null, [staffMember, pgs])

    const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false)
    const [selectedPermissions, setSelectedPermissions] = useState<any>({})
    const [magicLink, setMagicLink] = useState('')
    const [isMagicLinkDialogOpen, setIsMagicLinkDialogOpen] = useState(false)
    
    const [generateMagicLink, { isLoading: isGeneratingLink }] = useGenerateStaffMagicLinkMutation()

    useEffect(() => {
        if (currentUser?.id && staff.length === 0) {
            dispatch(fetchStaffAction(currentUser.id));
        }
    }, [currentUser, dispatch, staff.length]);

    const handleOpenPermissions = () => {
        if (!staffMember) return;
        const perms = parseStaffPermissions(staffMember.permissions || []);
        setSelectedPermissions(perms);
        setIsPermissionsDialogOpen(true);
    }

    const handlePermissionChange = (feature: string, action: string, checked: boolean) => {
        const nextState = produce(selectedPermissions, (draft: any) => {
            if (!draft[feature]) draft[feature] = {};
            draft[feature][action] = checked;
        });
        setSelectedPermissions(nextState);
    }

    const handleSavePermissions = async () => {
        if (!staffMember) return;
        
        const flatPerms: string[] = [];
        Object.entries(selectedPermissions).forEach(([feature, actions]) => {
            if (actions) {
                Object.entries(actions as any).forEach(([action, allowed]) => {
                    if (allowed) flatPerms.push(`${feature}:${action}`);
                });
            }
        });

        const updatedStaff = { ...staffMember, permissions: flatPerms };
        await dispatch(updateStaffAction(updatedStaff));
        
        toast({ title: "Permissions Updated", description: `Permissions for ${staffMember.name} have been saved.` });
        setIsPermissionsDialogOpen(false);
    }

    const handleGenerateManualMagicLink = async () => {
        if (!staffMember) return;
        
        try {
            const result = await generateMagicLink({ 
                staffId: staffMember.id, 
                phone: staffMember.phone 
            }).unwrap();

            if (result.success && result.magicLink) {
                setMagicLink(result.magicLink);
                setIsMagicLinkDialogOpen(true);
                toast({ title: "Magic Link Generated", description: "You can now share this login link with the staff member." });
            } else {
                toast({ title: "Error", description: "Failed to generate link", variant: "destructive" });
            }
        } catch (error: any) {
            toast({ title: "Error", description: error.data?.error || "Failed to generate link", variant: "destructive" });
        }
    }

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-8 w-48" />
                <div className="grid md:grid-cols-3 gap-6">
                    <Skeleton className="h-64 md:col-span-1" />
                    <Skeleton className="h-64 md:col-span-2" />
                </div>
            </div>
        )
    }

    if (!staffMember) {
        return (
            <div className="text-center py-10">
                <User className="mx-auto h-12 w-12 text-muted-foreground" />
                <h2 className="mt-4 text-xl font-semibold">Staff Member Not Found</h2>
                <Button onClick={() => router.back()} className="mt-4" variant="outline">Go Back</Button>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-6 max-w-6xl mx-auto p-4 sm:p-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <h1 className="text-2xl font-bold">{staffMember.name}'s Profile</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6">
                    <Card>
                        <CardContent className="pt-6 flex flex-col items-center text-center">
                            <Avatar className="w-24 h-24 mb-4 ring-2 ring-primary/10">
                                <AvatarImage src={`https://placehold.co/100x100.png?text=${staffMember.name.charAt(0)}`} />
                                <AvatarFallback>{staffMember.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <h2 className="text-xl font-semibold">{staffMember.name}</h2>
                            <Badge className={cn("capitalize mt-2 border-transparent", roleColors[staffMember.role])}>{staffMember.role}</Badge>
                            
                            <div className="w-full text-sm text-muted-foreground space-y-3 mt-6 text-left">
                                <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                                    <Phone className="w-4 h-4 text-primary" /> 
                                    <span>{staffMember.phone}</span>
                                </div>
                                <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                                    <Mail className="w-4 h-4 text-primary" /> 
                                    <span className="truncate">{staffMember.email || 'No email provided'}</span>
                                </div>
                                <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                                    <Building className="w-4 h-4 text-primary" /> 
                                    <span>{staffMember.pgName}</span>
                                </div>
                                <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                                    <IndianRupee className="w-4 h-4 text-primary" /> 
                                    <span className="font-medium text-foreground">₹{staffMember.salary.toLocaleString('en-IN')} / month</span>
                                </div>
                            </div>

                            <Button 
                                variant="outline" 
                                className="w-full mt-6" 
                                disabled={isGeneratingLink}
                                onClick={handleGenerateManualMagicLink}
                            >
                                {isGeneratingLink ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LinkIcon className="w-4 h-4 mr-2" />}
                                {magicLink ? 'Regenerate Magic Link' : 'Generate Magic Link'}
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <ShieldAlert className="w-5 h-5 text-primary" />
                                    Account Permissions
                                </CardTitle>
                                <CardDescription>Manage what {staffMember.name} can access on the dashboard.</CardDescription>
                            </div>
                            <Button variant="outline" size="sm" onClick={handleOpenPermissions}>
                                <Pencil className="w-4 h-4 mr-2" /> Edit Granularly
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {staffMember.permissions && staffMember.permissions.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {staffMember.permissions.map((perm) => (
                                            <Badge key={perm} variant="secondary" className="px-3 py-1 font-normal">
                                                {perm.replace(':', ' • ')}
                                            </Badge>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-6 border-2 border-dashed rounded-lg bg-muted/20">
                                        <ShieldAlert className="w-8 h-8 mx-auto text-muted-foreground opacity-50 mb-2" />
                                        <p className="text-sm text-muted-foreground">No custom permissions assigned.</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Quick Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Button variant="outline" className="justify-start h-auto py-4 px-4" asChild>
                                <a href={`tel:${staffMember.phone}`}>
                                    <Phone className="mr-3 h-5 w-5 text-green-600" />
                                    <div className="text-left">
                                        <div className="font-semibold">Call Staff</div>
                                        <div className="text-xs text-muted-foreground">Direct cellular call</div>
                                    </div>
                                </a>
                            </Button>
                            <Button variant="outline" className="justify-start h-auto py-4 px-4" asChild>
                                <a href={`https://wa.me/${staffMember.phone}`} target="_blank" rel="noopener noreferrer">
                                    <MessageCircle className="mr-3 h-5 w-5 text-green-500" />
                                    <div className="text-left">
                                        <div className="font-semibold">WhatsApp</div>
                                        <div className="text-xs text-muted-foreground">Chat via WhatsApp</div>
                                    </div>
                                </a>
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Permissions Dialog */}
            <Dialog open={isPermissionsDialogOpen} onOpenChange={setIsPermissionsDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ShieldAlert className="w-5 h-5 text-primary" />
                            Manage Permissions - {staffMember.name}
                        </DialogTitle>
                        <DialogDescription>Configure granular permissions for this staff member.</DialogDescription>
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
                                                checked={selectedPermissions[config.featureId]?.[action.id] || false}
                                                onCheckedChange={(checked) =>
                                                    handlePermissionChange(config.featureId, action.id, checked as boolean)
                                                }
                                            />
                                            <Label htmlFor={`${config.featureId}-${action.id}`} className="text-sm">{action.label}</Label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <DialogFooter className="sticky bottom-0 bg-background pt-4 border-t">
                        <Button variant="outline" onClick={() => setIsPermissionsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSavePermissions}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Magic Link Dialog */}
            <Dialog open={isMagicLinkDialogOpen} onOpenChange={setIsMagicLinkDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Magic Link Generated</DialogTitle>
                        <DialogDescription>The staff member can use this link to log in instantly without a password.</DialogDescription>
                    </DialogHeader>
                    <div className="p-4 bg-muted rounded-md break-all text-sm font-mono border">
                        {magicLink}
                    </div>
                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button variant="secondary" onClick={() => { navigator.clipboard.writeText(magicLink); toast({ title: "Copied!" }) }}>
                            <Copy className="mr-2 h-4 w-4" /> Copy
                        </Button>
                        <Button className="bg-green-500 hover:bg-green-600 text-white" asChild>
                            <a href={`https://wa.me/${staffMember.phone}?text=${encodeURIComponent(`Hi ${staffMember.name}, here is your magic login link for RoomBox: ${magicLink}`)}`} target="_blank" rel="noopener noreferrer">
                                <MessageCircle className="mr-2 h-4 w-4" /> Share on WhatsApp
                            </a>
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
