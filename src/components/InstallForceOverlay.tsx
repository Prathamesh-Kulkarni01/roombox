
'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Download, Smartphone, Info, X, Zap, Bell, Shield } from 'lucide-react';
import Link from 'next/link';

export default function InstallForceOverlay() {
    const [isVisible, setIsVisible] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        // 1. Detect if it's already installed/standalone
        const isStandalone = typeof window !== 'undefined' && (
            window.matchMedia('(display-mode: standalone)').matches
            || (window.navigator as any).standalone
            || document.referrer.includes('android-app://')
        );

        // 2. Detect if it's a mobile device
        const ua = window.navigator.userAgent.toLowerCase();
        const mobile = /android|iphone|ipad|ipod/.test(ua);
        setIsMobile(mobile);

        // 3. Show overlay only if on mobile, not standalone, and not already dismissed this session
        const isDismissed = sessionStorage.getItem('pwa_prompt_dismissed') === 'true';

        if (mobile && !isStandalone && !isDismissed) {
            // Small delay for better UX
            const timer = setTimeout(() => {
                setIsVisible(true);
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [pathname]);

    const handleDismiss = () => {
        setIsVisible(false);
        sessionStorage.setItem('pwa_prompt_dismissed', 'true');
    };

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-md bg-card border shadow-2xl rounded-3xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-500">
                <div className="relative p-8 flex flex-col items-center text-center">
                    <button
                        onClick={handleDismiss}
                        className="absolute top-4 right-4 p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
                        <Smartphone className="w-10 h-10 text-primary" />
                    </div>

                    <h2 className="text-2xl font-bold tracking-tight mb-2">Install RentSutra App</h2>
                    <p className="text-muted-foreground mb-8">
                        Get a premium experience with faster loading and instant rent notifications.
                    </p>

                    <div className="grid grid-cols-1 gap-4 w-full mb-8 text-left">
                        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                            <Zap className="w-5 h-5 text-amber-500" />
                            <span className="text-sm font-medium">2x Faster Performance</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                            <Bell className="w-5 h-5 text-blue-500" />
                            <span className="text-sm font-medium">Instant Payment Reminders</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                            <Shield className="w-5 h-5 text-green-500" />
                            <span className="text-sm font-medium">Secure & Reliable Access</span>
                        </div>
                    </div>

                    <div className="flex flex-col w-full gap-3">
                        <Button size="lg" className="w-full h-12 text-md rounded-xl font-bold shadow-lg shadow-primary/20" asChild>
                            <Link href="/download">
                                <Download className="mr-2 h-5 w-5" /> Install App Now
                            </Link>
                        </Button>
                        <button
                            onClick={handleDismiss}
                            className="text-sm text-muted-foreground hover:text-foreground font-medium py-2"
                        >
                            Continue in Browser
                        </button>
                    </div>
                </div>

                <div className="bg-primary px-4 py-2 text-center">
                    <p className="text-[10px] text-primary-foreground/80 uppercase font-black tracking-widest">
                        Recommended for all {isMobile ? 'Mobile' : 'Device'} Users
                    </p>
                </div>
            </div>
        </div>
    );
}
