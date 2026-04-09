'use client';

/**
 * useRouteGuard — Client-side route protection hook.
 * Redirects staff users to /dashboard if they navigate to a restricted route.
 * Shows a toast notification explaining the denial.
 */
import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAppSelector } from '@/lib/hooks';
import { usePermissionsStore } from '@/lib/stores/configStores';
import { canAccess, ROUTE_PERMISSION_MAP } from '@/lib/permissions';
import { toast } from '@/hooks/use-toast';

export function useRouteGuard() {
    const pathname = usePathname();
    const router = useRouter();
    const { currentUser } = useAppSelector((state) => state.user);
    const { featurePermissions } = usePermissionsStore();
    const lastDeniedRef = useRef<string | null>(null);

    useEffect(() => {
        if (!currentUser || !pathname) return;

        // Owners and admins always have full access
        if (currentUser.role === 'owner' || currentUser.role === 'admin') return;

        // Find matching route rule — check longest match first
        const matchedRoute = Object.keys(ROUTE_PERMISSION_MAP)
            .sort((a, b) => b.length - a.length) // Longest first for specificity
            .find(route => pathname.startsWith(route));

        if (!matchedRoute) return; // No rule for this route → allow

        const { feature, action } = ROUTE_PERMISSION_MAP[matchedRoute];
        const hasAccess = canAccess(featurePermissions, currentUser.role, feature, action);

        if (!hasAccess) {
            // Avoid spamming toasts for the same denial
            const denialKey = `${feature}:${action}`;
            if (lastDeniedRef.current !== denialKey) {
                lastDeniedRef.current = denialKey;
                toast({
                    title: "Access Denied",
                    description: `You don't have permission to access this page. (Required: ${feature}:${action})`,
                    variant: "destructive",
                });
            }
            router.replace('/dashboard');
        } else {
            lastDeniedRef.current = null;
        }
    }, [pathname, currentUser, featurePermissions, router]);
}
