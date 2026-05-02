'use client'

import { Home } from 'lucide-react'

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
        <div className="mt-4 border rounded-3xl bg-gradient-to-br from-primary/5 via-background to-primary/5 p-8 overflow-hidden relative group shadow-inner">
            <div className="absolute top-6 right-6 bg-primary/20 backdrop-blur-md border border-primary/20 px-4 py-1.5 rounded-full flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Live Blueprint</span>
            </div>

            <div className="flex flex-col-reverse gap-4 items-center">
                {Array.from({ length: Math.min(fCount, 4) }).map((_, fIdx) => (
                    <div 
                        key={fIdx} 
                        className="flex gap-3 p-4 rounded-2xl border border-primary/10 bg-background/80 backdrop-blur-xl w-full max-w-md shadow-lg transition-all hover:scale-[1.02] hover:border-primary/30"
                        style={{ 
                            animation: 'slideUp 0.5s ease-out forwards',
                            animationDelay: `${fIdx * 100}ms`
                         }}
                    >
                        <div className="flex flex-col items-center justify-center gap-1 w-12 h-12 rounded-xl bg-primary/10 border border-primary/10 shrink-0">
                            <span className="text-[10px] font-black text-primary/60 leading-none">FLR</span>
                            <span className="text-lg font-black text-primary leading-none">{fIdx + 1}</span>
                        </div>
                        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 flex-1">
                            {Array.from({ length: Math.min(rPerFloor, 6) }).map((_, rIdx) => (
                                <div key={rIdx} className="aspect-square rounded-lg bg-primary/5 border border-primary/10 flex flex-col items-center justify-center gap-1 group/room hover:bg-primary/10 transition-colors">
                                    <Home className="w-3 h-3 text-primary/40 group-hover/room:text-primary transition-colors" />
                                    <div className="flex flex-wrap justify-center gap-0.5 px-1">
                                        {Array.from({ length: Math.min(bPerRoom, 4) }).map((_, bIdx) => (
                                            <div key={bIdx} className="w-1.5 h-1.5 rounded-full bg-primary/30 shadow-[0_0_5px_rgba(var(--primary),0.2)]" />
                                        ))}
                                    </div>
                                </div>
                            ))}
                            {rPerFloor > 6 && (
                                <div className="aspect-square rounded-lg border border-dashed border-primary/20 flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                                    +{rPerFloor - 6}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {fCount > 4 && (
                    <div className="text-xs text-primary/40 font-bold tracking-widest uppercase py-2 animate-pulse">
                        + {fCount - 4} Additional Floors
                    </div>
                )}
            </div>

            <div className="mt-8 pt-6 border-t border-primary/10 flex justify-between px-4">
                <div className="text-center">
                    <div className="text-2xl font-black text-primary leading-none">{fCount}</div>
                    <div className="text-[10px] uppercase text-muted-foreground font-black tracking-widest mt-1">Levels</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-black text-primary leading-none">{fCount * rPerFloor}</div>
                    <div className="text-[10px] uppercase text-muted-foreground font-black tracking-widest mt-1">Suites</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-black text-primary leading-none">{fCount * rPerFloor * bPerRoom}</div>
                    <div className="text-[10px] uppercase text-muted-foreground font-black tracking-widest mt-1">Total Capacity</div>
                </div>
            </div>

            <style jsx>{`
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    )
}
