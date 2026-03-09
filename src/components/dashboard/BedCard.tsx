'use client'

import { Button } from "@/components/ui/button"
import { Popover, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import GuestPopoverContent from "./GuestPopoverContent"
import type { Room, Bed, PG, Guest, BedStatus } from "@/lib/types"
import { BedDouble, UserPlus, Pencil, Trash2, CheckCircle, User as UserIcon } from "lucide-react"
import { useAppSelector } from "@/lib/hooks"
import { usePermissionsStore } from '@/lib/stores/configStores'
import { canAccess } from '@/lib/permissions';
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"

interface BedCardProps {
  bed: Bed
  room: Room
  pg: PG
  onAddGuest: (bed: Bed, room: Room, pg: PG) => void
  onGuestClick: (guest: Guest) => void
  onEdit: () => void
  isEditing?: boolean
  isLoadingGuest?: boolean
}

export function BedCard({
  bed,
  room,
  pg,
  onAddGuest,
  onGuestClick,
  onEdit,
  isEditing = false,
  isLoadingGuest = false
}: BedCardProps) {
  const { guests } = useAppSelector(state => state.guests)
  const { currentUser } = useAppSelector(state => state.user)
  const { featurePermissions } = usePermissionsStore()

  const guest = guests.find(g => g.id === bed.guestId)
  const canEdit = canAccess(featurePermissions, currentUser?.role, 'properties', 'edit')

  const getBedStatus = (bed: Bed): BedStatus => {
    if (bed.guestId) return 'occupied'
    return 'available'
  }

  const status = getBedStatus(bed)

  if (isLoadingGuest) {
    return (
      <Card className="p-4 flex flex-col items-center justify-center space-y-3 min-h-[140px] animate-pulse">
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-16" />
      </Card>
    )
  }

  return (
    <Card
      className={cn(
        "group relative border rounded-lg aspect-square flex flex-col items-center justify-center p-2 transition-colors text-left w-full",
        status === 'occupied' ? "bg-primary/5 border-primary/20" : "bg-muted/30 border-dashed hover:bg-muted/50 cursor-pointer"
      )}
      onClick={() => {
        if (isEditing) onEdit()
        else if (status === 'occupied' && guest) onGuestClick(guest)
        else if (status === 'available') onAddGuest(bed, room, pg)
      }}
    >
      {isEditing && (
        <div className="absolute top-1 right-1 flex gap-1 z-10">
          <Button size="icon" variant="ghost" className="h-6 w-6 rounded-full bg-background/80 shadow-sm" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
            <Pencil className="h-3 w-3" />
          </Button>
        </div>
      )}

      <div className={cn(
        "w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-transform group-hover:scale-110",
        status === 'occupied' ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground"
      )}>
        {status === 'occupied' ? (
          <Avatar className="h-10 w-10 border-2 border-primary">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
              {guest?.name?.charAt(0).toUpperCase() || <UserIcon className="h-5 w-5" />}
            </AvatarFallback>
          </Avatar>
        ) : (
          <BedDouble className="h-5 w-5" />
        )}
      </div>

      <div className="text-center w-full px-1">
        <p className={cn(
          "text-xs font-bold truncate",
          status === 'occupied' ? "text-foreground" : "text-muted-foreground"
        )}>
          {status === 'occupied' ? guest?.name : `Bed ${bed.name}`}
        </p>

        {status === 'occupied' ? (
          <div className="flex items-center justify-center mt-0.5 gap-1">
            <CheckCircle className="h-2.5 w-2.5 text-green-500" />
            <span className="text-[10px] text-muted-foreground font-medium">Occupied</span>
          </div>
        ) : (
          <div className="flex items-center justify-center mt-0.5 gap-1 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
            <UserPlus className="h-2.5 w-2.5" />
            <span className="text-[10px] font-bold">Add Guest</span>
          </div>
        )}
      </div>

      {status === 'occupied' && guest?.exitDate && (
        <Badge variant="destructive" className="absolute -top-1 -right-1 px-1.5 py-0 text-[8px] h-4 rounded-full uppercase tracking-tighter shadow-sm animate-pulse">
          Exiting
        </Badge>
      )}
    </Card>
  )
}
