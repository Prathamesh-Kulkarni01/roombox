'use client'

import { Home } from 'lucide-react'
import { motion } from 'framer-motion'

interface BuildingPreviewProps {
    floorCount: number | string
    roomsPerFloor: number | string
    bedsPerRoom: number | string
}

export function BuildingPreview({ floorCount, roomsPerFloor, bedsPerRoom }: BuildingPreviewProps) {
    const fCount = Number(floorCount)
    const rPerFloor = Number(roomsPerFloor)
    const bPerRoom = Number(bedsPerRoom)

    return (
        <div className="mt-4 border rounded-[2rem] bg-gradient-to-br from-primary/5 via-background to-primary/5 p-6 md:p-8 overflow-hidden relative shadow-inner border-primary/10">
            <div className="absolute top-4 right-4 bg-primary/10 backdrop-blur-md border border-primary/10 px-3 py-1 rounded-full flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-widest text-primary">Building View</span>
            </div>

            <div className="flex flex-col-reverse gap-3 items-center mt-6">
                {Array.from({ length: Math.min(fCount, 4) }).map((_, fIdx) => (
                    <motion.div 
                        key={fIdx} 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: fIdx * 0.1 }}
                        className="flex flex-col gap-2 p-3 rounded-2xl border border-primary/10 bg-background/60 backdrop-blur-xl w-full shadow-sm"
                    >
                        <div className="flex items-center gap-2 px-1">
                            <span className="text-xs font-bold text-primary/60 uppercase tracking-tighter">Floor {fIdx + 1}</span>
                            <div className="h-[1px] flex-1 bg-primary/5" />
                        </div>
                        
                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                            {Array.from({ length: Math.min(rPerFloor, 6) }).map((_, rIdx) => {
                                const roomNum = (fIdx + 1) * 100 + (rIdx + 1)
                                return (
                                    <div key={rIdx} className="aspect-square rounded-xl bg-primary/5 border border-primary/10 flex flex-col items-center justify-center gap-1 hover:bg-primary/10 transition-colors group/room">
                                        <span className="text-xs font-bold text-primary/40 group-hover/room:text-primary/60">{roomNum}</span>
                                        <div className="flex flex-wrap justify-center gap-0.5 px-0.5">
                                            {Array.from({ length: Math.min(bPerRoom, 4) }).map((_, bIdx) => (
                                                <div key={bIdx} className="w-1.5 h-1.5 rounded-full bg-primary/30" />
                                            ))}
                                        </div>
                                    </div>
                                )
                            })}
                            {rPerFloor > 6 && (
                                <div className="aspect-square rounded-xl border border-dashed border-primary/20 flex items-center justify-center text-xs font-bold text-muted-foreground bg-muted/5">
                                    +{rPerFloor - 6}
                                </div>
                            )}
                        </div>
                    </motion.div>
                ))}
                {fCount > 4 && (
                    <div className="text-xs text-primary/40 font-bold tracking-widest uppercase py-1">
                        + {fCount - 4} More Floors
                    </div>
                )}
            </div>

            <div className="mt-8 pt-6 border-t border-primary/10 flex justify-between px-2">
                <div className="text-center">
                    <div className="text-xl font-bold text-primary leading-none">{fCount}</div>
                    <div className="text-xs uppercase text-muted-foreground font-bold tracking-widest mt-1">Floors</div>
                </div>
                <div className="text-center">
                    <div className="text-xl font-bold text-primary leading-none">{fCount * rPerFloor}</div>
                    <div className="text-xs uppercase text-muted-foreground font-bold tracking-widest mt-1">Rooms</div>
                </div>
                <div className="text-center">
                    <div className="text-xl font-bold text-primary leading-none">{fCount * rPerFloor * bPerRoom}</div>
                    <div className="text-xs uppercase text-muted-foreground font-bold tracking-widest mt-1">Guests</div>
                </div>
            </div>
        </div>
    )
}
