'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function PWAHandler() {
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        // Detect if running in standalone mode (PWA)
        const isStandalone = typeof window !== 'undefined' && (
            window.matchMedia('(display-mode: standalone)').matches
            || (window.navigator as any).standalone
            || document.referrer.includes('android-app://')
        );

        if (isStandalone && pathname === '/') {
            // Direct land to dashboard if in PWA and on landing page
            router.replace('/dashboard');
        }
    }, [pathname, router]);

    return null;
}
