'use client'

import { cn } from "@/lib/utils"
import { Check } from 'lucide-react'

interface StepIndicatorProps {
    active: boolean
    completed: boolean
    label: string
    index: number
}

export function StepIndicator({ active, completed, label, index }: StepIndicatorProps) {
    return (
        <div className={cn(
            "flex items-center gap-4 transition-all duration-500",
            active ? "opacity-100 scale-110" : "opacity-30"
        )}>
            <div className={cn(
                "w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-black border-2 transition-all duration-500 shadow-lg shadow-transparent",
                completed ? "bg-primary border-primary text-primary-foreground rotate-[15deg]" : 
                active ? "border-primary text-primary shadow-primary/10 -rotate-3" : "border-muted-foreground/30 text-muted-foreground"
            )}>
                {completed ? <Check className="w-6 h-6 -rotate-[15deg]" /> : index}
            </div>
            <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground leading-none mb-1">Step 0{index}</span>
                <span className={cn(
                    "text-sm font-black tracking-tight leading-none",
                    active ? "text-foreground" : "text-muted-foreground"
                )}>
                    {label}
                </span>
            </div>
        </div>
    )
}
