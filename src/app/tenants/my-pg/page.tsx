
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
    verified: 'text-blue-600 dark:text-blue-400',
    pending: 'text-yellow-600 dark:text-yellow-400',
    rejected: 'text-red-600 dark:text-red-400',
    'not-started': 'text-gray-600 dark:text-gray-400',
};


export default function MyPgPage() {
    const { currentUser } = useAppSelector(state => state.user)
    const { guests } = useAppSelector(state => state.guests)
    const { pgs } = useAppSelector(state => state.pgs)
    const { isLoading } = useAppSelector(state => state.app)

    const currentGuest = currentUser?.guestId
    const currentPg =  currentUser?.pgId    

    const bedDetails = useMemo(() => {
        if (!currentPg || !currentGuest) return { roomName: 'N/A', bedName: 'N/A' };
        const pg = pgs.find(p => p.id === currentPg)
        if (!pg) return { roomName: 'N/A', bedName: 'N/A' };
        const floor = pg.floors.find(f => f.id === currentGuest.floorId)
        if (!floor) return { roomName: 'N/A', bedName: 'N/A' };
        const room = floor.rooms.find(r => r.id === currentGuest.roomId)
        if (!room) return { roomName: 'N/A', bedName: 'N/A' };
        const bed = room.beds.find(b => b.id === currentGuest.bedId)
        if (!bed) return { roomName: 'N/A', bedName: 'N/A' };
        return { roomName: room.name, bedName: bed.name };  
    }, [currentPg, currentGuest]);

     const { totalDue, balanceBroughtForward } = useMemo(() => {
        if (!currentGuest) return { totalDue: 0, balanceBroughtForward: 0 };
        
        const balanceBf = currentGuest.balanceBroughtForward || 0;
        const currentMonthRent = currentGuest.rentAmount;
        const chargesDue = (currentGuest.additionalCharges || []).reduce((sum, charge) => sum + charge.amount, 0);
        
        const total = balanceBf + currentMonthRent + chargesDue - (currentGuest.rentPaidAmount || 0);

        return { totalDue: total, balanceBroughtForward: balanceBf };
    }, [currentGuest]);
console.log({currentGuest, currentPg})

    if ( !currentGuest || !currentPg) {
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
                    {currentGuest.exitDate && !currentGuest.isVacated && (
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
                                    <p className="font-semibold">Your KYC is <span className="capitalize">{currentGuest.kycStatus.replace('-',' ')}</span></p>
                                    <p className="text-xs text-muted-foreground">
                                        {currentGuest.kycStatus === 'verified' && "All documents are verified."}
                                        {currentGuest.kycStatus === 'pending' && "Awaiting review by your property manager."}
                                        {currentGuest.kycStatus === 'rejected' && "There was an issue with your documents. Please contact the manager."}
                                        {currentGuest.kycStatus === 'not-started' && "Please submit your documents to get verified."}
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
                        <CardDescription>Due on {format(new Date(currentGuest.dueDate), "do MMMM, yyyy")}</CardDescription>
                    </CardHeader>
                     <CardContent className="space-y-4">
                        <div className="flex justify-between items-center text-sm">
                            <span>Status:</span>
                            <Badge variant="outline" className={cn("capitalize text-base", rentStatusColors[currentGuest.rentStatus])}>{currentGuest.rentStatus}</Badge>
                        </div>
                        <div className="space-y-2 pt-4 border-t text-sm">
                            {balanceBroughtForward > 0 && (
                                <div className="flex justify-between items-center text-muted-foreground">
                                    <span>Previous Dues:</span>
                                    <span className="font-medium text-foreground">₹{balanceBroughtForward.toLocaleString('en-IN')}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center text-muted-foreground">
                                <span>Current Rent:</span>
                                <span className="font-medium text-foreground">₹{currentGuest.rentAmount.toLocaleString('en-IN')}</span>
                            </div>
                            {(currentGuest.additionalCharges || []).map(charge => (
                                <div key={charge.id} className="flex justify-between items-center text-muted-foreground">
                                    <span>{charge.description}:</span>
                                    <span className="font-medium text-foreground">₹{charge.amount.toLocaleString('en-IN')}</span>
                                </div>
                            ))}
                             {(currentGuest.rentPaidAmount || 0) > 0 && (
                                <div className="flex justify-between items-center text-green-600 dark:text-green-400">
                                    <span>Paid this cycle:</span>
                                    <span className="font-medium">- ₹{(currentGuest.rentPaidAmount || 0).toLocaleString('en-IN')}</span>
                                </div>
                            )}
                        </div>
                        <div className="flex justify-between items-center pt-4 border-t">
                            <span className="text-base font-semibold">Total Due:</span>
                            <span className="font-bold text-lg text-primary">₹{totalDue.toLocaleString('en-IN')}</span>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={totalDue <= 0}>Pay Now</Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    )
}
