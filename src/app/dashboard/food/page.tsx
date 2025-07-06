'use client'

import { useState, useEffect } from 'react'
import { useData } from '@/context/data-provider'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { ChefHat, Package } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { Menu, DayOfWeek } from '@/lib/types'
import { Skeleton } from '@/components/ui/skeleton'

const initialMenu: Menu = {
    monday: { breakfast: '', lunch: '', dinner: '' },
    tuesday: { breakfast: '', lunch: '', dinner: '' },
    wednesday: { breakfast: '', lunch: '', dinner: '' },
    thursday: { breakfast: '', lunch: '', dinner: '' },
    friday: { breakfast: '', lunch: '', dinner: '' },
    saturday: { breakfast: '', lunch: '', dinner: '' },
    sunday: { breakfast: '', lunch: '', dinner: '' },
}

const days: { key: DayOfWeek; label: string }[] = [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
    { key: 'sunday', label: 'Sunday' },
]

export default function FoodPage() {
    const { pgs, updatePgMenu, isLoading, selectedPgId } = useData()
    const [menu, setMenu] = useState<Menu>(initialMenu)
    const { toast } = useToast()

    useEffect(() => {
        if (selectedPgId) {
            const selectedPg = pgs.find(pg => pg.id === selectedPgId)
            setMenu(selectedPg?.menu || initialMenu)
        } else {
            setMenu(initialMenu)
        }
    }, [selectedPgId, pgs])

    const handleMenuChange = (day: DayOfWeek, meal: keyof typeof menu.monday, value: string) => {
        setMenu(prev => ({
            ...prev,
            [day]: { ...prev[day], [meal]: value }
        }))
    }

    const handleSaveMenu = () => {
        if (!selectedPgId || !menu) return;
        updatePgMenu(selectedPgId, menu)
        toast({
            title: "Menu Saved!",
            description: "The menu has been updated successfully.",
        })
    }
    
    if (isLoading) {
        return (
            <div className="flex flex-col gap-8">
                <div>
                    <Skeleton className="h-9 w-64 mb-2" />
                    <Skeleton className="h-5 w-80" />
                </div>
                <Card>
                    <CardHeader>
                        <Skeleton className="h-8 w-48 mb-2" />
                        <Skeleton className="h-5 w-72" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between mb-4">
                            <Skeleton className="h-8 w-48" />
                            <Skeleton className="h-10 w-48" />
                        </div>
                        <Skeleton className="h-10 w-full mb-4" />
                        <Skeleton className="h-64 w-full" />
                    </CardContent>
                    <CardFooter>
                         <Skeleton className="h-10 w-32" />
                    </CardFooter>
                </Card>
                 <Card>
                    <CardHeader>
                        <Skeleton className="h-8 w-56" />
                        <Skeleton className="h-5 w-full" />
                    </CardHeader>
                </Card>
            </div>
        )
    }

    if (!selectedPgId) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <ChefHat className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h2 className="mt-4 text-xl font-semibold">Food Management</h2>
                    <p className="mt-2 text-muted-foreground">Please select a PG to plan its weekly menu.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-8">
            <div>
                <h1 className="text-3xl font-bold font-headline flex items-center gap-2">
                    <ChefHat className="w-8 h-8 text-primary" /> Daily Menu Management
                </h1>
                <p className="text-muted-foreground">Plan and display the weekly menu for your PGs.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Weekly Menu Planner</CardTitle>
                    <CardDescription>Set the menu for each day of the week for the selected PG.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="monday" className="w-full">
                        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-4 md:grid-cols-7">
                           {days.map(day => (
                                <TabsTrigger key={day.key} value={day.key}>{day.label}</TabsTrigger>
                           ))}
                        </TabsList>
                        {days.map(day => (
                             <TabsContent key={day.key} value={day.key}>
                                <div className="grid gap-6 mt-4 md:grid-cols-3">
                                    <div className="grid gap-2">
                                        <Label htmlFor={`${day.key}-breakfast`}>Breakfast</Label>
                                        <Textarea
                                            id={`${day.key}-breakfast`}
                                            placeholder="e.g., Poha, Tea"
                                            value={menu[day.key]?.breakfast || ''}
                                            onChange={(e) => handleMenuChange(day.key, 'breakfast', e.target.value)}
                                            rows={3}
                                            disabled={!selectedPgId}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor={`${day.key}-lunch`}>Lunch</Label>
                                        <Textarea
                                            id={`${day.key}-lunch`}
                                            placeholder="e.g., Roti, Sabzi, Dal, Rice"
                                            value={menu[day.key]?.lunch || ''}
                                            onChange={(e) => handleMenuChange(day.key, 'lunch', e.target.value)}
                                            rows={3}
                                            disabled={!selectedPgId}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor={`${day.key}-dinner`}>Dinner</Label>
                                        <Textarea
                                            id={`${day.key}-dinner`}
                                            placeholder="e.g., Pulao, Raita"
                                            value={menu[day.key]?.dinner || ''}
                                            onChange={(e) => handleMenuChange(day.key, 'dinner', e.target.value)}
                                            rows={3}
                                            disabled={!selectedPgId}
                                        />
                                    </div>
                                </div>
                            </TabsContent>
                        ))}
                    </Tabs>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleSaveMenu} disabled={!selectedPgId}>Save Changes</Button>
                </CardFooter>
            </Card>
            
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Package className="w-6 h-6 text-primary" /> Inventory Management
                    </CardTitle>
                    <CardDescription>
                        This section is under development. You'll soon be able to track your kitchen inventory, manage stock levels, and create shopping lists.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Thank you for your patience!</p>
                </CardContent>
            </Card>

        </div>
    )
}
