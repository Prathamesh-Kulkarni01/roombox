'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { UseFormReturn } from 'react-hook-form'
import { PG } from '@/lib/types'

interface BulkAddDialogProps {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    type: 'rooms' | 'beds'
    pg: PG
    bulkRoomForm: any
    bulkBedForm: any
    handleBulkRoomSubmit: (values: any, pgId: string) => void
    handleBulkBedSubmit: (values: any, pgId: string, floorId: string) => void
}

export default function BulkAddDialog({
    isOpen,
    onOpenChange,
    type,
    pg,
    bulkRoomForm,
    bulkBedForm,
    handleBulkRoomSubmit,
    handleBulkBedSubmit
}: BulkAddDialogProps) {

    const currentFloorId = bulkRoomForm.watch('floorId')

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] p-0 flex flex-col max-h-[90dvh]">
                <DialogHeader className="p-6 pb-2 flex-shrink-0">
                    <DialogTitle>{type === 'rooms' ? 'Bulk Add Rooms' : 'Bulk Add Beds'}</DialogTitle>
                </DialogHeader>


                <div className="flex-1 overflow-y-auto px-6 py-2">
                    {type === 'rooms' ? (
                        <Form {...bulkRoomForm}>
                            <form onSubmit={bulkRoomForm.handleSubmit((values: any) => handleBulkRoomSubmit(values, pg.id))} className="space-y-4 py-2" id="bulk-room-form">
                                <FormField
                                    control={bulkRoomForm.control}
                                    name="floorId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Select Floor</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select a floor" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {pg.floors?.map(floor => (
                                                        <SelectItem key={floor.id} value={floor.id}>{floor.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={bulkRoomForm.control}
                                        name="startNumber"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Start Number</FormLabel>
                                                <FormControl>
                                                    <Input type="number" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={bulkRoomForm.control}
                                        name="endNumber"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>End Number</FormLabel>
                                                <FormControl>
                                                    <Input type="number" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={bulkRoomForm.control}
                                        name="bedsPerRoom"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Beds per Room</FormLabel>
                                                <FormControl>
                                                    <Input type="number" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={bulkRoomForm.control}
                                        name="roomPrefix"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Prefix (Optional)</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g. R-" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={bulkRoomForm.control}
                                        name="rent"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Monthly Rent (Optional)</FormLabel>
                                                <FormControl>
                                                    <Input type="number" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={bulkRoomForm.control}
                                        name="deposit"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Security Deposit (Optional)</FormLabel>
                                                <FormControl>
                                                    <Input type="number" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </form>
                        </Form>
                    ) : (
                        <Form {...bulkBedForm}>
                            <form onSubmit={bulkBedForm.handleSubmit((values: any) => {
                                const floorId = pg.floors?.find(f => f.rooms.some(r => r.id === values.roomId))?.id;
                                if (floorId) handleBulkBedSubmit(values, pg.id, floorId);
                            })} className="space-y-4 py-2" id="bulk-bed-form">
                                <FormField
                                    control={bulkBedForm.control}
                                    name="roomId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Select Room</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select a room" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {pg.floors?.flatMap(f => f.rooms).map(room => (
                                                        <SelectItem key={room.id} value={room.id}>{room.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={bulkBedForm.control}
                                    name="count"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Number of Beds to Add</FormLabel>
                                            <FormControl>
                                                <Input type="number" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={bulkBedForm.control}
                                    name="bedPrefix"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Bed Name Prefix</FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g. B" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </form>
                        </Form>
                    )}
                </div>

                <DialogFooter className="p-6 pt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2 border-t flex-shrink-0">
                    <DialogClose asChild>
                        <Button variant="secondary" className="w-full sm:w-auto">Cancel</Button>
                    </DialogClose>
                    <Button type="submit" form={type === 'rooms' ? 'bulk-room-form' : 'bulk-bed-form'} className="w-full sm:w-auto">
                        {type === 'rooms' ? 'Create Rooms' : 'Add Beds'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
