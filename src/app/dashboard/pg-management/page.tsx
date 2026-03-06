'use client'

import { useState } from 'react'
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { PlusCircle, MoreHorizontal, IndianRupee, Users, MapPin, Pencil, Building, Trash2 } from "lucide-react"
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
import { usePermissionsStore } from '@/lib/stores/configStores'
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from '@/hooks/use-toast'
import AddPgSheet from '@/components/add-pg-sheet'
import type { PG } from '@/lib/types'
import Access from '@/components/ui/PermissionWrapper';
import { useGetPropertiesQuery, useGetGuestsQuery, useDeletePropertyMutation } from '@/lib/api/apiSlice'

const genderBadgeColor = {
    male: 'bg-blue-100 text-blue-800',
    female: 'bg-pink-100 text-pink-800',
    'co-ed': 'bg-purple-100 text-purple-800',
    'co-living': 'bg-purple-100 text-purple-800',
};


export default function PgManagementPage() {
    const { currentUser, currentPlan } = useAppSelector(state => state.user);
    const { featurePermissions } = usePermissionsStore();
    const router = useRouter();
    const { toast } = useToast()
    const [isAddPgSheetOpen, setIsAddPgSheetOpen] = useState(false)
    const [pgToDelete, setPgToDelete] = useState<PG | null>(null);

    // RTK Query hooks
    const { data: pgsData, isLoading: isLoadingPgs, refetch: refetchPgs } = useGetPropertiesQuery(currentUser?.id || '', {
        skip: !currentUser?.id
    });
    const { data: guestsData, isLoading: isLoadingGuests } = useGetGuestsQuery({ ownerId: currentUser?.id || '' }, {
        skip: !currentUser?.id
    });
    const [deleteProperty] = useDeletePropertyMutation();

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
            await deleteProperty({ ownerId: currentUser.id, pgId }).unwrap();
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
