export type AuthMode = 'CENTRAL' | 'TENANT';

export interface FirebaseConfig {
    projectId: string;
    apiKey: string;
    authDomain?: string;
    storageBucket?: string;
    messagingSenderId?: string;
    appId?: string;
    measurementId?: string;
    databaseId?: string; // Optional, defaults to '(default)'
}

export interface TenantMetadata {
    ownerId: string;
    subdomain: string | null;
    authMode: AuthMode;
    status: 'active' | 'suspended' | 'trial';
    firebaseConfig: FirebaseConfig | null;
    plan: string;
    branding: any | null;
    features: Record<string, boolean>;
    oauthTokens?: string; // Encrypted tokens for admin access (internal use only)
}
