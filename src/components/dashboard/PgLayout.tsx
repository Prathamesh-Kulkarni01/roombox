
'use client'

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "../ui/button"
import { Layers, PlusCircle, Trash2, Pencil, DoorOpen, IndianRupee, BedDouble, Wifi, Wind, UtensilsCrossed } from "lucide-react"
import type { PG, Floor, Room } from "@/lib/types"
import BedCard from "./BedCard"
import type { UseDashboardReturn } from "@/hooks/use-dashboard"
import { MutableRefObject, useMemo } from "react"
import { useAppSelector } from "@/lib/hooks"
import Access from "../ui/PermissionWrapper";

const amenityIcons: { [key: string]: React.ReactNode } = {
    wifi: <Wifi className="w-4 h-4" title="Wi-Fi"/>,
    ac: <Wind className="w-4 h-4" title="AC"/>,
    food: <UtensilsCrossed className="w-4 h-4" title="Food"/>,
};


const RoomAccordionTrigger = ({ room }: { room: Room }) => {
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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center w-full gap-2">
            <div className="flex items-center gap-4">
                <DoorOpen className="w-6 h-6 text-primary" />
                <div>
                    <p className="font-bold text-lg">{room.name}</p>
                    <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
                        <span>{summary.totalBeds}-Sharing</span>
                        {room.amenities && room.amenities.length > 0 && (
                            <>
                                <span className="text-xs">|</span>
                                <div className="flex items-center gap-2">
                                    {room.amenities.slice(0, 3).map(amenity => (
                                        <div key={amenity} className="text-muted-foreground">
                                            {amenityIcons[amenity] || null}
                                        </div>
                                    ))}
                                    {room.amenities.length > 3 && <span className="text-xs font-medium">+ {room.amenities.length - 3}</span>}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
            <div className="flex gap-4 text-center w-full md:w-auto justify-around pt-2 md:pt-0">
                 <div className="flex flex-col items-center">
                    <p className="font-bold text-lg">{summary.availableBeds}</p>
                    <p className="text-xs text-muted-foreground">Available</p>
                </div>
                 <div className="flex flex-col items-center">
                    <p className="font-bold text-lg text-destructive">{summary.rentPending}</p>
                    <p className="text-xs text-muted-foreground">Rent Due</p>
                </div>
                <div className="flex flex-col items-center">
                    <p className="font-bold text-lg flex items-center">
                      <IndianRupee className="w-4 h-4" />
                      {room.rent.toLocaleString('en-IN')}
                    </p>
                    <p className="text-xs text-muted-foreground">Rent/Bed</p>
                </div>
            </div>
        </div>
    );
};


interface PgLayoutProps extends Pick<UseDashboardReturn, 
  'isEditMode' | 
  'setItemToDelete' |
  'setGuestToInitiateExit' |
  'setGuestToExitImmediately' |
  'handleOpenAddGuestDialog' |
  'handleOpenEditGuestDialog' |
  'handleOpenPaymentDialog' |
  'handleOpenReminderDialog' |
  'handleOpenSharedChargeDialog' |
  'handleOpenFloorDialog' |
  'handleOpenRoomDialog' |
  'handleOpenBedDialog'
> {
  pg: PG;
  isFirstAvailableBedFound: MutableRefObject<boolean>;
  viewMode: 'bed' | 'room';
}

export default function PgLayout(props: PgLayoutProps) {
  const { 
    pg, isEditMode, setItemToDelete, viewMode, 
    handleOpenFloorDialog, handleOpenRoomDialog, handleOpenBedDialog 
  } = props
  
  const floorDefaultValues = useMemo(() => {
    // Floors should always be open now for clarity.
    return pg.floors?.map(f => f.id) || [];
  }, [pg.floors]);

  const roomDefaultValues = useMemo(() => {
    // Open all rooms in edit mode OR if the view mode is set to 'bed' (which shows beds inside rooms)
    if (isEditMode || viewMode === 'bed') {
      return pg.floors?.flatMap(f => f.rooms.map(r => r.id)) || [];
    }
    return [];
  }, [pg.floors, viewMode, isEditMode]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{pg.name}</CardTitle>
        <CardDescription>{pg.location}, {pg.city}</CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion 
          type="multiple" 
          className="w-full space-y-4" 
          defaultValue={floorDefaultValues}
          key={`floor-accordion-${isEditMode}`}
        >
          {pg.floors?.map(floor => (
            <AccordionItem value={floor.id} key={floor.id} className="border-b-0 bg-muted/30 rounded-lg overflow-hidden">
              <div className="flex items-center p-4 border-b">
                <AccordionTrigger className="text-lg font-medium hover:no-underline flex-1 py-0">
                    <div className="flex items-center gap-4 w-full">
                      <Layers /> {floor.name}
                    </div>
                </AccordionTrigger>
                {isEditMode && (
                  <div className="flex items-center ml-auto pl-4">
                    <Access feature="properties" action="edit">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenFloorDialog(floor, pg)}><Pencil className="w-4 h-4" /></Button>
                    </Access>
                    <Access feature="properties" action="delete">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={() => setItemToDelete({ type: 'floor', ids: { pgId: pg.id, floorId: floor.id } })}><Trash2 className="w-4 h-4" /></Button>
                    </Access>
                  </div>
                )}
              </div>
              <AccordionContent className="pt-4 px-4">
                <Accordion type="multiple" defaultValue={roomDefaultValues} key={`room-accordion-${viewMode}-${isEditMode}`}>
                  {floor.rooms.map(room => (
                    <AccordionItem key={room.id} value={room.id} className="border rounded-lg overflow-hidden mb-4">
                        <div className="flex items-center p-4">
                            <AccordionTrigger className="p-0 hover:no-underline flex-1">
                                <RoomAccordionTrigger room={room} />
                            </AccordionTrigger>
                            {isEditMode && (
                                <div className="flex items-center ml-auto pl-4">
                                    <Access feature="properties" action="edit">
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenRoomDialog(room, floor.id, pg.id)}>
                                            <Pencil className="w-4 h-4" />
                                        </Button>
                                    </Access>
                                </div>
                            )}
                        </div>
                        <AccordionContent className="p-4 pt-0 border-t">
                            <BedCard {...props} room={room} floor={floor} handleOpenBedDialog={handleOpenBedDialog} />
                        </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
                {isEditMode && (
                    <Access feature="properties" action="add">
                      <button data-tour="add-room-button" onClick={() => handleOpenRoomDialog(null, floor.id, pg.id)} className="mt-4 min-h-[100px] h-full w-full flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"><PlusCircle className="w-8 h-8 mb-2" /><span className="font-medium">Add New Room</span></button>
                    </Access>
                )}
                {floor.rooms.length === 0 && !isEditMode && (
                  <div className="text-center py-8 text-muted-foreground">No rooms in this floor yet. Enable 'Edit Building' to add one.</div>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
          {isEditMode && (
              <Access feature="properties" action="add">
                <button data-tour="add-floor-button" onClick={() => handleOpenFloorDialog(null, pg)} className="mt-6 w-full flex items-center justify-center p-4 border-2 border-dashed rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"><PlusCircle className="mr-2 h-5 w-5" /><span className="font-medium">Add New Floor</span></button>
              </Access>
            )}
            {(!pg.floors || pg.floors.length === 0) && !isEditMode && (<div className="text-center text-muted-foreground p-8">This property has no floors configured. Click 'Edit Building' to start.</div>)}
        </Accordion>
      </CardContent>
    </Card>
  )
}
