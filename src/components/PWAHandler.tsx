'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAppSelector } from '@/lib/hooks';

export default function PWAHandler() {
    const router = useRouter();
    const pathname = usePathname();
    const { currentUser } = useAppSelector(state => state.user);

    useEffect(() => {
        // 1. Service Worker Registration Fallback
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator && !window.navigator.userAgent.includes('Lighthouse')) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js', { scope: '/' })
                    .then(reg => {
                        console.log('[PWA] Service Worker registered with scope:', reg.scope);
                    })
                    .catch(err => {
                        console.error('[PWA] Service Worker registration failed:', err);
                    });
            });
        }

        // 2. Dynamic Manifest Injection
        const updateManifest = () => {
            let manifestUrl = '/manifest.json'; // Default

            // If we have an owner logged in, use their ID for branding
            if (currentUser?.id && (currentUser.role === 'owner' || currentUser.role === 'admin')) {
                manifestUrl = `/api/pwa/manifest?ownerId=${currentUser.id}`;
            }
            // If we are on a subdomain site, use the subdomain
            else if (pathname.startsWith('/site/')) {
                const subdomain = pathname.split('/')[2];
                if (subdomain) {
                    manifestUrl = `/api/pwa/manifest?subdomain=${subdomain}`;
                }
            }

            // Find or create manifest link
            let link: HTMLLinkElement | null = document.querySelector('link[rel="manifest"]');
            if (link) {
                if (link.href !== window.location.origin + manifestUrl) {
                    console.log('[PWA] Updating manifest to:', manifestUrl);
                    link.href = manifestUrl;
                }
            } else {
                link = document.createElement('link');
                link.rel = 'manifest';
                link.href = manifestUrl;
                document.head.appendChild(link);
            }
        };

        updateManifest();

        // 3. Standalone Redirect Detection
        const isStandalone = typeof window !== 'undefined' && (
            window.matchMedia('(display-mode: standalone)').matches
            || (window.navigator as any).standalone
            || document.referrer.includes('android-app://')
        );

        if (isStandalone && pathname === '/') {
            // Direct land to dashboard if in PWA and on landing page
            router.replace('/dashboard');
        }
    }, [pathname, router, currentUser]);

    return null;
}
