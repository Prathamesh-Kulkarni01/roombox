
import { Button } from "@/components/ui/button"
import { Popover, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import GuestPopoverContent from "./GuestPopoverContent"
import type { Room, Bed, PG, Floor, Guest, Complaint } from "@/lib/types"
import { BedDouble, DoorOpen, UserPlus, Pencil, Trash2, PlusCircle, MessageCircle, ShieldAlert, Clock, IndianRupee, Plus, CheckCircle } from "lucide-react"
import type { UseDashboardReturn } from "@/hooks/use-dashboard"
import { useAppSelector } from "@/lib/hooks"
import { MutableRefObject } from "react"
import { useRouter } from "next/navigation"
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { canAccess } from '@/lib/permissions';

interface BedCardProps extends Omit<UseDashboardReturn, 'stats'> {
  room: Room
  floor: Floor
  pg: PG
  isFirstAvailableBedFound: MutableRefObject<boolean>
}

export default function BedCard(props: BedCardProps) {
  const { room, floor, pg, isEditMode, setItemToDelete, handleOpenBedDialog, handleOpenRoomDialog, handleOpenSharedChargeDialog, isFirstAvailableBedFound } = props
  const router = useRouter()
  const { guests, complaints } = useAppSelector(state => ({
    guests: state.guests.guests,
    complaints: state.complaints.complaints,
  }))
  const { currentUser } = useAppSelector(state => state.user);
  const { featurePermissions } = useAppSelector(state => state.permissions);

  const getBedStatus = (bed: Bed): 'available' | 'occupied' | 'rent-pending' | 'rent-partial' | 'notice-period' => {
    const guest = guests.find(g => g.id === bed.guestId)
    if (!guest || guest.isVacated) return 'available'
    if (guest.exitDate) return 'notice-period'
    if (guest.rentStatus === 'unpaid') return 'rent-pending'
    if (guest.rentStatus === 'partial') return 'rent-partial'
    return 'occupied'
  }

  const occupiedBedsCount = room.beds.filter(bed => guests.some(g => g.id === bed.guestId && !g.isVacated)).length;

  const bedStatusClasses: Record<ReturnType<typeof getBedStatus>, string> = {
    available: 'bg-yellow-100 border-yellow-300 text-yellow-900',
    occupied: 'bg-slate-200 border-slate-400 text-slate-800',
    'rent-pending': 'bg-red-100 border-red-300 text-red-900',
    'rent-partial': 'bg-orange-100 border-orange-300 text-orange-900',
    'notice-period': 'bg-blue-100 border-blue-300 text-blue-800',
  }

  return (
    <>
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-lg flex items-center gap-2"><DoorOpen className="w-5 h-5" />{room.name} <span className="font-normal text-muted-foreground">({room.beds.length}-sharing)</span></h3>
        <div className="flex items-center">
            {!isEditMode && occupiedBedsCount > 0 && (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                             <Button variant="outline" size="sm" className="h-7 gap-1" onClick={() => handleOpenSharedChargeDialog(room)}>
                                <IndianRupee className="w-4 h-4"/>
                                <Plus className="w-4 h-4"/>
                                <span className="sr-only">Add Shared Charge</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Add Shared Charge (e.g., electricity bill)</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}
            {isEditMode && (
                <>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenRoomDialog(room)}> <Pencil className="w-4 h-4" /> </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-500/10 hover:text-red-600" onClick={() => setItemToDelete({ type: 'room', ids: { pgId: pg.id, floorId: floor.id, roomId: room.id } })}> <Trash2 className="w-4 h-4" /> </Button>
                </>
            )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
        {room.beds.map(bed => {
          const guest = guests.find(g => g.id === bed.guestId && !g.isVacated);
          const status = getBedStatus(bed);
          const hasComplaint = guest && complaints.some(c => c.guestId === guest.id && c.status !== 'resolved');
          const isFirstAvailable = !guest && !isFirstAvailableBedFound.current;
          if (isFirstAvailable) isFirstAvailableBedFound.current = true;

          if (isEditMode) {
            return (
              <div key={bed.id} className="border-2 rounded-lg aspect-square flex flex-col items-center justify-center p-2 text-left bg-muted/50 relative">
                <BedDouble className="w-8 h-8 mb-1" />
                <span className="font-bold text-sm">Bed {bed.name}</span>
                {bed.guestId && <Badge variant="outline" className="mt-1">Occupied</Badge>}
                <div className="absolute top-1.5 right-1.5 flex flex-col gap-1.5"><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleOpenBedDialog(bed, room.id, floor.id)}> <Pencil className="w-3 h-3" /> </Button><Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:bg-red-500/10 hover:text-red-600" onClick={() => setItemToDelete({ type: 'bed', ids: { pgId: pg.id, floorId: floor.id, roomId: room.id, bedId: bed.id } })}> <Trash2 className="w-3 h-3" /> </Button></div>
              </div>
            );
          }

          if (!guest) {
            const canAddGuest = canAccess(featurePermissions, currentUser?.role, 'guests', 'add');
            return (
              <button
                key={bed.id}
                onClick={() => canAddGuest && props.handleOpenAddGuestDialog(bed, room, pg)}
                data-tour={isFirstAvailable ? 'add-guest-on-bed' : undefined}
                className={`group relative border-2 rounded-lg aspect-square flex flex-col items-center justify-center p-2 transition-colors text-left ${bedStatusClasses[status]} ${!canAddGuest ? 'opacity-70 cursor-not-allowed' : 'hover:border-yellow-500 hover:bg-yellow-200'}`}
                disabled={!canAddGuest}
              >
                <div className="flex-1 flex flex-col items-center justify-center gap-1">
                    <BedDouble className="w-8 h-8" />
                    <span className="font-bold text-sm">Bed {bed.name}</span>
                </div>
                <div className="w-full text-center">
                    <div className="font-semibold text-xs bg-black/10 group-hover:bg-yellow-500 group-hover:text-white rounded-md px-2 py-1 flex items-center justify-center gap-1">
                        <UserPlus className="w-3 h-3" />
                        Add Guest
                    </div>
                </div>
              </button>
            );
          }

          return (
            <Popover key={bed.id}>
              <PopoverTrigger asChild>
                <button className={`group relative border-2 rounded-lg aspect-square flex flex-col items-center justify-center p-2 transition-colors text-left w-full ${bedStatusClasses[status]} hover:brightness-105`}>
                  <div className="absolute top-1.5 right-1.5 flex flex-col gap-1.5">
                    {hasComplaint && <ShieldAlert className="h-4 w-4 text-red-600" />}
                    {guest?.hasMessage && <MessageCircle className="h-4 w-4 text-blue-600" />}
                    {status === 'notice-period' && <Clock className="h-4 w-4 text-blue-600" />}
                  </div>
                  <div className="flex-1 flex flex-col items-center justify-center gap-1">
                      <BedDouble className="w-8 h-8" />
                      <p className="text-xs w-full truncate font-semibold">{guest.name}</p>
                  </div>
                  <div className="w-full text-center mt-auto">
                    {status === 'rent-pending' && <div className="font-semibold text-xs bg-red-500 text-white rounded-md px-2 py-1">Collect Rent</div>}
                    {status === 'rent-partial' && <div className="font-semibold text-xs bg-orange-500 text-white rounded-md px-2 py-1">Collect Balance</div>}
                    {status === 'occupied' && <div className="font-semibold text-xs bg-green-500 text-white rounded-md px-2 py-1 flex items-center justify-center gap-1"><CheckCircle className="w-3 h-3"/> Rent Paid</div>}
                    {status === 'notice-period' && <div className="font-semibold text-xs bg-blue-500 text-white rounded-md px-2 py-1">Notice Period</div>}
                  </div>
                </button>
              </PopoverTrigger>
              <GuestPopoverContent guest={guest} {...props} />
            </Popover>
          );
        })}
        {isEditMode && (<button data-tour="add-bed-button" onClick={() => handleOpenBedDialog(null, room.id, floor.id)} className="min-h-[110px] w-full flex flex-col items-center justify-center p-2 border-2 border-dashed rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"><PlusCircle className="w-6 h-6 mb-1" /><span className="text-sm font-medium text-center">Add Bed</span></button>)}
      </div>
    </>
  )
}
