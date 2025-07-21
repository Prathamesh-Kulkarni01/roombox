
import { useEffect, useState } from "react"
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import type { UseDashboardReturn } from "@/hooks/use-dashboard"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Users, IndianRupee } from "lucide-react"
import { useAppSelector } from "@/lib/hooks"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const sharedChargeSchema = z.object({
    description: z.string().min(3, "Description is required."),
    totalAmount: z.coerce.number().min(1, "Total amount must be greater than 0."),
    unitCost: z.coerce.number().optional(),
    units: z.coerce.number().optional(),
});

type SharedChargeDialogProps = Pick<UseDashboardReturn, 'isSharedChargeDialogOpen' | 'setIsSharedChargeDialogOpen' | 'sharedChargeForm' | 'handleSharedChargeSubmit' | 'roomForSharedCharge'>;

export default function SharedChargeDialog({ isSharedChargeDialogOpen, setIsSharedChargeDialogOpen, sharedChargeForm, handleSharedChargeSubmit, roomForSharedCharge }: SharedChargeDialogProps) {
    const { chargeTemplates } = useAppSelector(state => state.chargeTemplates);

    const [activeTab, setActiveTab] = useState('custom');

    const totalAmount = sharedChargeForm.watch('totalAmount');
    const units = sharedChargeForm.watch('units');
    const unitCost = sharedChargeForm.watch('unitCost');

    const occupiedGuests = roomForSharedCharge?.guests || [];

    const calculatedTotal = activeTab !== 'custom' && units && unitCost ? units * unitCost : totalAmount;
    const chargePerGuest = occupiedGuests.length > 0 && calculatedTotal ? (calculatedTotal / occupiedGuests.length) : 0;
  
    useEffect(() => {
        if (roomForSharedCharge) {
            sharedChargeForm.reset({ description: '', totalAmount: undefined, units: undefined, unitCost: undefined });
            const defaultTab = chargeTemplates.find(t => t.autoAddToDialog)?.id || 'custom';
            setActiveTab(defaultTab);
        }
    }, [roomForSharedCharge, chargeTemplates, sharedChargeForm]);

    const onTabChange = (tabValue: string) => {
        setActiveTab(tabValue);
        const template = chargeTemplates.find(t => t.id === tabValue);
        sharedChargeForm.reset({
            description: template ? template.name : '',
            unitCost: template?.unitCost || undefined,
            totalAmount: undefined,
            units: undefined,
        });
    }

    const visibleTemplates = chargeTemplates.filter(t => t.autoAddToDialog);

    return (
        <Dialog open={isSharedChargeDialogOpen} onOpenChange={setIsSharedChargeDialogOpen}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Add Shared Charge to Room {roomForSharedCharge?.name}</DialogTitle>
                    <DialogDescription>Split a bill equally among all occupied beds in this room.</DialogDescription>
                </DialogHeader>
                 <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        {visibleTemplates.map(template => (
                           <TabsTrigger key={template.id} value={template.id}>{template.name}</TabsTrigger>
                        ))}
                        <TabsTrigger value="custom">Custom</TabsTrigger>
                    </TabsList>

                    <Form {...sharedChargeForm}>
                        <form onSubmit={sharedChargeForm.handleSubmit(handleSharedChargeSubmit)} id="shared-charge-form" className="space-y-4 pt-4">
                            {chargeTemplates.map(template => (
                                <TabsContent key={template.id} value={template.id} forceMount hidden={activeTab !== template.id}>
                                    <div className="space-y-4">
                                         <FormField control={sharedChargeForm.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        {template.calculation === 'unit' && (
                                            <div className="grid grid-cols-2 gap-4">
                                                <FormField control={sharedChargeForm.control} name="units" render={({ field }) => (<FormItem><FormLabel>Total Units</FormLabel><FormControl><Input type="number" placeholder="e.g., 300" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField control={sharedChargeForm.control} name="unitCost" render={({ field }) => (<FormItem><FormLabel>Cost per Unit (₹)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                            </div>
                                        )}
                                        {template.calculation === 'fixed' && (
                                            <FormField control={sharedChargeForm.control} name="totalAmount" render={({ field }) => (<FormItem><FormLabel>Total Bill Amount (₹)</FormLabel><FormControl><Input type="number" placeholder="e.g., 2500" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        )}
                                    </div>
                                </TabsContent>
                            ))}
                            <TabsContent value="custom" forceMount hidden={activeTab !== 'custom'}>
                               <div className="space-y-4">
                                <FormField control={sharedChargeForm.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Input placeholder="e.g., Party Contribution" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={sharedChargeForm.control} name="totalAmount" render={({ field }) => (<FormItem><FormLabel>Total Amount (₹)</FormLabel><FormControl><Input type="number" placeholder="e.g., 1000" {...field} /></FormControl><FormMessage /></FormItem>)} />
                               </div>
                            </TabsContent>

                            {occupiedGuests.length > 0 && calculatedTotal > 0 && (
                                <Alert>
                                    <Users className="h-4 w-4" />
                                    <AlertTitle>Charge Distribution</AlertTitle>
                                    <AlertDescription className="flex items-center justify-between">
                                        <span>
                                            ₹{chargePerGuest.toFixed(2)} per guest ({occupiedGuests.length} guests)
                                        </span>
                                    </AlertDescription>
                                </Alert>
                            )}
                            <div className="space-y-2">
                                <p className="text-sm font-medium">Affected Guests:</p>
                                <ul className="text-sm text-muted-foreground list-disc list-inside">
                                    {occupiedGuests.map(guest => <li key={guest.id}>{guest.name}</li>)}
                                </ul>
                            </div>
                        </form>
                    </Form>
                </Tabs>
                 <DialogFooter className="mt-4">
                    <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
                    <Button type="submit" form="shared-charge-form" disabled={occupiedGuests.length === 0 || calculatedTotal <= 0}>Apply Charge</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
