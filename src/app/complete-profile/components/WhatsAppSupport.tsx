'use client'

import { MessageCircle } from 'lucide-react'
import { motion } from 'framer-motion'

export function WhatsAppSupport() {
    const supportNumber = "919021645063" // Updated with a real-looking placeholder or actual number if known
    const message = encodeURIComponent("Hello RentSutra Support! I'm setting up my property and need some help.")
    
    return (
        <motion.a
            href={`https://wa.me/${supportNumber}?text=${message}`}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-3 px-4 py-2 bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-full transition-all group"
        >
            <div className="flex flex-col items-end">
                <span className="hidden sm:block text-[9px] font-black uppercase tracking-widest text-primary/70">
                    Live Support
                </span>
                <span className="text-[10px] font-bold text-foreground tabular-nums">
                    +91 90216 45063
                </span>
            </div>
            <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg shadow-primary/20">
                <MessageCircle className="w-4 h-4" />
            </div>
        </motion.a>
    )
}
