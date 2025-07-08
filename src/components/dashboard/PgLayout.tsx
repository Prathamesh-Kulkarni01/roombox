
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Button } from "../ui/button"
import { Layers, PlusCircle, Trash2, Pencil } from "lucide-react"
import type { PG, Floor, Room, Bed } from "@/lib/types"
import BedCard from "./BedCard"
import type { UseDashboardReturn } from "@/hooks/use-dashboard"
import { MutableRefObject } from "react"

interface PgLayoutProps extends Omit<UseDashboardReturn, 'stats'> {
  pg: PG
  isFirstAvailableBedFound: MutableRefObject<boolean>
}

export default function PgLayout({ pg, isEditMode, openAddFloorDialog, handleDelete, openEditFloorDialog, openAddRoomDialog, isFirstAvailableBedFound }: PgLayoutProps) {
  const { guests, complaints } = useAppSelector(state => ({
    guests: state.guests.guests,
    complaints: state.complaints.complaints,
  }));
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{pg.name} - {isEditMode ? 'Layout Editor' : 'Occupancy View'}</CardTitle>
        <CardDescription>{isEditMode ? "Add, edit, or remove floors, rooms, and beds." : "Visualize bed occupancy and manage guests."}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Accordion type="multiple" className="w-full" defaultValue={pg.floors?.map(f => f.id)}>
          {pg.floors?.map(floor => (
            <AccordionItem value={floor.id} key={floor.id}>
              <AccordionTrigger className="text-lg font-medium hover:no-underline"><div className="flex items-center gap-4 w-full"><Layers /> {floor.name}</div></AccordionTrigger>
              <AccordionContent className="pt-4">
                <div className="space-y-6">
                  {floor.rooms.map(room => (
                    <div key={room.id}>
                       <BedCard room={room} floor={floor} pg={pg} isFirstAvailableBedFound={isFirstAvailableBedFound} />
                    </div>
                  ))}
                  {isEditMode && (<button data-tour="add-room-button" onClick={() => openAddRoomDialog(floor.id)} className="min-h-[200px] h-full w-full flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"><PlusCircle className="w-8 h-8 mb-2" /><span className="font-medium">Add New Room</span></button>)}
                </div>
                 <div className="mt-6 flex items-center gap-4">
                    {isEditMode && (<Button variant="ghost" className="text-red-600 hover:text-red-600 hover:bg-red-500/10" onClick={(e) => { e.stopPropagation(); handleDelete('floor', { floorId: floor.id }) }}><Trash2 className="mr-2 h-4 w-4" /> Delete {floor.name}</Button>)}
                    {isEditMode && (<Button variant="ghost" onClick={(e) => { e.stopPropagation(); openEditFloorDialog(floor) }}><Pencil className="mr-2 h-4 w-4" /> Edit {floor.name}</Button>)}
                 </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        {isEditMode && (<button data-tour="add-floor-button" onClick={openAddFloorDialog} className="mt-6 w-full flex items-center justify-center p-4 border-2 border-dashed rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"><PlusCircle className="mr-2 h-5 w-5" /><span className="font-medium">Add New Floor</span></button>)}
        {(!pg.floors || pg.floors.length === 0) && (<div className="text-center text-muted-foreground p-8">This property has no floors configured. Enable 'Edit Mode' to build the layout.</div>)}
      </CardContent>
    </Card>
  )
}
