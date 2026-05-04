'use client'

import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Rocket, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'

interface NavigationFooterProps {
    onBack?: () => void
    onNext?: () => void
    nextLabel?: string
    isNextDisabled?: boolean
    isLoading?: boolean
    showBack?: boolean
    showNext?: boolean
    isFinal?: boolean
}

export function NavigationFooter({
    onBack,
    onNext,
    nextLabel = "Continue",
    isNextDisabled = false,
    isLoading = false,
    showBack = true,
    showNext = true,
    isFinal = false
}: NavigationFooterProps) {
    return (
        <div className="fixed bottom-0 left-0 right-0 p-4 md:p-8 bg-background/80 backdrop-blur-2xl border-t border-primary/5 z-[60] flex justify-center">
            <div className="w-full max-w-4xl flex items-center justify-between gap-4">
                {showBack ? (
                    <Button 
                        variant="ghost" 
                        type="button" 
                        onClick={onBack} 
                        className="font-bold uppercase tracking-widest text-[10px] h-12 md:h-14 px-4 md:px-8 rounded-2xl hover:bg-primary/5 transition-all"
                    >
                        <ChevronLeft className="w-4 h-4 mr-2" /> Back
                    </Button>
                ) : (
                    <div className="w-24 md:w-32" />
                )}

                {showNext && onNext && (
                    <Button 
                        type="button" 
                        onClick={onNext} 
                        disabled={isNextDisabled || isLoading}
                        size="lg" 
                        className={`
                            ${isFinal ? 'w-full md:w-auto px-12' : 'w-full md:w-auto px-10'} 
                            h-14 md:h-16 rounded-2xl font-black uppercase tracking-widest text-xs gap-3 shadow-xl 
                            ${isFinal ? 'shadow-primary/40 bg-primary' : 'shadow-primary/20'} 
                            hover:scale-[1.02] active:scale-95 transition-all
                        `}
                    >
                        {isLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : isFinal ? (
                            <>DEPLOY SYSTEM <Rocket className="w-5 h-5" /></>
                        ) : (
                            <>{nextLabel} <ChevronRight className="w-5 h-5" /></>
                        )}
                    </Button>
                )}
                {!showNext && <div className="w-24 md:w-32" />}
            </div>
        </div>
    )
}
