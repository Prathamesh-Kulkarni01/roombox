
'use client'

import { useAppSelector } from "@/lib/hooks";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Button } from "./ui/button";
import { Bug } from "lucide-react";

export default function DebugPopover() {
    const state = useAppSelector(state => state);
    const { currentUser } = state.user;
    const { guests } = state.guests;
    const { pgs } = state.pgs;

    const currentGuest = guests.find(g => g.id === currentUser?.guestId);
    const currentPg = pgs.find(p => p.id === currentGuest?.pgId);

    const dataToShow = {
        currentUser: {
            id: currentUser?.id,
            name: currentUser?.name,
            role: currentUser?.role,
            guestId: currentUser?.guestId,
            ownerId: currentUser?.ownerId
        },
        currentGuest: currentGuest ? {
            id: currentGuest.id,
            name: currentGuest.name,
            pgId: currentGuest.pgId,
        } : 'Not Found',
        currentPg: currentPg ? {
            id: currentPg.id,
            name: currentPg.name
        }: 'Not Found'
    };


    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="destructive"
                    size="icon"
                    className="fixed bottom-20 right-4 z-50 h-12 w-12 rounded-full shadow-lg"
                >
                    <Bug />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96" align="end">
                <div className="space-y-4">
                    <h4 className="font-medium leading-none">Debug State</h4>
                    <pre className="text-xs bg-muted p-2 rounded-md overflow-x-auto">
                        {JSON.stringify(dataToShow, null, 2)}
                    </pre>
                </div>
            </PopoverContent>
        </Popover>
    )
}
