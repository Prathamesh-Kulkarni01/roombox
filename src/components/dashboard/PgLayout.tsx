
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Button } from "../ui/button"
import { Layers, PlusCircle, Trash2, Pencil, DoorOpen } from "lucide-react"
import type { PG, Floor, Room } from "@/lib/types"
import BedCard from "./BedCard"
import type { UseDashboardReturn } from "@/hooks/use-dashboard"
import { MutableRefObject, useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import Access from "../ui/PermissionWrapper";
import { useAppSelector } from "@/lib/hooks"
import { cn } from "@/lib/utils"

interface PgLayoutProps extends Omit<UseDashboardReturn, 'stats'> {
  pg: PG
  isFirstAvailableBedFound: MutableRefObject<boolean>
  isEditMode: boolean;
}

const RoomAccordionTrigger = ({ floor, room }: { floor: Floor, room: Room }) => {
    const { guests } = useAppSelector(state => state.guests);
    
    const roomSummary = useMemo(() => {
        const beds = room.beds;
        const totalBeds = beds.length;
        const occupiedBeds = beds.filter(b => b.guestId && guests.find(g => g.id === b.guestId && !g.isVacated)).length;
        const availableBeds = totalBeds - occupiedBeds;
        const rentPending = beds.filter(b => b.guestId && guests.find(g => g.id === b.guestId && !g.isVacated && g.rentStatus !== 'paid')).length;
        return { totalBeds, availableBeds, rentPending };
    }, [room, guests]);

    return (
       <div className="flex flex-col w-full space-y-2">
            <div className="flex justify-between items-center w-full">
                <div className="flex flex-col text-left">
                    <span className="font-semibold text-lg">{room.name}</span>
                    <span className="text-sm text-muted-foreground">{room.beds.length}-Sharing</span>
                </div>
                <div className="flex items-center gap-4 text-sm font-normal pr-2">
                    <div className="text-center">
                        <p className="font-bold text-lg text-green-600">{roomSummary.availableBeds}</p>
                        <p className="text-xs text-muted-foreground">Available</p>
                    </div>
                    <div className="text-center">
                         <p className="font-bold text-lg text-red-600">{roomSummary.rentPending}</p>
                        <p className="text-xs text-muted-foreground">Rent Due</p>
                    </div>
                </div>
            </div>
            <AccordionTrigger className="text-sm font-medium hover:no-underline w-full py-1 justify-center text-primary">
                View Beds
            </AccordionTrigger>
       </div>
    );
};

export default function PgLayout(props: PgLayoutProps) {
  const { pg, isEditMode, openAddFloorDialog, setItemToDelete, handleOpenFloorDialog } = props
  const [openFloorItems, setOpenFloorItems] = useState<string[]>(pg.floors?.map(f => f.id) || []);
  const [openRoomItems, setOpenRoomItems] = useState<string[]>(pg.floors?.flatMap(f => f.rooms.map(r => r.id)) || []);

  return (
    <Card>
      <CardHeader className="py-4">
        <CardTitle className="text-xl">{pg.name} - {isEditMode ? 'Layout Editor' : 'Occupancy View'}</CardTitle>
        <CardDescription>{isEditMode ? "Add, edit, or remove floors, rooms, and beds." : "Visualize bed occupancy and manage guests."}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Accordion 
          type="multiple" 
          className="w-full space-y-4" 
          value={openFloorItems}
          onValueChange={setOpenFloorItems}
        >
          {pg.floors?.map(floor => (
            <AccordionItem value={floor.id} key={floor.id} className="border-b-0">
              <div className="flex items-center border rounded-lg p-4">
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
              <AccordionContent className="pt-4 pl-4">
                <Accordion type="multiple" className="w-full space-y-4" value={openRoomItems} onValueChange={setOpenRoomItems}>
                  <div className="space-y-4">
                    {floor.rooms.map(room => (
                      <Card key={room.id} className="overflow-hidden">
                        <CardContent className="p-4">
                            <AccordionItem value={room.id} key={room.id} className="border-b-0">
                                <RoomAccordionTrigger floor={floor} room={room} />
                                <AccordionContent className="pt-4">
                                    <BedCard {...props} room={room} floor={floor} />
                                </AccordionContent>
                            </AccordionItem>
                        </CardContent>
                      </Card>
                    ))}
                    {isEditMode && (
                      <Access feature="properties" action="add">
                        <button data-tour="add-room-button" onClick={() => props.handleOpenRoomDialog(null, floor.id, pg.id)} className="min-h-[100px] h-full w-full flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"><PlusCircle className="w-8 h-8 mb-2" /><span className="font-medium">Add New Room</span></button>
                      </Access>
                    )}
                  </div>
                </Accordion>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        {isEditMode && (
          <Access feature="properties" action="add">
            <button data-tour="add-floor-button" onClick={() => openAddFloorDialog(pg)} className="mt-6 w-full flex items-center justify-center p-4 border-2 border-dashed rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"><PlusCircle className="mr-2 h-5 w-5" /><span className="font-medium">Add New Floor</span></button>
          </Access>
        )}
        {(!pg.floors || pg.floors.length === 0) && (<div className="text-center text-muted-foreground p-8">This property has no floors configured. Enable 'Edit Mode' to build the layout.</div>)}
      </CardContent>
    </Card>
  )
}
