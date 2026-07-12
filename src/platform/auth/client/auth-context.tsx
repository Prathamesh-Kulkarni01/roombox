'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { initializeApp, getApps, FirebaseApp, FirebaseOptions } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { usePgBranding } from '@/context/branding-context';
import { useAppSelector } from '@/lib/hooks';
import { setActiveTenantContext, getActiveDb } from '@/lib/firebase';

export interface AuthContextType {
    app: FirebaseApp | null;
    db: Firestore | null;
    auth: Auth | null;
    isEnterprise: boolean;
    tenantId?: string;
}

const PlatformAuthContext = createContext<AuthContextType>({
    app: null,
    db: null,
    auth: null,
    isEnterprise: false,
});

function normalizeDatabaseId(databaseId?: string | null): string | undefined {
    const trimmed = (databaseId || '').trim();
    if (!trimmed) return undefined;
    const lower = trimmed.toLowerCase();
    if (lower === 'default' || trimmed === '(default)') return undefined;
    return trimmed;
}

function initializeTenantApp(config: FirebaseOptions, appName: string): FirebaseApp | null {
    try {
        const existing = getApps().find(a => a.name === appName);
        if (existing) return existing;
        return initializeApp(config, appName);
    } catch {
        return null;
    }
}

function initializeTenantDb(app: FirebaseApp, databaseId?: string): Firestore {
    const normalized = normalizeDatabaseId(databaseId);
    if (normalized) {
        try {
            return getFirestore(app, normalized);
        } catch {
            return getFirestore(app);
        }
    }
    return getFirestore(app);
}

export function PlatformAuthProvider({
    children,
    defaultApp,
    defaultDb,
    defaultAuth
}: {
    children: ReactNode;
    defaultApp: FirebaseApp | null;
    defaultDb: Firestore | null;
    defaultAuth: Auth | null;
}) {
    const [contextValue, setContextValue] = useState<AuthContextType>({
        app: defaultApp,
        db: defaultDb,
        auth: defaultAuth,
        isEnterprise: false,
    });

    const branding = usePgBranding();
    const currentUser = useAppSelector((state) => state.user.currentUser);

    const resolveTenantContext = () => {
        const enterpriseProject = currentUser?.subscription?.enterpriseProject;
        
        let tenantApp = null;
        let tenantDb = null;
        let tenantAuth = null;
        let foundEnterprise = false;

        if (enterpriseProject?.clientConfig) {
            const appName = `tenant-${enterpriseProject.projectId}`;
            tenantApp = initializeTenantApp(enterpriseProject.clientConfig, appName);
            if (tenantApp) {
                tenantDb = initializeTenantDb(tenantApp, enterpriseProject.databaseId);
                tenantAuth = getAuth(tenantApp);
                foundEnterprise = true;
            }
        } 
        
        if (!foundEnterprise) {
            const existingTenantApp = getApps().find(a => a.name === 'tenant-login-instance' || a.name.startsWith('tenant-'));
            if (existingTenantApp) {
                tenantApp = existingTenantApp;
                
                const currentActiveDb = getActiveDb();
                if (currentActiveDb && currentActiveDb.app === tenantApp) {
                    tenantDb = currentActiveDb;
                } else {
                    try {
                        tenantDb = getFirestore(tenantApp);
                    } catch {
                        tenantDb = defaultDb;
                    }
                }
                tenantAuth = getAuth(tenantApp);
                foundEnterprise = true;
            }
        }

        if (foundEnterprise && tenantApp && tenantAuth && tenantDb) {
            const activeAuth = currentUser?.role === 'owner' ? defaultAuth : tenantAuth;

            setContextValue({
                app: tenantApp,
                db: tenantDb,
                auth: activeAuth,
                isEnterprise: true,
                tenantId: currentUser?.ownerId
            });
            setActiveTenantContext(activeAuth, tenantDb);
            return;
        }
        
        setContextValue({
            app: defaultApp,
            db: defaultDb,
            auth: defaultAuth,
            isEnterprise: false,
            tenantId: branding?.subdomain ? 'resolved-on-server' : undefined 
        });
        setActiveTenantContext(defaultAuth, defaultDb);
    };

    useEffect(() => {
        resolveTenantContext();
    }, [currentUser, branding, defaultApp, defaultDb, defaultAuth]);

    useEffect(() => {
        const handleTenantAppReady = () => {
            console.log('[PlatformAuthContext] tenant-app-ready event received. Re-resolving context...');
            resolveTenantContext();
        };
        window.addEventListener('tenant-app-ready', handleTenantAppReady);
        return () => window.removeEventListener('tenant-app-ready', handleTenantAppReady);
    }, [currentUser, defaultApp, defaultDb, defaultAuth]);

    return (
        <PlatformAuthContext.Provider value={contextValue}>
            {children}
        </PlatformAuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(PlatformAuthContext);
}
