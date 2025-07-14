
import Link from "next/link"
import { PopoverContent } from "@/components/ui/popover"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Guest } from "@/lib/types"
import { format } from "date-fns"
import { Wallet, MessageCircle, Phone, LogOut, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import type { UseDashboardReturn } from "@/hooks/use-dashboard"
import { useAppSelector } from "@/lib/hooks"

interface GuestPopoverContentProps extends Omit<UseDashboardReturn, 'stats'> {
  guest: Guest
}

const rentStatusColors: Record<Guest['rentStatus'], string> = {
  paid: 'bg-green-100 text-green-800 border-green-300',
  unpaid: 'bg-red-100 text-red-800 border-red-300',
  partial: 'bg-orange-100 text-orange-800 border-orange-300',
}

export default function GuestPopoverContent({ guest, handleOpenPaymentDialog, handleOpenReminderDialog, setGuestToInitiateExit }: GuestPopoverContentProps) {
  const { currentPlan } = useAppSelector(state => state.user)

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
          <div className="flex justify-between">
            <span>Due Date:</span>
            <span className="font-medium">{format(new Date(guest.dueDate), "do MMM")}</span>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-1 p-2 bg-muted/50">
        {(guest.rentStatus === 'unpaid' || guest.rentStatus === 'partial') && !guest.exitDate && (
          <Button variant="ghost" size="sm" className="justify-start" onClick={() => handleOpenPaymentDialog(guest)}>
            <Wallet className="mr-2 h-4 w-4" /> Collect Rent
          </Button>
        )}
        {currentPlan?.hasAiRentReminders && (guest.rentStatus === 'unpaid' || guest.rentStatus === 'partial') && !guest.exitDate && (
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
        {!guest.exitDate && (
          <Button variant="ghost" size="sm" className="justify-start" onClick={() => setGuestToInitiateExit(guest)}>
            <LogOut className="mr-2 h-4 w-4" /> Initiate Exit
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
