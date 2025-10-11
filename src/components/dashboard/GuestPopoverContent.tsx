

import Link from "next/link"
import { PopoverContent } from "@/components/ui/popover"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Guest } from "@/lib/types"
import { format, differenceInDays, parseISO } from "date-fns"
import { Wallet, MessageCircle, Phone, LogOut, ArrowRight, XCircle, Pencil, User, IndianRupee } from "lucide-react"
import { cn } from "@/lib/utils"
import type { UseDashboardReturn } from "@/hooks/use-dashboard"
import { useAppSelector } from "@/lib/hooks"
import { canAccess } from '@/lib/permissions';

interface GuestPopoverContentProps extends Omit<UseDashboardReturn, 'stats'> {
  guest: Guest
}

const rentStatusColors: Record<Guest['rentStatus'], string> = {
  paid: 'bg-green-100 text-green-800 border-green-300',
  unpaid: 'bg-red-100 text-red-800 border-red-300',
  partial: 'bg-orange-100 text-orange-800 border-orange-300',
}

export default function GuestPopoverContent({ guest, handleOpenPaymentDialog, handleOpenReminderDialog, handleOpenEditGuestDialog, setGuestToInitiateExit, setGuestToExitImmediately }: GuestPopoverContentProps) {
  const { currentPlan } = useAppSelector(state => state.user)
  const { currentUser } = useAppSelector(state => state.user);
  const { featurePermissions } = useAppSelector(state => state.permissions);

  const totalDue = (guest.ledger || []).reduce((acc, entry) => acc + (entry.type === 'debit' ? entry.amount : -entry.amount), 0);


  return (
    <PopoverContent className="w-64 p-0">
      <div className="p-4 space-y-2">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={`https://placehold.co/40x40.png?text=${guest.name.charAt(0)}`} />
            <AvatarFallback>{guest.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold">{guest.name}</p>
            <p className="text-xs text-muted-foreground">{guest.phone}</p>
          </div>
        </div>
        <div className="text-sm space-y-1">
          <div className="flex justify-between">
            <span>Rent Status:</span>
            <Badge variant="outline" className={cn("capitalize", rentStatusColors[guest.rentStatus])}>{guest.rentStatus}</Badge>
          </div>
           <div className="flex justify-between items-center">
            <span>Total Due:</span>
            <span className="font-bold text-base flex items-center"><IndianRupee className="w-3.5 h-3.5"/>{totalDue.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between">
            <span>Due Date:</span>
            <span className="font-medium">{format(new Date(guest.dueDate), "do MMM")}</span>
          </div>
           {guest.exitDate && !guest.isVacated && (
                <div className="flex justify-between text-blue-600">
                    <span>Exiting In:</span>
                    <span className="font-medium">{differenceInDays(parseISO(guest.exitDate), new Date())} days</span>
                </div>
            )}
        </div>
      </div>
      <div className="flex flex-col gap-1 p-2 bg-muted/50">
        {(guest.rentStatus === 'unpaid' || guest.rentStatus === 'partial' || totalDue > 0) && !guest.exitDate && (
          <Button variant="ghost" size="sm" className="justify-start" onClick={() => handleOpenPaymentDialog(guest)}>
            <Wallet className="mr-2 h-4 w-4" /> Collect Rent
          </Button>
        )}
        {currentPlan?.hasAiRentReminders && (guest.rentStatus === 'unpaid' || guest.rentStatus === 'partial' || totalDue > 0) && !guest.exitDate && (
          <Button variant="ghost" size="sm" className="justify-start" onClick={() => handleOpenReminderDialog(guest)}>
            <MessageCircle className="mr-2 h-4 w-4" /> Send Reminder
          </Button>
        )}
        {guest.phone && (
          <Button variant="ghost" size="sm" className="justify-start w-full" asChild>
            <a href={`tel:${guest.phone}`}>
              <Phone className="mr-2 h-4 w-4" /> Call Guest
            </a>
          </Button>
        )}
        {!guest.exitDate && canAccess(featurePermissions, currentUser?.role, 'guests', 'edit') ? (
          <Button variant="ghost" size="sm" className="justify-start" onClick={() => setGuestToInitiateExit(guest)}>
            <LogOut className="mr-2 h-4 w-4" /> Initiate Exit
          </Button>
        ) : null}
        {guest.exitDate && canAccess(featurePermissions, currentUser?.role, 'guests', 'delete') && (
           <Button variant="ghost" size="sm" className="justify-start text-destructive hover:text-destructive" onClick={() => setGuestToExitImmediately(guest)}>
            <XCircle className="mr-2 h-4 w-4" /> Exit Immediately
          </Button>
        )}
        {canAccess(featurePermissions, currentUser?.role, 'guests', 'edit') && (
          <Button variant="ghost" size="sm" className="justify-start" onClick={() => handleOpenEditGuestDialog(guest)}>
            <Pencil className="mr-2 h-4 w-4" /> Edit Guest
          </Button>
        )}
        <Button variant="ghost" size="sm" className="justify-start" asChild>
          <Link href={`/dashboard/tenant-management/${guest.id}`}>
            <ArrowRight className="mr-2 h-4 w-4" /> Show Profile
          </Link>
        </Button>
      </div>
    </PopoverContent>
  )
}
