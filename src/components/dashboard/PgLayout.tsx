
'use client'

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Button } from "../ui/button"
import { Layers, PlusCircle, Trash2, Pencil } from "lucide-react"
import type { PG, Floor, Room } from "@/lib/types"
import BedCard from "./BedCard"
import type { UseDashboardReturn } from "@/hooks/use-dashboard"
import { MutableRefObject, useMemo } from "react"
import { useAppSelector } from "@/lib/hooks"
import Access from "../ui/PermissionWrapper";

const RoomSummaryCard = ({ room }: { room: Room }) => {
    const { guests } = useAppSelector(state => state.guests);

    const summary = useMemo(() => {
        const beds = room.beds || [];
        const totalBeds = beds.length;
        const occupiedBeds = beds.filter(b => guests.some(g => g.id === b.guestId && !g.isVacated)).length;
        const rentPending = beds.filter(b => {
            const guest = guests.find(g => g.id === b.guestId && !g.isVacated);
            return guest && (guest.rentStatus === 'unpaid' || guest.rentStatus === 'partial');
        }).length;
        return { totalBeds, availableBeds: totalBeds - occupiedBeds, rentPending };
    }, [room, guests]);

    return (
        <div className="text-center">
            <p className="text-2xl font-bold">{room.name}</p>
            <p className="text-sm text-muted-foreground">{summary.totalBeds}-Sharing</p>
        </div>
    );
};


interface PgLayoutProps extends Omit<UseDashboardReturn, 'stats'> {
  pg: PG
  isFirstAvailableBedFound: MutableRefObject<boolean>
  isEditMode: boolean;
}

export default function PgLayout(props: PgLayoutProps) {
  const { pg, isEditMode, openAddFloorDialog, setItemToDelete, handleOpenFloorDialog, handleOpenRoomDialog } = props

  return (
    <Accordion 
      type="multiple" 
      className="w-full space-y-4" 
      defaultValue={pg.floors?.map(f => f.id)}
    >
      {pg.floors?.map(floor => (
        <AccordionItem value={floor.id} key={floor.id} className="border-b-0 bg-card rounded-lg overflow-hidden">
          <div className="flex items-center p-4 border-b">
             <AccordionTrigger className="text-lg font-medium hover:no-underline flex-1 py-0">
                <div className="flex items-center gap-4 w-full">
                  <Layers /> {floor.name}
                </div>
            </AccordionTrigger>
            {isEditMode && (
              <div className="flex items-center ml-auto pl-4">
                 <Access feature="properties" action="edit">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenFloorDialog(floor)}><Pencil className="w-4 h-4" /></Button>
                </Access>
                 <Access feature="properties" action="delete">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={() => setItemToDelete({ type: 'floor', ids: { pgId: pg.id, floorId: floor.id } })}><Trash2 className="w-4 h-4" /></Button>
                </Access>
              </div>
            )}
          </div>
          <AccordionContent className="pt-4 px-4">
            <div className="space-y-4">
              {floor.rooms.map(room => (
                 <Accordion key={room.id} type="single" collapsible className="w-full border rounded-lg">
                    <AccordionItem value={room.id} className="border-b-0">
                         <div className="p-4">
                            <div className="flex justify-between items-center w-full">
                                <RoomSummaryCard room={room} />
                                <div className="flex items-center gap-4 text-sm font-normal pr-2">
                                  {/* Placeholder for stats */}
                                </div>
                            </div>
                            <AccordionTrigger className="text-sm font-medium hover:no-underline w-full py-1 justify-center text-primary mt-2">
                                View Beds
                            </AccordionTrigger>
                         </div>
                        <AccordionContent className="p-4 pt-0 border-t">
                            <BedCard {...props} room={room} floor={floor} />
                        </AccordionContent>
                    </AccordionItem>
                 </Accordion>
              ))}
              {isEditMode && (
                  <Access feature="properties" action="add">
                    <button data-tour="add-room-button" onClick={() => handleOpenRoomDialog(null, floor.id, pg.id)} className="min-h-[100px] h-full w-full flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"><PlusCircle className="w-8 h-8 mb-2" /><span className="font-medium">Add New Room</span></button>
                  </Access>
              )}
               {floor.rooms.length === 0 && !isEditMode && (
                <div className="text-center py-8 text-muted-foreground">No rooms in this floor yet. Enable Edit Mode to add one.</div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
       {isEditMode && (
          <Access feature="properties" action="add">
            <button data-tour="add-floor-button" onClick={() => openAddFloorDialog(pg)} className="mt-6 w-full flex items-center justify-center p-4 border-2 border-dashed rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"><PlusCircle className="mr-2 h-5 w-5" /><span className="font-medium">Add New Floor</span></button>
          </Access>
        )}
        {(!pg.floors || pg.floors.length === 0) && (<div className="text-center text-muted-foreground p-8">This property has no floors configured. Enable 'Edit Mode' to build the layout.</div>)}
    </Accordion>
  )
}
