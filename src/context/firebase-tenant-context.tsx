'use client';
export * from '@/platform/auth/client/auth-context';

import { PlatformAuthProvider, useAuth } from '@/platform/auth/client/auth-context';

export const FirebaseTenantProvider = PlatformAuthProvider;
export const useFirebaseTenant = useAuth;
