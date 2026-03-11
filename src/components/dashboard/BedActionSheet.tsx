'use client'

import Link from 'next/link'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import type { Guest } from '@/lib/types'
import { format, differenceInDays, parseISO } from 'date-fns'
import { Wallet, MessageCircle, Phone, LogOut, XCircle, Pencil, User, IndianRupee, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppSelector } from '@/lib/hooks'
import { usePermissionsStore } from '@/lib/stores/configStores'
import { canAccess } from '@/lib/permissions'

interface BedActionSheetProps {
    guest: Guest | null
    isOpen: boolean
    onClose: () => void
    handleOpenPaymentDialog: (guest: Guest) => void
    handleOpenReminderDialog: (guest: Guest) => void
    handleOpenEditGuestDialog: (guest: Guest) => void
    setGuestToInitiateExit: (guest: Guest | null) => void
    setGuestToExitImmediately: (guest: Guest | null) => void
}

const rentStatusConfig = {
    paid: { label: 'Rent Paid ✓', color: 'bg-green-500/15 text-green-700 border-green-300' },
    unpaid: { label: 'Rent Due ⚠️', color: 'bg-red-500/15 text-red-700 border-red-300' },
    partial: { label: 'Partially Paid', color: 'bg-orange-500/15 text-orange-700 border-orange-300' },
}

