
'use client'

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "../ui/button"
import { Layers, PlusCircle, Trash2, Pencil, DoorOpen, IndianRupee, Wifi, Wind, UtensilsCrossed, Users as UsersIcon } from "lucide-react"
import type { PG, Floor, Room, Bed } from "@/lib/types"
import { BedCard } from "./BedCard"
import type { UseDashboardReturn } from "@/hooks/use-dashboard"
import { MutableRefObject, useMemo } from "react"
import Access from "../ui/PermissionWrapper";

const amenityIcons: { [key: string]: React.ReactNode } = {
  wifi: <Wifi className="w-4 h-4" />,
  ac: <Wind className="w-4 h-4" />,
  food: <UtensilsCrossed className="w-4 h-4" />,
};

interface PgLayoutProps extends Pick<UseDashboardReturn,
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
  isEditMode: boolean;
}

export default function PgLayout(props: PgLayoutProps) {
  const {
    pg, isEditMode, setItemToDelete,
    handleOpenFloorDialog, handleOpenRoomDialog, handleOpenBedDialog, handleOpenSharedChargeDialog
  } = props

  const floorDefaultValues = useMemo(() => {
    return pg.floors?.map(f => f.id) || [];
  }, [pg.floors]);

  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardHeader className="p-4 px-0">
        <CardTitle className="text-2xl font-black tracking-tight">{pg.name}</CardTitle>
        <CardDescription className="text-muted-foreground">{pg.location}, {pg.city}</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Accordion
          type="multiple"
          className="w-full space-y-4"
          defaultValue={floorDefaultValues}
          key={`floor-accordion-${isEditMode}`}
        >
          {pg.floors?.map(floor => (
            <AccordionItem value={floor.id} key={floor.id} className="border border-border/60 bg-card rounded-xl overflow-hidden shadow-sm">
              <div className="flex items-center p-4 border-b bg-muted/20">
                <AccordionTrigger className="text-lg font-bold hover:no-underline flex-1 py-0">
                  <div className="flex items-center gap-3 w-full">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <Layers className="w-5 h-5" />
                    </div>
                    <span>{floor.name}</span>
                  </div>
                </AccordionTrigger>
                {isEditMode && (
                  <div className="flex items-center ml-auto gap-1">
                    <Access feature="properties" action="edit">
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors" onClick={(e) => { e.stopPropagation(); handleOpenFloorDialog(floor, pg); }}><Pencil className="w-4 h-4" /></Button>
                    </Access>
                    <Access feature="properties" action="delete">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 transition-colors" onClick={(e) => { e.stopPropagation(); setItemToDelete({ type: 'floor', ids: { pgId: pg.id, floorId: floor.id } }); }}><Trash2 className="w-4 h-4" /></Button>
                    </Access>
                  </div>
                )}
              </div>
              <AccordionContent className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {floor.rooms.map(room => (
                    <Card key={room.id} className="overflow-hidden flex flex-col border border-border/60 hover:border-primary/30 transition-all hover:shadow-md bg-background group">
                      <div className="p-3 border-b bg-muted/30 flex items-center justify-between group-hover:bg-primary/5 transition-colors">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-md bg-background border shadow-sm">
                            <DoorOpen className="w-3.5 h-3.5 text-primary" />
                          </div>
                          <span className="font-bold text-sm tracking-tight">{room.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {isEditMode ? (
                            <Access feature="properties" action="edit">
                              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-background shadow-none border-none" onClick={() => handleOpenRoomDialog(room, floor.id, pg.id)}>
                                <Pencil className="w-3 h-3" />
                              </Button>
                            </Access>
                          ) : (
                            <Access feature="properties" action="sharedCharge">
                              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-primary hover:bg-primary/10" onClick={() => handleOpenSharedChargeDialog(room)}>
                                <UsersIcon className="h-3.5 w-3.5" />
                              </Button>
                            </Access>
                          )}
                        </div>
                      </div>
                      <div className="p-3 bg-card flex-1">
                        <div className="grid grid-cols-2 xs:grid-cols-3 gap-2">
                          {room.beds.map(bed => (
                            <BedCard
                              key={bed.id}
                              bed={bed}
                              room={room}
                              pg={pg}
                              onAddGuest={props.handleOpenAddGuestDialog}
                              onGuestClick={props.handleOpenEditGuestDialog}
                              onEdit={() => handleOpenBedDialog(bed, room.id, floor.id)}
                              isEditing={isEditMode}
                            />
                          ))}
                          {isEditMode && (
                            <button
                              onClick={() => handleOpenBedDialog(null, room.id, floor.id)}
                              className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/20 flex flex-col items-center justify-center hover:bg-muted/50 hover:border-primary/30 transition-all gap-1"
                            >
                              <PlusCircle className="w-5 h-5 text-muted-foreground/40" />
                              <span className="text-[8px] font-bold text-muted-foreground/40 uppercase">Add Bed</span>
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="px-3 py-2 border-t bg-muted/10 flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <IndianRupee className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs font-bold">{room.rent.toLocaleString('en-IN')}</span>
                          <span className="text-[10px] text-muted-foreground">/bed</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {room.amenities?.slice(0, 3).map(amenity => (
                            <div key={amenity} className="text-muted-foreground/60 scale-75">
                              {amenityIcons[amenity]}
                            </div>
                          ))}
                        </div>
                      </div>
                    </Card>
                  ))}
                  {isEditMode && (
                    <Access feature="properties" action="add">
                      <button
                        onClick={() => handleOpenRoomDialog(null, floor.id, pg.id)}
                        className="min-h-[140px] flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-xl text-muted-foreground hover:bg-muted/50 hover:text-primary hover:border-primary/30 transition-all group"
                      >
                        <PlusCircle className="w-8 h-8 mb-2 opacity-40 group-hover:scale-110 transition-transform" />
                        <span className="font-bold text-xs uppercase tracking-wider">Add Room</span>
                      </button>
                    </Access>
                  )}
                </div>
                {floor.rooms.length === 0 && !isEditMode && (
                  <div className="text-center py-12 bg-muted/10 rounded-xl border-2 border-dashed">
                    <DoorOpen className="w-12 h-12 mx-auto mb-3 opacity-10" />
                    <p className="text-muted-foreground font-medium">No rooms in this floor yet.</p>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
          {isEditMode && (
            <Access feature="properties" action="add">
              <button
                onClick={() => handleOpenFloorDialog(null, pg)}
                className="w-full flex items-center justify-center p-6 border-2 border-dashed rounded-xl text-muted-foreground hover:bg-muted/50 hover:text-primary hover:border-primary/50 transition-all gap-3 overflow-hidden relative group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <PlusCircle className="h-6 w-6" />
                <span className="font-bold text-sm uppercase tracking-widest">Construct New Floor</span>
              </button>
            </Access>
          )}
          {(!pg.floors || pg.floors.length === 0) && !isEditMode && (
            <div className="text-center py-20 bg-muted/10 rounded-2xl border-2 border-dashed">
              <Layers className="w-16 h-16 mx-auto mb-4 opacity-10" />
              <p className="text-muted-foreground font-bold text-lg">This property has no floors configured.</p>
              <p className="text-sm text-muted-foreground/60 mt-1">Click 'Edit Building' to start construction.</p>
            </div>
          )}
        </Accordion>
      </CardContent>
    </Card>
  )
}
