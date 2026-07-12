export * from './core/types';
export * from './client/auth-context';
// Server components like tenant-resolver are usually imported directly from /server to avoid client bundling errors

// Legacy aliases for the bulk refactored imports
export { useAuth as useFirebaseTenant, PlatformAuthProvider as FirebaseTenantProvider } from './client/auth-context';