export default function BedActionSheet({
    guest,
    isOpen,
    onClose,
    handleOpenPaymentDialog,
    handleOpenReminderDialog,
    handleOpenEditGuestDialog,
    setGuestToInitiateExit,
    setGuestToExitImmediately,
}: BedActionSheetProps) {
    const { currentPlan, currentUser } = useAppSelector(state => state.user)
    const { featurePermissions } = usePermissionsStore()

    if (!guest) return null

    const totalDue = Number(((guest.ledger || []).reduce(
        (acc, entry) => acc + (entry.type === 'debit' ? entry.amount : -entry.amount),
        0
    )).toFixed(2))
    const status = rentStatusConfig[guest.rentStatus] ?? { label: guest.rentStatus, color: 'bg-muted text-muted-foreground border-border' }
    const canEditGuests = canAccess(featurePermissions, currentUser?.role, 'guests', 'edit')
    const canDeleteGuests = canAccess(featurePermissions, currentUser?.role, 'guests', 'delete')
    const isUnpaid = guest.rentStatus === 'unpaid' || guest.rentStatus === 'partial'
    const daysUntilExit = guest.exitDate ? differenceInDays(parseISO(guest.exitDate), new Date()) : null

    const handleAction = (fn: () => void) => {
        onClose()
        setTimeout(fn, 200) // small delay after sheet closes
    }

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent
                side="bottom"
                className="h-auto max-h-[90dvh] rounded-t-3xl p-0 pb-safe overflow-hidden"
            >
                {/* Drag handle */}
                <div className="flex justify-center pt-3 pb-1">
                    <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
                </div>

                {/* Guest header */}
                <div className={cn('mx-4 mt-2 mb-4 rounded-2xl p-4 flex items-center gap-4',
                    guest.rentStatus === 'unpaid' ? 'bg-red-500/8' :
                        guest.rentStatus === 'partial' ? 'bg-orange-500/8' : 'bg-green-500/8'
                )}>
                    <Avatar className="h-14 w-14 text-lg border-2 border-border">
                        <AvatarFallback className="text-xl font-bold">{guest.name.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                        <p className="font-bold text-lg leading-tight truncate">{guest.name}</p>
                        <p className="text-sm text-muted-foreground">{guest.phone}</p>
                        {guest.exitDate && !guest.isVacated && (
                            <p className="text-xs text-blue-600 font-medium mt-0.5">
                                🗓️ Exiting in {daysUntilExit} days
                            </p>
                        )}
                    </div>
                    <div className="shrink-0 text-right">
                        <Badge variant="outline" className={cn('text-xs font-semibold border', status.color)}>
                            {status.label}
                        </Badge>
                        {totalDue > 0 && (
                            <p className="text-base font-bold mt-1 flex items-center justify-end gap-0.5 text-red-600">
                                <IndianRupee className="w-3.5 h-3.5" />{totalDue.toLocaleString('en-IN')}
                            </p>
                        )}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="px-4 pb-6 grid grid-cols-2 gap-3">
                    {/* Collect Rent - Primary CTA */}
                    {(isUnpaid || totalDue > 0) && !guest.exitDate && (
                        <button
                            onClick={() => handleAction(() => handleOpenPaymentDialog(guest))}
                            className="col-span-2 flex items-center gap-4 p-4 rounded-2xl bg-primary text-primary-foreground font-bold text-base active:scale-95 transition-transform"
                        >
                            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                                <Wallet className="w-6 h-6" />
                            </div>
                            <div className="text-left">
                                <p className="font-bold text-base">Collect Rent</p>
                                <p className="text-sm opacity-80">₹{totalDue.toLocaleString('en-IN')} pending</p>
                            </div>
                        </button>
                    )}

                    {/* Send WhatsApp Reminder */}
                    {currentPlan?.hasAiRentReminders && (isUnpaid || totalDue > 0) && !guest.exitDate && (
                        <button
                            onClick={() => handleAction(() => handleOpenReminderDialog(guest))}
                            className="flex items-center gap-3 p-4 rounded-2xl bg-green-500 text-white font-semibold text-sm active:scale-95 transition-transform col-span-2"
                        >
                            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                                <MessageCircle className="w-5 h-5" />
                            </div>
                            <div className="text-left">
                                <p className="font-semibold">Send WhatsApp Reminder</p>
                                <p className="text-xs opacity-80">AI-generated message</p>
                            </div>
                        </button>
                    )}

                    {/* Call Guest */}
                    {guest.phone && (
                        <a
                            href={`tel:${guest.phone}`}
                            onClick={() => onClose()}
                            className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-muted hover:bg-muted/70 font-semibold text-sm active:scale-95 transition-transform"
                        >
                            <Phone className="w-7 h-7 text-blue-500" />
                            <span>Call</span>
                        </a>
                    )}

                    {/* View Profile */}
                    <Link
                        href={`/dashboard/tenant-management/${guest.id}`}
                        onClick={() => onClose()}
                        className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-muted hover:bg-muted/70 font-semibold text-sm active:scale-95 transition-transform"
                    >
                        <User className="w-7 h-7 text-primary" />
                        <span>Profile</span>
                    </Link>

                    {/* Edit Guest */}
                    {canEditGuests && (
                        <button
                            onClick={() => handleAction(() => handleOpenEditGuestDialog(guest))}
                            className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-muted hover:bg-muted/70 font-semibold text-sm active:scale-95 transition-transform"
                        >
                            <Pencil className="w-7 h-7 text-muted-foreground" />
                            <span>Edit</span>
                        </button>
                    )}

                    {/* Initiate Exit */}
                    {!guest.exitDate && canEditGuests && (
                        <button
                            onClick={() => handleAction(() => setGuestToInitiateExit(guest))}
                            className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-orange-500/10 hover:bg-orange-500/20 font-semibold text-sm active:scale-95 transition-transform text-orange-700"
                        >
                            <LogOut className="w-7 h-7" />
                            <span>Initiate Exit</span>
                        </button>
                    )}

                    {/* Exit Immediately */}
                    {guest.exitDate && canDeleteGuests && (
                        <button
                            onClick={() => handleAction(() => setGuestToExitImmediately(guest))}
                            className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-red-500/10 hover:bg-red-500/20 font-semibold text-sm active:scale-95 transition-transform text-red-700"
                        >
                            <XCircle className="w-7 h-7" />
                            <span>Exit Now</span>
                        </button>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    )
}
