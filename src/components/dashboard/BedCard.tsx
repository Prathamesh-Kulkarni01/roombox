
import { Button } from "@/components/ui/button"
import { Popover, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import GuestPopoverContent from "./GuestPopoverContent"
import type { Room, Bed, PG, Floor, Guest, Complaint } from "@/lib/types"
import { BedDouble, DoorOpen, UserPlus, Pencil, Trash2, PlusCircle, MessageCircle, ShieldAlert, Clock } from "lucide-react"
import type { UseDashboardReturn } from "@/hooks/use-dashboard"
import { useAppSelector } from "@/lib/hooks"
import { MutableRefObject } from "react"

interface BedCardProps extends Omit<UseDashboardReturn, 'stats'> {
  room: Room
  floor: Floor
  pg: PG
  isFirstAvailableBedFound: MutableRefObject<boolean>
}

export default function BedCard(props: BedCardProps) {
  const { room, floor, pg, isEditMode, openEditRoomDialog, handleDelete, openAddBedDialog, openEditBedDialog, isFirstAvailableBedFound } = props
  const { guests, complaints } = useAppSelector(state => ({
    guests: state.guests.guests,
    complaints: state.complaints.complaints,
  }))

  const getBedStatus = (bed: Bed): 'available' | 'occupied' | 'rent-pending' | 'rent-partial' | 'notice-period' => {
    const guest = guests.find(g => g.id === bed.guestId)
    if (!guest) return 'available'
    if (guest.exitDate) return 'notice-period'
    if (guest.rentStatus === 'unpaid') return 'rent-pending'
    if (guest.rentStatus === 'partial') return 'rent-partial'
    return 'occupied'
  }

  const bedStatusClasses: Record<ReturnType<typeof getBedStatus>, string> = {
    available: 'bg-yellow-200 border-yellow-400 text-yellow-800 hover:bg-yellow-300',
    occupied: 'bg-slate-200 border-slate-400 text-slate-800 hover:bg-slate-300',
    'rent-pending': 'bg-red-300 border-red-500 text-red-900 hover:bg-red-400',
    'rent-partial': 'bg-orange-200 border-orange-400 text-orange-800 hover:bg-orange-300',
    'notice-period': 'bg-blue-200 border-blue-400 text-blue-800 hover:bg-blue-300',
  }

  return (
    <>
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-lg flex items-center gap-2"><DoorOpen className="w-5 h-5" />{room.name} <span className="font-normal text-muted-foreground">({room.beds.length}-sharing)</span></h3>
        {isEditMode && (<div className="flex items-center"><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditRoomDialog(room, floor.id)}> <Pencil className="w-4 h-4" /> </Button><Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-500/10 hover:text-red-600" onClick={() => handleDelete('room', { floorId: floor.id, roomId: room.id })}> <Trash2 className="w-4 h-4" /> </Button></div>)}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
        {room.beds.map(bed => {
          const guest = guests.find(g => g.id === bed.guestId);
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
                <div className="absolute top-1.5 right-1.5 flex flex-col gap-1.5"><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditBedDialog(bed, room.id, floor.id)}> <Pencil className="w-3 h-3" /> </Button><Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:bg-red-500/10 hover:text-red-600" onClick={() => handleDelete('bed', { floorId: floor.id, roomId: room.id, bedId: bed.id })}> <Trash2 className="w-3 h-3" /> </Button></div>
              </div>
            );
          }

          if (!guest) {
            return (<button key={bed.id} onClick={() => props.handleOpenAddGuestDialog(bed, room, pg)} data-tour={isFirstAvailable ? 'add-guest-on-bed' : undefined} className={`relative border-2 rounded-lg aspect-square flex flex-col items-center justify-center p-2 transition-colors text-left ${bedStatusClasses[status]}`}><BedDouble className="w-8 h-8 mb-1" /><span className="font-bold text-sm">Bed {bed.name}</span><div className="absolute bottom-1 right-1 flex items-center justify-center h-6 w-6 rounded-full bg-black/10"><UserPlus className="h-4 w-4" /></div><span className="absolute top-1.5 left-1.5 text-xs font-semibold">Available</span></button>);
          }

          return (
            <Popover key={bed.id}>
              <PopoverTrigger asChild>
                <button className={`relative border-2 rounded-lg aspect-square flex flex-col items-center justify-center p-2.5 text-center gap-1 transition-colors w-full ${bedStatusClasses[status]}`}>
                  <BedDouble className="w-8 h-8 mb-1" />
                  <span className="font-bold text-sm">Bed {bed.name}</span>
                  <p className="text-xs w-full truncate">{guest.name}</p>
                  <div className="absolute top-1.5 right-1.5 flex flex-col gap-1.5">
                    {hasComplaint && <ShieldAlert className="h-4 w-4 text-red-600" />}
                    {guest?.hasMessage && <MessageCircle className="h-4 w-4 text-blue-600" />}
                    {status === 'notice-period' && <Clock className="h-4 w-4 text-blue-600" />}
                  </div>
                </button>
              </PopoverTrigger>
              <GuestPopoverContent guest={guest} {...props} />
            </Popover>
          );
        })}
        {isEditMode && (<button data-tour="add-bed-button" onClick={() => openAddBedDialog(floor.id, room.id)} className="min-h-[110px] w-full flex flex-col items-center justify-center p-2 border-2 border-dashed rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"><PlusCircle className="w-6 h-6 mb-1" /><span className="text-sm font-medium text-center">Add Bed</span></button>)}
      </div>
    </>
  )
}
