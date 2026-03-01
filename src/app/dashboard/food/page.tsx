
'use client'

import { useState, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/lib/hooks'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { ChefHat, Building, BookCopy, Package, Star, ThumbsUp, ThumbsDown } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { Menu, DayOfWeek, InventoryItem, MenuTemplate } from '@/lib/types'
import { Skeleton } from '@/components/ui/skeleton'
import { updatePg } from '@/lib/slices/pgsSlice'
import { canAccess } from '@/lib/permissions'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { addMenuTemplate, deleteMenuTemplate } from '@/lib/slices/pgsSlice'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'


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

const templateSchema = z.object({
    name: z.string().min(3, "Template name must be at least 3 characters.")
});

export default function FoodPage() {
    const dispatch = useAppDispatch()
    const { pgs } = useAppSelector(state => state.pgs)
    const { isLoading, selectedPgId } = useAppSelector(state => state.app)
    const [menu, setMenu] = useState<Menu>(initialMenu)
    const { toast } = useToast()
    const { currentUser } = useAppSelector(state => state.user);
    const { featurePermissions } = useAppSelector(state => state.permissions);
    const canEditMenu = canAccess(featurePermissions, currentUser?.role, 'food', 'edit');

    const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
    const templateForm = useForm<z.infer<typeof templateSchema>>({ resolver: zodResolver(templateSchema) });

    const selectedPg = pgs.find(pg => pg.id === selectedPgId)

    useEffect(() => {
        if (selectedPg) {
            setMenu(selectedPg.menu || initialMenu)
        } else {
            setMenu(initialMenu)
        }
    }, [selectedPg])

    const handleMenuChange = (day: DayOfWeek, meal: keyof Omit<typeof menu.monday, 'ratings'>, value: string) => {
        setMenu(prev => ({
            ...prev,
            [day]: { ...prev[day], [meal]: value }
        }))
    }

    const handleSaveMenu = () => {
        if (!selectedPgId || !menu || !selectedPg) return;
        const pgToUpdate = { ...selectedPg, menu };
        dispatch(updatePg(pgToUpdate));
        toast({
            title: "Menu Saved!",
            description: `The menu for ${selectedPg?.name} has been updated successfully.`,
        })
    }
    
    const handleSaveTemplate = (data: z.infer<typeof templateSchema>) => {
        if (!selectedPgId || !menu) return;
        const newTemplate: MenuTemplate = { id: `template-${Date.now()}`, name: data.name, menu };
        dispatch(addMenuTemplate({ pgId: selectedPgId, template: newTemplate }));
        toast({ title: 'Template Saved', description: `"${data.name}" has been saved.` });
        setIsTemplateDialogOpen(false);
    }
    
    const handleApplyTemplate = (template: MenuTemplate) => {
        setMenu(template.menu);
        toast({ title: 'Template Applied', description: `The "${template.name}" menu has been applied. Don't forget to save.` });
    }

    const handleDeleteTemplate = (templateId: string) => {
        if (!selectedPgId) return;
        dispatch(deleteMenuTemplate({ pgId: selectedPgId, templateId }));
        toast({ title: 'Template Deleted' });
    }

    if (isLoading) {
        return (
            <div className="flex flex-col gap-8">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        )
    }

    if (!selectedPgId) {
        return (
            <div className="flex items-center justify-center h-full min-h-[40vh] bg-card border rounded-lg">
                <div className="text-center">
                    <Building className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h2 className="mt-4 text-xl font-semibold">Select a Property</h2>
                    <p className="mt-2 text-muted-foreground">Please select a property from the header to manage its food operations.</p>
                </div>
            </div>
        )
    }

    return (
        <Tabs defaultValue="planner" className="w-full space-y-6">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="planner"><ChefHat className="w-4 h-4 mr-2" />Planner</TabsTrigger>
                <TabsTrigger value="inventory"><Package className="w-4 h-4 mr-2"/>Inventory</TabsTrigger>
                <TabsTrigger value="feedback"><Star className="w-4 h-4 mr-2"/>Feedback</TabsTrigger>
            </TabsList>

            <TabsContent value="planner">
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Weekly Menu Planner for {selectedPg?.name}</CardTitle>
                            <CardDescription>Set the menu for each day of the week for the selected property.</CardDescription>
                        </div>
                        <div className="flex gap-2">
                             <Button variant="outline" onClick={() => setIsTemplateDialogOpen(true)}>
                                <BookCopy className="mr-2 h-4 w-4" /> Save as Template
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="monday" className="w-full">
                            <ScrollArea className="w-full whitespace-nowrap">
                                <TabsList>
                                {days.map(day => (
                                        <TabsTrigger key={day.key} value={day.key}>{day.label}</TabsTrigger>
                                ))}
                                </TabsList>
                                <ScrollBar orientation="horizontal" />
                            </ScrollArea>
                            {days.map(day => (
                                <TabsContent key={day.key} value={day.key}>
                                    <div className="grid gap-6 mt-4 md:grid-cols-3">
                                        <div className="grid gap-2">
                                            <Label htmlFor={`${day.key}-breakfast`}>Breakfast</Label>
                                            <Textarea id={`${day.key}-breakfast`} placeholder="e.g., Poha, Tea" value={menu[day.key]?.breakfast || ''} onChange={(e) => handleMenuChange(day.key, 'breakfast', e.target.value)} rows={3} disabled={!selectedPgId} />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor={`${day.key}-lunch`}>Lunch</Label>
                                            <Textarea id={`${day.key}-lunch`} placeholder="e.g., Roti, Sabzi, Dal, Rice" value={menu[day.key]?.lunch || ''} onChange={(e) => handleMenuChange(day.key, 'lunch', e.target.value)} rows={3} disabled={!selectedPgId} />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor={`${day.key}-dinner`}>Dinner</Label>
                                            <Textarea id={`${day.key}-dinner`} placeholder="e.g., Pulao, Raita" value={menu[day.key]?.dinner || ''} onChange={(e) => handleMenuChange(day.key, 'dinner', e.target.value)} rows={3} disabled={!selectedPgId} />
                                        </div>
                                    </div>
                                </TabsContent>
                            ))}
                        </Tabs>
                    </CardContent>
                    <CardFooter>
                        <Button onClick={canEditMenu ? handleSaveMenu : undefined} disabled={!selectedPgId || !canEditMenu}>Save Menu</Button>
                    </CardFooter>
                </Card>
            </TabsContent>
            <TabsContent value="inventory">
                <Card>
                    <CardHeader>
                        <CardTitle>Kitchen Inventory</CardTitle>
                        <CardDescription>This feature is coming soon! Track stock, get low-inventory alerts, and auto-generate shopping lists.</CardDescription>
                    </CardHeader>
                    <CardContent className="text-center py-10 text-muted-foreground">
                        <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Inventory management will be available here.</p>
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="feedback">
                <Card>
                    <CardHeader>
                        <CardTitle>Tenant Feedback</CardTitle>
                        <CardDescription>This feature is coming soon! See meal ratings and comments from your tenants to improve your service.</CardDescription>
                    </CardHeader>
                     <CardContent className="text-center py-10 text-muted-foreground">
                        <Star className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Meal ratings and feedback will be shown here.</p>
                    </CardContent>
                </Card>
            </TabsContent>

             <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Save Menu as Template</DialogTitle>
                        <DialogDescription>Save the current weekly menu as a reusable template.</DialogDescription>
                    </DialogHeader>
                    <Form {...templateForm}>
                        <form id="template-form" onSubmit={templateForm.handleSubmit(handleSaveTemplate)} className="space-y-4 pt-4">
                            <FormField control={templateForm.control} name="name" render={({ field }) => (
                                <FormItem><FormLabel>Template Name</FormLabel><FormControl><Input placeholder="e.g., Summer Menu, Exam Special" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                        </form>
                    </Form>
                    <div className="mt-4 space-y-2">
                        <h4 className="font-semibold text-sm">Existing Templates</h4>
                        {(selectedPg?.menuTemplates || []).length > 0 ? (
                            <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
                                {(selectedPg?.menuTemplates || []).map(template => (
                                    <div key={template.id} className="flex items-center justify-between p-2 border rounded-md">
                                        <span>{template.name}</span>
                                        <div className="flex gap-1">
                                            <Button size="sm" variant="ghost" onClick={() => handleApplyTemplate(template)}>Apply</Button>
                                            <Button size="sm" variant="destructive" onClick={() => handleDeleteTemplate(template.id)}>Delete</Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : <p className="text-sm text-muted-foreground">No saved templates yet.</p>}
                    </div>
                     <DialogFooter className="mt-6">
                        <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
                        <Button type="submit" form="template-form">Save Template</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Tabs>
    )
}
