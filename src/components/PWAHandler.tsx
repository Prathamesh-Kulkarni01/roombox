'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAppSelector } from '@/lib/hooks';

export default function PWAHandler() {
    const router = useRouter();
    const pathname = usePathname();
    const { currentUser } = useAppSelector(state => state.user);
    const { selectedPgId } = useAppSelector(state => state.app);

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

            let activeSubdomain = '';
            if (typeof window !== 'undefined') {
                // 1. Try to get from hostname (e.g. skyline.rentvastu.com or skyline.localhost)
                const host = window.location.hostname;
                const parts = host.split('.');
                if (parts.length >= 3 || (parts.length === 2 && parts[1] === 'localhost')) {
                    const domainSub = parts[0];
                    if (domainSub !== 'www' && domainSub !== 'rentvastu' && domainSub !== 'roombox' && domainSub !== 'localhost') {
                        activeSubdomain = domainSub;
                        sessionStorage.setItem('pwa_subdomain', domainSub);
                    }
                }

                // 2. Try to get from URL pathname (starts with /site/)
                if (!activeSubdomain && pathname.startsWith('/site/')) {
                    const pathSub = pathname.split('/')[2];
                    if (pathSub) {
                        activeSubdomain = pathSub;
                        sessionStorage.setItem('pwa_subdomain', pathSub);
                    }
                }
                
                // 3. Try to get from URL query params
                if (!activeSubdomain) {
                    const params = new URLSearchParams(window.location.search);
                    const querySub = params.get('subdomain');
                    if (querySub) {
                        activeSubdomain = querySub;
                        sessionStorage.setItem('pwa_subdomain', querySub);
                    }
                }

                // 4. Fallback to sessionStorage
                if (!activeSubdomain) {
                    activeSubdomain = sessionStorage.getItem('pwa_subdomain') || '';
                }
            }

            // If we have an owner logged in, use their ID for branding
            if (currentUser?.id && (currentUser.role === 'owner' || currentUser.role === 'admin')) {
                manifestUrl = `/api/pwa/manifest?ownerId=${currentUser.id}`;
            }
            // If we have a tenant logged in, use their active PG owner's ID for branding
            else if (currentUser?.id && currentUser.role === 'tenant') {
                const activeTenancy = currentUser.activeTenancies?.find(t => (t as any).pgId === selectedPgId) || currentUser.activeTenancies?.[0];
                if (activeTenancy?.ownerId) {
                    manifestUrl = `/api/pwa/manifest?ownerId=${activeTenancy.ownerId}`;
                }
            }
            // If we have an active subdomain resolved (e.g. from site pathname, query param, or sessionStorage session)
            else if (activeSubdomain) {
                manifestUrl = `/api/pwa/manifest?subdomain=${activeSubdomain}`;
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
    }, [pathname, router, currentUser, selectedPgId]);

    return null;
}
