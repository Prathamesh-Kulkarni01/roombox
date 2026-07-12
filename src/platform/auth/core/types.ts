import type { Firestore } from 'firebase-admin/firestore';
import type { Auth } from 'firebase-admin/auth';

export interface TenantContext {
    db: Firestore;
    auth: Auth;
    isEnterprise: boolean;
    tenantId?: string; // ownerId
    projectId?: string;
    databaseId?: string;
}

export interface CustomClaims {
    role: string;
    guestId?: string;
    staffId?: string;
    ownerId?: string;
    pgId?: string;
    permissions?: any[];
    pgs?: string[];
}

export interface AuthSession {
    uid: string;
    claims: CustomClaims;
}
