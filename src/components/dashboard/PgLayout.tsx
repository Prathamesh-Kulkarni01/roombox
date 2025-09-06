
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
  viewMode: 'bed' | 'room' | 'floor' | 'property';
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
        <AccordionTrigger className="text-lg font-medium hover:no-underline w-full">
            <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-4">
                    <DoorOpen className="w-5 h-5" /> 
                    <div className="text-left">
                        <p>{room.name}</p>
                        <p className="text-sm font-normal text-muted-foreground">{room.beds.length}-Sharing</p>
                    </div>
                </div>
                <div className="flex items-center gap-4 text-sm font-normal pr-2">
                    <span className={cn(roomSummary.availableBeds > 0 ? 'text-green-600' : 'text-muted-foreground')}>
                        {roomSummary.availableBeds} Available
                    </span>
                     <span className={cn(roomSummary.rentPending > 0 ? 'text-red-600' : 'text-muted-foreground')}>
                        {roomSummary.rentPending} Rent Pending
                    </span>
                </div>
            </div>
        </AccordionTrigger>
    );
};

export default function PgLayout(props: PgLayoutProps) {
  const { pg, isEditMode, openAddFloorDialog, setItemToDelete, handleOpenFloorDialog, viewMode } = props
  const [openFloorItems, setOpenFloorItems] = useState<string[]>([]);
  const [openRoomItems, setOpenRoomItems] = useState<string[]>([]);

  useEffect(() => {
    const allFloorIds = pg.floors?.map(f => f.id) || [];
    const allRoomIds = pg.floors?.flatMap(f => f.rooms.map(r => r.id)) || [];

    if (viewMode === 'bed') {
      setOpenFloorItems(allFloorIds);
      setOpenRoomItems(allRoomIds);
    } else if (viewMode === 'room') {
      setOpenFloorItems(allFloorIds);
      setOpenRoomItems([]);
    } else if (viewMode === 'floor' || viewMode === 'property') {
      setOpenFloorItems([]);
      setOpenRoomItems([]);
    }
  }, [pg.floors, viewMode]);

  return (
    <Card>
      <CardHeader className="py-4">
        <CardTitle className="text-xl">{pg.name} - {isEditMode ? 'Layout Editor' : 'Occupancy View'}</CardTitle>
        <CardDescription>{isEditMode ? "Add, edit, or remove floors, rooms, and beds." : "Visualize bed occupancy and manage guests."}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Accordion 
          type="multiple" 
          className="w-full" 
          value={openFloorItems}
          onValueChange={setOpenFloorItems}
        >
          {pg.floors?.map(floor => (
            <AccordionItem value={floor.id} key={floor.id} className="border-b-0">
              <div className="flex items-center border-b">
                 <AccordionTrigger className="text-lg font-medium hover:no-underline flex-1">
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
              <AccordionContent className="pt-4 pl-4 border-l">
                <Accordion type="multiple" className="w-full" value={openRoomItems} onValueChange={setOpenRoomItems}>
                  <div className="space-y-6">
                    {floor.rooms.map(room => (
                      <AccordionItem value={room.id} key={room.id} className="border-b-0">
                          <RoomAccordionTrigger floor={floor} room={room} />
                          <AccordionContent className="pt-4">
                            <BedCard {...props} room={room} floor={floor} />
                          </AccordionContent>
                      </AccordionItem>
                    ))}
                    {isEditMode && (
                      <Access feature="properties" action="add">
                        <button data-tour="add-room-button" onClick={() => props.handleOpenRoomDialog(null, floor.id, pg.id)} className="min-h-[200px] h-full w-full flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"><PlusCircle className="w-8 h-8 mb-2" /><span className="font-medium">Add New Room</span></button>
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
