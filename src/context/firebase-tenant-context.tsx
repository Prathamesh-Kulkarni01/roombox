'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { initializeApp, getApps, FirebaseApp, FirebaseOptions } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { usePgBranding } from './branding-context';
import { useAppSelector } from '@/lib/hooks';
import { setActiveTenantContext, getActiveDb } from '@/lib/firebase';

interface FirebaseTenantContextType {
    app: FirebaseApp | null;
    db: Firestore | null;
    auth: Auth | null;
    isEnterprise: boolean;
    tenantId?: string;
}

const FirebaseTenantContext = createContext<FirebaseTenantContextType>({
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

export function FirebaseTenantProvider({
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
    const [contextValue, setContextValue] = useState<FirebaseTenantContextType>({
        app: defaultApp,
        db: defaultDb,
        auth: defaultAuth,
        isEnterprise: false,
    });

    const branding = usePgBranding();
    const currentUser = useAppSelector((state) => state.user.currentUser);

    useEffect(() => {
        // 1. Resolve from Tenant Registry (passed down via branding context or explicit fetch)
        // For now, branding object doesn't have firebaseConfig directly, but in V2 it should.
        // Let's assume we can fetch it or it's attached.
        // If not, we fallback to currentUser state for backward compatibility during migration.
        
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
        
        // Fallback for sharded tenants: their user object doesn't have the subscription 
        // because it lives in the central DB, but StoreProvider already initialized tenant-login-instance
        if (!foundEnterprise) {
            const existingTenantApp = getApps().find(a => a.name === 'tenant-login-instance' || a.name.startsWith('tenant-'));
            if (existingTenantApp) {
                tenantApp = existingTenantApp;
                
                // Check if StoreProvider already set up the correct activeDb (which handles custom databaseIds)
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
        
        // Default central fallback
        setContextValue({
            app: defaultApp,
            db: defaultDb,
            auth: defaultAuth,
            isEnterprise: false,
            tenantId: branding?.subdomain ? 'resolved-on-server' : undefined 
        });
        setActiveTenantContext(defaultAuth, defaultDb);

    }, [currentUser, branding, defaultApp, defaultDb, defaultAuth]);

    return (
        <FirebaseTenantContext.Provider value={contextValue}>
            {children}
        </FirebaseTenantContext.Provider>
    );
}

export function useFirebaseTenant() {
    return useContext(FirebaseTenantContext);
}
