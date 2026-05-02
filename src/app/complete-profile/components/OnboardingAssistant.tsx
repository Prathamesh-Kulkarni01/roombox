'use client'

import { Sparkles } from 'lucide-react'

interface OnboardingAssistantProps {
    title: string
    message: string
}

export function OnboardingAssistant({ title, message }: OnboardingAssistantProps) {
    return (
        <div className="mt-12 p-8 rounded-[2.5rem] bg-card/40 backdrop-blur-xl border border-primary/10 flex flex-col md:flex-row gap-6 shadow-2xl shadow-primary/5 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
            
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary to-primary/80 flex items-center justify-center shrink-0 shadow-lg shadow-primary/20 rotate-3 group-hover:rotate-6 transition-transform">
                <Sparkles className="w-7 h-7 text-primary-foreground -rotate-3 group-hover:-rotate-6 transition-transform" />
            </div>
            
            <div className="space-y-3">
                <div className="flex items-center gap-3">
                    <h4 className="font-black text-xs uppercase tracking-[0.2em] text-primary">
                        Assistant Guide
                    </h4>
                    <div className="flex gap-1">
                        <div className="w-1 h-1 rounded-full bg-primary/40 animate-pulse" />
                        <div className="w-1 h-1 rounded-full bg-primary/60 animate-pulse delay-75" />
                        <div className="w-1 h-1 rounded-full bg-primary/80 animate-pulse delay-150" />
                    </div>
                </div>
                
                <div className="space-y-2">
                    <p className="text-sm font-black text-foreground uppercase tracking-widest opacity-80">{title}</p>
                    <p className="text-sm font-medium text-muted-foreground leading-relaxed max-w-xl">
                        {message}
                    </p>
                </div>
            </div>

            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
        </div>
    )
}
