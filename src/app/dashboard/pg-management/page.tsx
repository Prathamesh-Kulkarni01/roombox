
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
import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from '@/hooks/use-toast'
import AddPgSheet from '@/components/add-pg-sheet'
import { deletePg as deletePgAction } from '@/lib/slices/pgsSlice'
import type { PG } from '@/lib/types'

const genderBadgeColor = {
  male: 'bg-blue-100 text-blue-800',
  female: 'bg-pink-100 text-pink-800',
  'co-ed': 'bg-purple-100 text-purple-800',
};


export default function PgManagementPage() {
    const dispatch = useAppDispatch();
    const { pgs, guests } = useAppSelector(state => ({
        pgs: state.pgs.pgs,
        guests: state.guests.guests,
    }));
    const { isLoading } = useAppSelector(state => state.app);
    const { currentPlan } = useAppSelector(state => state.user);
    const router = useRouter();
    const { toast } = useToast()
    const [isAddPgSheetOpen, setIsAddPgSheetOpen] = useState(false)
    const [pgToDelete, setPgToDelete] = useState<PG | null>(null);

    const canAddPg = currentPlan && (currentPlan.pgLimit === 'unlimited' || pgs.length < currentPlan.pgLimit);

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
            await dispatch(deletePgAction(pgId)).unwrap();
            toast({
                title: "Property Deleted",
                description: `"${pgName}" has been successfully removed.`,
            });
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Deletion Failed",
                description: error.message || "An unexpected error occurred.",
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
                            <Skeleton key={i} className="h-28 w-full rounded-lg" />
                        ))}
                        </div>
                        {/* Desktop skeleton */}
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
    
    return (
        <div className="flex flex-col gap-8">
            <AddPgSheet 
                open={isAddPgSheetOpen} 
                onOpenChange={setIsAddPgSheetOpen}
                onPgAdded={(pgId) => router.push(`/dashboard/pg-management/${pgId}?setup=true`)}
            />
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
                                    <Button onClick={handleAddPgClick} disabled={!canAddPg}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Add New Property
                                </Button>
                                </div>
                            </TooltipTrigger>
                            {!canAddPg && (
                                    <TooltipContent>
                                    <p>You have reached your plan's property limit.</p>
                                    </TooltipContent>
                            )}
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
                            <Button className="mt-4" onClick={handleAddPgClick}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Property
                            </Button>
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
                                            <Badge className={cn("capitalize border-transparent", genderBadgeColor[pg.gender])}>
                                                {pg.gender}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{pg.occupancy}/{pg.totalBeds}</TableCell>
                                        <TableCell className="flex items-center">
                                          <IndianRupee className="w-4 h-4 mr-1 text-muted-foreground"/>
                                          {pg.priceRange.min} - {pg.priceRange.max}
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
                                                    <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-500/10" onClick={() => setPgToDelete(pg)}>
                                                        <Trash2 className="mr-2 h-4 w-4"/> Delete
                                                    </DropdownMenuItem>
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
                                            <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-500/10" onClick={() => setPgToDelete(pg)}>
                                                 <Trash2 className="mr-2 h-4 w-4"/> Delete
                                            </DropdownMenuItem>
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
                                             <IndianRupee className="w-4 h-4 text-muted-foreground"/>
                                             <span>{pg.priceRange.min} - {pg.priceRange.max}</span>
                                        </div>
                                    </div>
                                    <Badge className={cn("capitalize border-transparent", genderBadgeColor[pg.gender])}>
                                        {pg.gender}
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
                        <AlertDialogAction
                            className="bg-destructive hover:bg-destructive/90"
                            onClick={() => handleDeletePg(pgToDelete!.id, pgToDelete!.name)}
                        >
                            Continue
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
