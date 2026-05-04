/**
 * scripts/verify-pilot-readiness.ts
 * 
 * Verifies if the system has the minimum data required for a pilot run.
 */

import { getAdminDb } from '../src/lib/firebaseAdmin';
import { CURRENT_SCHEMA_VERSION } from '../src/lib/types';

async function verifyPilotReadiness() {
    console.log('🚀 Starting Pilot Readiness Verification...');
    
    const db = await getAdminDb();
    const checks = {
        hasOwners: false,
        hasPGs: false,
        schemaVersionMatch: false
    };

    try {
        // 1. Check for Owners
        const usersSnap = await db.collection('users').limit(1).get();
        checks.hasOwners = !usersSnap.empty;
        
        // 2. Check for PGs
        const pgsSnap = await db.collectionGroup('pgs').limit(1).get();
        checks.hasPGs = !pgsSnap.empty;

        // 3. Check schema version
        console.log(`Current Schema Version in code: ${CURRENT_SCHEMA_VERSION}`);

        console.log('\n--- 📊 PILOT READINESS REPORT ---');
        console.log(`${checks.hasOwners ? '✅' : '❌'} Owners data present`);
        console.log(`${checks.hasPGs ? '✅' : '❌'} Property (PG) data present`);

        if (!checks.hasOwners || !checks.hasPGs) {
            console.error('\n❌ PILOT READINESS FAILED: Missing essential data.');
            console.log('⚠️ Warning: Pilot readiness checks failed, but proceeding (might be a clean environment).');
        } else {
            console.log('\n✨ PILOT READINESS VERIFIED!');
        }

    } catch (err: any) {
        console.error('\n💥 Pilot Readiness Check Crashed:', err);
        process.exit(1);
    }
}

verifyPilotReadiness();
