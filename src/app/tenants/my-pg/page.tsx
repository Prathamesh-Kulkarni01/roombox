
'use client'

import { useAppSelector } from "@/lib/hooks"
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, BedDouble, Building, Calendar, CheckCircle, Clock, FileText, IndianRupee, ShieldCheck } from "lucide-react"
import { format, differenceInDays, parseISO } from "date-fns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useMemo } from "react"
import Link from "next/link"

const rentStatusColors: Record<string, string> = {
  paid: 'bg-green-100 text-green-800 border-green-300',
  unpaid: 'bg-red-100 text-red-800 border-red-300',
  partial: 'bg-orange-100 text-orange-800 border-orange-300',
};

const kycStatusColors: Record<string, string> = {
  verified: 'text-blue-600',
  pending: 'text-yellow-600',
  rejected: 'text-red-600'
};


export default function MyPgPage() {
    const { currentUser } = useAppSelector(state => state.user)
    const { guests } = useAppSelector(state => state.guests)
    const { pgs } = useAppSelector(state => state.pgs)
    const { isLoading } = useAppSelector(state => state.app)

    const currentGuest = useMemo(() => {
        if (!currentUser || !currentUser.guestId) return null;
        return guests.find(g => g.id === currentUser.guestId);
    }, [currentUser, guests]);

    const currentPg = useMemo(() => {
        if (!currentGuest) return null;
        return pgs.find(p => p.id === currentGuest.pgId);
    }, [currentGuest, pgs]);

    const bedDetails = useMemo(() => {
        if (!currentPg || !currentGuest) return { roomName: 'N/A', bedName: 'N/A' };
        for (const floor of currentPg.floors || []) {
            for (const room of floor.rooms) {
                const bed = room.beds.find(b => b.id === currentGuest.bedId);
                if (bed) {
                    return { roomName: room.name, bedName: bed.name };
                }
            }
        }
        return { roomName: 'N/A', bedName: 'N/A' };
    }, [currentPg, currentGuest]);

    if (isLoading || !currentGuest || !currentPg) {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <Skeleton className="h-8 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                        </CardHeader>
                        <CardContent className="grid md:grid-cols-2 gap-6">
                            <Skeleton className="h-6 w-full" />
                            <Skeleton className="h-6 w-full" />
                            <Skeleton className="h-6 w-full" />
                            <Skeleton className="h-6 w-full" />
                        </CardContent>
                    </Card>
                    <Card>
                         <CardHeader>
                            <Skeleton className="h-7 w-1/3" />
                         </CardHeader>
                         <CardContent>
                            <Skeleton className="h-14 w-full" />
                         </CardContent>
                    </Card>
                </div>
                <div className="lg:col-span-1 space-y-6">
                     <Card>
                        <CardHeader><Skeleton className="h-7 w-1/2" /></CardHeader>
                        <CardContent className="space-y-4">
                            <Skeleton className="h-6 w-full" />
                            <Skeleton className="h-6 w-full" />
                            <Skeleton className="h-7 w-full" />
                            <Skeleton className="h-6 w-full" />
                        </CardContent>
                        <CardFooter><Skeleton className="h-10 w-full" /></CardFooter>
                     </Card>
                </div>
            </div>
        )
    }

    const stayDuration = differenceInDays(new Date(), new Date(currentGuest.moveInDate))

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-2xl">
                           <Building/> Welcome to {currentGuest.pgName}!
                        </CardTitle>
                        <CardDescription>Here are the details about your stay.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid md:grid-cols-2 gap-6 text-sm">
                        <div className="flex items-center gap-3"><Calendar className="w-5 h-5 text-primary" /><p>Moved In: <span className="font-medium">{format(new Date(currentGuest.moveInDate), "do MMM, yyyy")}</span></p></div>
                        <div className="flex items-center gap-3"><Clock className="w-5 h-5 text-primary" /><p>Stay Duration: <span className="font-medium">{stayDuration} days</span></p></div>
                        <div className="flex items-center gap-3"><BedDouble className="w-5 h-5 text-primary" /><p>Room/Bed: <span className="font-medium">Room {bedDetails.roomName}, Bed {bedDetails.bedName}</span></p></div>
                        <div className="flex items-center gap-3"><FileText className="w-5 h-5 text-primary" /><p>Notice Period: <span className="font-medium">{currentGuest.noticePeriodDays} days</span></p></div>
                    </CardContent>
                    {currentGuest.exitDate && (
                         <CardFooter>
                             <Alert variant="default" className="bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-200 w-full">
                                <AlertCircle className="text-blue-600 dark:text-blue-400" />
                                <AlertTitle className="font-semibold">Notice Period Active</AlertTitle>
                                <AlertDescription>Your final day to vacate is <span className="font-bold">{format(new Date(currentGuest.exitDate), "do MMMM, yyyy")}</span>.</AlertDescription>
                            </Alert>
                        </CardFooter>
                    )}
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl">KYC Status</CardTitle>
                        <CardDescription>Keep your documents up to date for a hassle-free stay.</CardDescription>
                    </CardHeader>
                     <CardContent>
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                           <div className="flex items-center gap-3">
                                <ShieldCheck className={cn("w-6 h-6", kycStatusColors[currentGuest.kycStatus])} />
                                <div>
                                    <p className="font-semibold">Your KYC is <span className="capitalize">{currentGuest.kycStatus}</span></p>
                                    <p className="text-xs text-muted-foreground">
                                        {currentGuest.kycStatus === 'verified' && "All documents are verified."}
                                        {currentGuest.kycStatus === 'pending' && "Awaiting review by your PG manager."}
                                        {currentGuest.kycStatus === 'rejected' && "There was an issue with your documents. Please contact the manager."}
                                        {currentGuest.kycStatus === 'not-started' && "Please submit your documents to the PG manager."}
                                    </p>
                                </div>
                           </div>
                           {currentGuest.kycStatus !== 'verified' && (
                                <Button asChild><Link href="/tenants/kyc">Upload Document</Link></Button>
                           )}
                        </div>
                     </CardContent>
                </Card>
            </div>
            <div className="lg:col-span-1 space-y-6">
                <Card className="sticky top-20">
                    <CardHeader>
                        <CardTitle className="text-xl">Rent Details</CardTitle>
                    </CardHeader>
                     <CardContent className="space-y-4">
                        <div className="flex justify-between items-center text-sm">
                            <span>Status:</span>
                            <Badge variant="outline" className={cn("capitalize text-base", rentStatusColors[currentGuest.rentStatus])}>{currentGuest.rentStatus}</Badge>
                        </div>
                         <div className="flex justify-between items-center text-sm">
                            <span>Monthly Rent:</span>
                            <span className="font-medium">₹{currentGuest.rentAmount.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm">Amount Due:</span>
                            <span className="font-bold text-lg text-primary">₹{(currentGuest.rentAmount - (currentGuest.rentPaidAmount || 0)).toLocaleString('en-IN')}</span>
                        </div>
                         <div className="flex justify-between items-center text-sm">
                            <span>Next Due Date:</span>
                            <span className="font-medium">{format(new Date(currentGuest.dueDate), "do MMM, yyyy")}</span>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90">Pay Now</Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    )
}
