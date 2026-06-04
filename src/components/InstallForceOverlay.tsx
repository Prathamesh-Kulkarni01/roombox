'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Download, X, Sparkles, Building2 } from 'lucide-react';
import Link from 'next/link';
import { useBranding } from '@/context/branding-context';

export default function InstallForceOverlay() {
    const [isVisible, setIsVisible] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const pathname = usePathname();
    const branding = useBranding();

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

        // 3. Show overlay only if on mobile, not standalone, and not already dismissed recently
        const dismissedTime = localStorage.getItem('pwa_prompt_dismissed_time');
        const now = Date.now();
        
        // Don't show if dismissed within the last 7 days (7 * 24 * 60 * 60 * 1000)
        const isRecentlyDismissed = dismissedTime && (now - parseInt(dismissedTime, 10) < 7 * 24 * 60 * 60 * 1000);

        if (mobile && !isStandalone && !isRecentlyDismissed) {
            let timeoutId: NodeJS.Timeout;

            const checkManifestAndShow = () => {
                if (typeof window === 'undefined') return;
                const link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
                const isBrandedRoute = branding.isSubdomain || window.location.pathname.startsWith('/tenants');

                if (isBrandedRoute) {
                    // Wait until PWAHandler has injected/updated the manifest link pointing to our dynamic manifest route
                    if (link && link.href.includes('/api/pwa/manifest')) {
                        setIsVisible(true);
                    } else {
                        // Manifest URL is not ready yet, retry in 500ms
                        timeoutId = setTimeout(checkManifestAndShow, 500);
                    }
                } else {
                    // Standard root route, show immediately after initial delay
                    setIsVisible(true);
                }
            };

            // Delay initial check by 3 seconds for better entry UX
            timeoutId = setTimeout(checkManifestAndShow, 3000);
            return () => clearTimeout(timeoutId);
        }
    }, [pathname, branding]);

    const handleDismiss = () => {
        setIsVisible(false);
        localStorage.setItem('pwa_prompt_dismissed_time', Date.now().toString());
    };

    if (!isVisible) return null;

    const pgName = branding.isSubdomain ? branding.siteTitle : 'RentSutra';
    const logoUrl = branding.isSubdomain ? branding.logoUrl || branding.faviconUrl : null;
    const themeColor = branding.isSubdomain ? branding.themeColor : '#2563EB';

    return (
        <div className="fixed bottom-4 inset-x-4 z-[99] flex justify-center animate-in slide-in-from-bottom-10 fade-in duration-500">
            <div className="w-full max-w-md bg-card/95 backdrop-blur-md border border-border shadow-2xl rounded-2xl overflow-hidden p-5 relative pr-12 flex gap-4 items-center">
                
                {/* Close Button */}
                <button
                    onClick={handleDismiss}
                    className="absolute top-3 right-3 p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg transition-all"
                    aria-label="Dismiss"
                >
                    <X className="w-4 h-4" />
                </button>

                {/* Branded Icon Container */}
                <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 shadow-inner overflow-hidden border border-border bg-muted">
                    {logoUrl ? (
                        <img src={logoUrl} alt="App Logo" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-white animate-pulse" style={{ backgroundColor: themeColor }}>
                            <Building2 className="w-6 h-6" />
                        </div>
                    )}
                </div>

                {/* Content Section */}
                <div className="flex-1 space-y-1">
                    <h3 className="text-md font-bold tracking-tight text-foreground flex items-center gap-1.5">
                        Install {pgName} App
                        <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" />
                    </h3>
                    <p className="text-xs text-muted-foreground leading-normal">
                        Faster loading, instant rent updates, and secure local access on your home screen.
                    </p>
                    
                    <div className="flex items-center gap-3 pt-1">
                        <Button 
                            size="sm" 
                            className="text-xs font-bold rounded-lg px-4 h-8 text-white shadow-sm"
                            style={{ backgroundColor: themeColor }}
                            asChild
                        >
                            <Link href="/download">
                                <Download className="mr-1.5 h-3.5 w-3.5" /> Install Now
                            </Link>
                        </Button>
                        <button
                            onClick={handleDismiss}
                            className="text-xs text-muted-foreground hover:text-foreground font-semibold py-1.5"
                        >
                            Maybe Later
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
