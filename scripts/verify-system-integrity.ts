/**
 * scripts/verify-system-integrity.ts
 * 
 * Verifies the integrity of the system's data and logic.
 * Focuses on:
 * 1. Schema Versioning (Rule 2)
 * 2. Data Consistency (Rule 1)
 * 3. Migration Tracking (Rule 4)
 * 4. Orphan Detection
 */

import { getAdminDb } from '../src/lib/firebaseAdmin';
import { CURRENT_SCHEMA_VERSION } from '../src/lib/types';
import { Firestore } from 'firebase-admin/firestore';

async function verifyIntegrity() {
    console.log('🚀 Starting System Integrity Verification...');
    console.log(`Current Target Schema Version: ${CURRENT_SCHEMA_VERSION}`);

    const db = await getAdminDb();
    const results = {
        totalDocsChecked: 0,
        missingSchemaVersion: [] as string[],
        outdatedSchemaVersion: [] as string[],
        orphans: [] as string[],
        migrationRecords: 0,
        errors: [] as string[]
    };

    try {
        // 1. Check Migration Records
        const migrationsSnap = await db.collection('system_migrations').get();
        results.migrationRecords = migrationsSnap.size;
        console.log(`✅ Found ${results.migrationRecords} migration records in system_migrations.`);

        // 2. Scan Users
        console.log('Scanning users...');
        const usersSnap = await db.collection('users').get();
        for (const doc of usersSnap.docs) {
            results.totalDocsChecked++;
            const data = doc.data();
            const path = `users/${doc.id}`;
            
            if (data.schemaVersion === undefined) {
                results.missingSchemaVersion.push(path);
            } else if (data.schemaVersion < CURRENT_SCHEMA_VERSION) {
                results.outdatedSchemaVersion.push(`${path} (v${data.schemaVersion})`);
            }
        }

        // 3. Scan Users Data (PGs and Guests)
        console.log('Scanning pgs and guests...');
        const usersDataSnap = await db.collection('users_data').get();
        for (const ownerDoc of usersDataSnap.docs) {
            const ownerId = ownerDoc.id;
            
            // PGs
            const pgsSnap = await db.collection('users_data').doc(ownerId).collection('pgs').get();
            for (const pgDoc of pgsSnap.docs) {
                results.totalDocsChecked++;
                const data = pgDoc.data();
                const path = `users_data/${ownerId}/pgs/${pgDoc.id}`;
                
                if (data.schemaVersion === undefined) {
                    results.missingSchemaVersion.push(path);
                } else if (data.schemaVersion < CURRENT_SCHEMA_VERSION) {
                    results.outdatedSchemaVersion.push(`${path} (v${data.schemaVersion})`);
                }
            }

            // Guests
            const guestsSnap = await db.collection('users_data').doc(ownerId).collection('guests').get();
            for (const guestDoc of guestsSnap.docs) {
                results.totalDocsChecked++;
                const data = guestDoc.data();
                const path = `users_data/${ownerId}/guests/${guestDoc.id}`;
                
                if (data.schemaVersion === undefined) {
                    results.missingSchemaVersion.push(path);
                } else if (data.schemaVersion < CURRENT_SCHEMA_VERSION) {
                    results.outdatedSchemaVersion.push(`${path} (v${data.schemaVersion})`);
                }

                // Orphan check: guest's pgId must exist
                if (data.pgId) {
                    const pgRef = db.collection('users_data').doc(ownerId).collection('pgs').doc(data.pgId);
                    const pgSnap = await pgRef.get();
                    if (!pgSnap.exists) {
                        results.orphans.push(`${path} -> Missing PG: ${data.pgId}`);
                    }
                }
            }
        }

        // 4. Scan Complaints
        console.log('Scanning complaints...');
        const complaintsSnap = await db.collection('complaints').get();
        for (const doc of complaintsSnap.docs) {
            results.totalDocsChecked++;
            const data = doc.data();
            const path = `complaints/${doc.id}`;
            
            if (data.schemaVersion === undefined) {
                results.missingSchemaVersion.push(path);
            } else if (data.schemaVersion < CURRENT_SCHEMA_VERSION) {
                results.outdatedSchemaVersion.push(`${path} (v${data.schemaVersion})`);
            }
        }

        // Summary Report
        console.log('\n--- 📊 SYSTEM INTEGRITY REPORT ---');
        console.log(`Total Documents Scanned: ${results.totalDocsChecked}`);
        console.log(`Migration Records: ${results.migrationRecords}`);
        
        if (results.missingSchemaVersion.length > 0) {
            console.log(`❌ Missing schemaVersion: ${results.missingSchemaVersion.length}`);
            results.missingSchemaVersion.slice(0, 10).forEach(p => console.log(`   - ${p}`));
            if (results.missingSchemaVersion.length > 10) console.log(`   ... and ${results.missingSchemaVersion.length - 10} more`);
        } else {
            console.log('✅ All documents have schemaVersion field.');
        }

        if (results.outdatedSchemaVersion.length > 0) {
            console.log(`⚠️ Outdated schemaVersion (Target v${CURRENT_SCHEMA_VERSION}): ${results.outdatedSchemaVersion.length}`);
            results.outdatedSchemaVersion.slice(0, 10).forEach(p => console.log(`   - ${p}`));
            if (results.outdatedSchemaVersion.length > 10) console.log(`   ... and ${results.outdatedSchemaVersion.length - 10} more`);
        } else {
            console.log('✅ All documents are on current schema version.');
        }

        if (results.orphans.length > 0) {
            console.log(`❌ Orphans detected: ${results.orphans.length}`);
            results.orphans.slice(0, 10).forEach(p => console.log(`   - ${p}`));
        } else {
            console.log('✅ No orphan guest records detected.');
        }

        if (results.missingSchemaVersion.length > 0 || results.orphans.length > 0) {
            console.error('\n❌ INTEGRITY CHECK FAILED: Critical issues detected.');
            process.exit(1);
        } else {
            console.log('\n✨ SYSTEM INTEGRITY VERIFIED! All checks passed.');
        }

    } catch (err: any) {
        console.error('\n💥 Integrity Check Crashed:', err);
        process.exit(1);
    }
}

verifyIntegrity();
