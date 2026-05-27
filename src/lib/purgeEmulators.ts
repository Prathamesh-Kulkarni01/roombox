/**
 * Purges local Firebase emulator environment variables if a live production
 * project is being targeted, preventing gRPC / Firebase SDK from hijacking connection.
 */
const fbProjectIdForPurge = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const isEmulatorForPurge = (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST) && 
                           (fbProjectIdForPurge === 'roombox-test' || process.env.NEXT_PUBLIC_USE_EMULATOR === 'true');

if (!isEmulatorForPurge && (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST)) {
    if (process.env.NODE_ENV === 'development') {
        console.log('[PurgeEmulators] Live project detected; purging emulator hosts from process environment.');
    }
    delete process.env.FIRESTORE_EMULATOR_HOST;
    delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
    delete process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST;
    delete process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST;
}
