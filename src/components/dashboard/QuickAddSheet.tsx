'use client'

import { useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Building, BedDouble, UserPlus, PlusCircle, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QuickAddSheetProps {
    isOpen: boolean
    onClose: () => void
    canAddFloor: boolean
    canAdd: boolean
    onAddFloor: () => void
    onAddRoom: () => void
    onBulkRooms: () => void
    onAddGuest: () => void
    floorName?: string
}

interface ActionItemProps {
    icon: React.ReactNode
    title: string
    description: string
    onClick: () => void
    disabled?: boolean
    color: string
    iconBg: string
}

function ActionItem({ icon, title, description, onClick, disabled, color, iconBg }: ActionItemProps) {
    return (
        <button
            onClick={disabled ? undefined : onClick}
            disabled={disabled}
            className={cn(
                'w-full flex items-center gap-4 p-4 rounded-2xl text-left active:scale-[0.98] transition-all',
                disabled
                    ? 'opacity-40 cursor-not-allowed bg-muted/30'
                    : `${color} active:brightness-95`
            )}
        >
            <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm', iconBg)}>
                {icon}
            </div>
            <div>
                <p className="font-bold text-base">{title}</p>
                <p className="text-sm text-muted-foreground">{description}</p>
            </div>
        </button>
    )
}

export default function QuickAddSheet({
    isOpen,
    onClose,
    canAddFloor,
    canAdd,
    onAddFloor,
    onAddRoom,
    onBulkRooms,
    onAddGuest,
    floorName,
}: QuickAddSheetProps) {
    const handleAction = (fn: () => void) => {
        onClose()
        setTimeout(fn, 200)
    }

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent
                side="bottom"
                className="h-auto max-h-[85dvh] rounded-t-3xl p-0 overflow-hidden"
            >
                {/* Drag handle */}
                <div className="flex justify-center pt-3 pb-1">
                    <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
                </div>

                <SheetHeader className="px-5 pt-2 pb-4">
                    <SheetTitle className="text-xl">What do you want to add?</SheetTitle>
                    <p className="text-sm text-muted-foreground">Tap an option below to get started</p>
                </SheetHeader>

                <div className="px-4 pb-8 space-y-3">
                    {/* Add Guest */}
                    <ActionItem
                        icon={<UserPlus className="w-7 h-7 text-primary" />}
                        title="Add a New Guest"
                        description="Assign a tenant to an available bed"
                        color="bg-primary/8 hover:bg-primary/12"
                        iconBg="bg-primary/15 text-primary"
                        onClick={() => handleAction(onAddGuest)}
                    />

                    {/* Add Room */}
                    {canAdd && (
                        <ActionItem
                            icon={<BedDouble className="w-7 h-7 text-blue-600" />}
                            title={`Add a Room${floorName ? ` on ${floorName}` : ''}`}
                            description="Add one room with beds to this floor"
                            color="bg-blue-500/8 hover:bg-blue-500/12"
                            iconBg="bg-blue-500/15 text-blue-600"
                            onClick={() => handleAction(onAddRoom)}
                        />
                    )}

                    {/* Bulk Add Rooms */}
                    {canAdd && (
                        <ActionItem
                            icon={<Layers className="w-7 h-7 text-violet-600" />}
                            title="Bulk Add Rooms"
                            description="Add multiple rooms at once to save time"
                            color="bg-violet-500/8 hover:bg-violet-500/12"
                            iconBg="bg-violet-500/15 text-violet-600"
                            onClick={() => handleAction(onBulkRooms)}
                        />
                    )}

                    {/* Add Floor */}
                    {canAdd && (
                        <ActionItem
                            icon={<Building className="w-7 h-7 text-amber-600" />}
                            title="Add a New Floor"
                            description={canAddFloor ? 'Add another floor to this property' : 'Floor limit reached — upgrade your plan'}
                            color="bg-amber-500/8 hover:bg-amber-500/12"
                            iconBg="bg-amber-500/15 text-amber-600"
                            onClick={() => handleAction(onAddFloor)}
                            disabled={!canAddFloor}
                        />
                    )}
                </div>
            </SheetContent>
        </Sheet>
    )
}
