
'use client'

import { useAppSelector } from "@/lib/hooks"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UtensilsCrossed } from "lucide-react"
import type { DayOfWeek } from '@/lib/types'
import { useMemo } from "react"

const days: { key: DayOfWeek; label: string }[] = [
    { key: 'monday', label: 'Mon' },
    { key: 'tuesday', label: 'Tue' },
    { key: 'wednesday', label: 'Wed' },
    { key: 'thursday', label: 'Thu' },
    { key: 'friday', label: 'Fri' },
    { key: 'saturday', label: 'Sat' },
    { key: 'sunday', label: 'Sun' },
]

export default function TenantFoodPage() {
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

    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as DayOfWeek;

    if (isLoading || !currentPg?.menu) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-48 mb-2" />
                    <Skeleton className="h-5 w-72" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-10 w-full mb-4" />
                    <Skeleton className="h-64 w-full" />
                </CardContent>
            </Card>
        )
    }

    const menu = currentPg.menu

    return (
        <div className="max-w-4xl mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">This Week's Menu</CardTitle>
                    <CardDescription>Here's what's cooking at {currentPg.name}.</CardDescription>
                </CardHeader>
                <CardContent>
                     <Tabs defaultValue={today} className="w-full">
                        <TabsList className="grid w-full grid-cols-4 md:grid-cols-7">
                           {days.map(day => (
                                <TabsTrigger key={day.key} value={day.key}>{day.label}</TabsTrigger>
                           ))}
                        </TabsList>
                        {days.map(day => (
                             <TabsContent key={day.key} value={day.key}>
                                <div className="grid gap-6 mt-6 md:grid-cols-3">
                                    <Card className="bg-muted/30 dark:bg-muted/20">
                                        <CardHeader>
                                            <CardTitle className="text-lg">Breakfast</CardTitle>
                                            <CardDescription>8:00 AM - 10:00 AM</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="font-medium">{menu[day.key]?.breakfast || 'Not set'}</p>
                                        </CardContent>
                                    </Card>
                                     <Card className="bg-muted/30 dark:bg-muted/20">
                                        <CardHeader>
                                            <CardTitle className="text-lg">Lunch</CardTitle>
                                            <CardDescription>12:30 PM - 2:30 PM</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="font-medium">{menu[day.key]?.lunch || 'Not set'}</p>
                                        </CardContent>
                                    </Card>
                                     <Card className="bg-muted/30 dark:bg-muted/20">
                                        <CardHeader>
                                            <CardTitle className="text-lg">Dinner</CardTitle>
                                            <CardDescription>8:00 PM - 10:00 PM</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="font-medium">{menu[day.key]?.dinner || 'Not set'}</p>
                                        </CardContent>
                                    </Card>
                                </div>
                            </TabsContent>
                        ))}
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    )
}
