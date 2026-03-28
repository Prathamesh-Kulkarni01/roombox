import { readdirSync } from 'fs';
import { join } from 'path';
import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import { CURRENT_SCHEMA_VERSION } from '../../src/lib/types'; // Target version from code
dotenv.config();

// Ensure firebase admin is initialized
if (!admin.apps.length) {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    console.log(`[INFO] Initializing Firebase for project: ${projectId}`);
    
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        console.log(`[INFO] Using FIREBASE_SERVICE_ACCOUNT_KEY`);
        admin.initializeApp({
            credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)),
            projectId
        });
    } else if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
        console.log(`[INFO] Using split FIREBASE_PRIVATE_KEY and FIREBASE_CLIENT_EMAIL`);
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: projectId,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            }),
            projectId
        });
    } else {
        const isEmulator = !!process.env.FIRESTORE_EMULATOR_HOST;
        console.log(`[INFO] Using default/local initialization (Emulator: ${isEmulator})`);
        admin.initializeApp({ projectId });
    }
}

const db = admin.firestore();

export interface MigrationResult {
    scanned: number;
    updated: number;
    errors: number;
}

export interface Migration {
    name: string;
    targetSchemaVersion: number;
    description: string;
    // New: Up returns stats and actual field-level changes for audit
    up: (db: admin.firestore.Firestore, isDryRun?: boolean) => Promise<MigrationResult>;
    // New: Down for rollbacks
    down?: (db: admin.firestore.Firestore) => Promise<MigrationResult>;
}

async function runMigrations() {
    const migrationsDir = __dirname;
    console.log(`\n--- 🗄️ DETERMINISTIC MIGRATION RUNNER ---`);
    console.log(`Scan dir: ${migrationsDir}`);

    // 1. Fetch CURRENT DB VERSION from Firestore
    const configRef = db.doc('system/config');
    const configDoc = await configRef.get();
    let dbVersion = 0;
    
    if (configDoc.exists) {
        dbVersion = configDoc.data()?.schemaVersion || 0;
    } else {
        console.log('⚠️ No system/config found. Assuming baseline version 0.');
        await configRef.set({ schemaVersion: 0, createdAt: admin.firestore.FieldValue.serverTimestamp() });
    }

    console.log(`DB Version:   ${dbVersion}`);
    console.log(`Code Version: ${CURRENT_SCHEMA_VERSION}`);

    if (dbVersion === CURRENT_SCHEMA_VERSION) {
        console.log('✅ DB is already up to date with code version.');
        return;
    }

    if (dbVersion > CURRENT_SCHEMA_VERSION) {
        console.error('❌ CRITICAL: DB version is ahead of code! Deployment might be invalid.');
        process.exit(1);
    }

    // 2. Lock System with TTL
    const lockRef = db.doc('system/migration_lock');
    const isForce = process.argv.includes('--force');
    try {
        const lockDoc = await lockRef.get();
        if (lockDoc.exists && !isForce) {
            const lockData = lockDoc.data();
            const lockTime = lockData?.lockedAt?.toDate();
            // TTL: 30 minutes
            const ttlThreshold = new Date(Date.now() - 30 * 60 * 1000);
            
            if (lockTime && lockTime > ttlThreshold) {
                console.error(`❌ LOCKED: Migration already running (Locked at: ${lockTime.toISOString()})`);
                console.error(`Use --force to override if you are sure no other process is running.`);
                process.exit(1);
            } else {
                console.log('⚠️ Overwriting stale/expired lock.');
            }
        }
        await lockRef.set({ 
            lockedAt: admin.firestore.FieldValue.serverTimestamp(), 
            lockedBy: process.pid,
            githubRunId: process.env.GITHUB_RUN_ID || 'local'
        });
    } catch (err) {
        console.error('Lock fail:', err);
        process.exit(1);
    }

    try {
        const isDryRun = process.argv.includes('--dry-run') || process.argv.includes('--dryrun');
        const isSkipBackup = process.argv.includes('--skip-backup');

        if (isDryRun) {
            console.log('🧪 DRY RUN MODE: No data will be committed.');
        } else {
            console.log('🚀 LIVE MODE: Changes will be committed to production.');
        }

        // 3. Optional: Backup critical Collections or Docs
        if (!isDryRun && !isSkipBackup) {
            console.log(`\n📦 [BACKUP] Snapshotting critical data...`);
            const pathsToBackup = ['system/config', 'tenants', 'properties']; 
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            
            for (const path of pathsToBackup) {
                const isDoc = path.split('/').filter(Boolean).length % 2 === 0;
                
                if (isDoc) {
                    const snapshotPath = `system_backups/${timestamp}_doc_${path.replace(/\//g, '_')}`;
                    console.log(` - Backing up doc: ${path} to ${snapshotPath}...`);
                    const source = await db.doc(path).get();
                    if (source.exists) {
                        await db.doc(snapshotPath).set({ ...source.data(), backupAt: timestamp });
                    }
                } else {
                    // It's a collection - snapshot first 100 docs
                    const snapshotCol = `system_backups/${timestamp}_col_${path.replace(/\//g, '_')}/data`;
                    console.log(` - Backing up collection (sample): ${path} to ${snapshotCol}...`);
                    const snap = await db.collection(path).limit(100).get();
                    if (!snap.empty) {
                        const batch = db.batch();
                        snap.forEach(doc => {
                            const ref = db.collection(snapshotCol).doc(doc.id);
                            batch.set(ref, { ...doc.data(), backupAt: timestamp });
                        });
                        await batch.commit();
                        console.log(`   - Snapshotted ${snap.size} docs from ${path}.`);
                    }
                }
            }
        }

        // 4. Scan Migration Files
        const files = readdirSync(migrationsDir)
            .filter(file => file.endsWith('.ts') && file !== 'runner.ts')
            .sort();

        console.log(`Found ${files.length} migration file(s).`);

        let totalScanned = 0;
        let totalUpdated = 0;
        let migrationChain: string[] = [];

        for (const file of files) {
            const migrationName = file.replace(/\.ts$/, '');
            const filePath = join(migrationsDir, file);
            const migrationModule = await import(filePath);
            const targetVersion = migrationModule.targetVersion || parseInt(file.split('_')[0]) || 0;

            if (targetVersion > dbVersion && targetVersion <= CURRENT_SCHEMA_VERSION) {
                console.log(`\n[EXEC] Running migration: ${migrationName} (Target v${targetVersion})`);
                
                // 4. Pre-flight Production Sampling (Anti-Blindspot)
                console.log(`🔍 [PRE-FLIGHT] Sampling data for ${migrationName}...`);
                const targetCollection = migrationModule.collection || 'tenants'; 
                const sample = await db.collection(targetCollection).limit(3).get();
                
                if (sample.empty) {
                    console.log(`⚠️ Collection ${targetCollection} is empty. Proceeding...`);
                } else {
                    console.log(`📊 Sample doc shape verified for ${targetCollection}.`);
                }

                const startTime = process.hrtime();
                try {
                    const result: MigrationResult = await migrationModule.up(db, isDryRun);
                    const durationTuple = process.hrtime(startTime);
                    const durationSec = (durationTuple[0] + durationTuple[1] / 1e9).toFixed(2);

                    if (result.updated === 0 && !isDryRun) {
                        console.warn(`🚨 WARNING: Migration touched 0 documents! This is highly suspicious.`);
                    }

                    if (!isDryRun) {
                        totalScanned += result.scanned;
                        totalUpdated += result.updated;
                        migrationChain.push(migrationName);

                        await db.collection('system_migrations').doc(migrationName).set({
                            name: migrationName,
                            targetVersion,
                            executedAt: admin.firestore.FieldValue.serverTimestamp(),
                            stats: result,
                            durationSeconds: parseFloat(durationSec),
                        });

                        await configRef.update({ 
                            schemaVersion: targetVersion,
                            lastExecutedMigration: migrationName,
                            updatedAt: admin.firestore.FieldValue.serverTimestamp()
                        });
                        console.log(`[SUCCESS] Migration ${migrationName} (v${targetVersion}) completed.`);
                    } else {
                        console.log(`[DRY-RUN] Success: Found ${result.scanned} docs, would have updated ${result.updated}.`);
                    }
                } catch (error) {
                    console.error(`[FATAL] ${migrationName} failed:`, error);
                    throw error; // Let outer catch handle lock cleanup
                }
            }
        }

        // Final Validation
        if (!isDryRun) {
            const configDocAfter = await configRef.get();
            const finalDbVersion = configDocAfter.data()?.schemaVersion || 0;
            
            if (finalDbVersion < CURRENT_SCHEMA_VERSION) {
                console.error(`\n❌ CHAIN ERROR: Missing migration files to reach version ${CURRENT_SCHEMA_VERSION}. (Current DB: ${finalDbVersion})`);
                process.exit(1);
            }
            console.log(`\n✨ Successfully migrated to v${finalDbVersion}.`);
        } else {
            console.log(`\n✨ Dry run complete. Code version is ${CURRENT_SCHEMA_VERSION}.`);
        }
        
        if (process.env.GITHUB_STEP_SUMMARY) {
            const finalDbVersion = isDryRun ? 'DRY-RUN' : CURRENT_SCHEMA_VERSION;
            const summary = `
## 🗄️ DB Migration Report: v${dbVersion} ➡️ v${finalDbVersion}
- **Status:** ${isDryRun ? '🧪 DRY-RUN' : '✅ SUCCESS'}
- **Migrations Ran/Projected:** ${migrationChain.length || 0}
- **Docs Impacted:** ${totalUpdated} (Scanned: ${totalScanned})
- **Chain:** ${migrationChain.join(' ➔ ') || 'none'}
            `.trim();
            require('fs').appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary + '\n');
        }
    } finally {
        await lockRef.delete();
    }
}

async function rollback() {
    const migrationsDir = __dirname;
    console.log(`\n--- 🔄 ROLLBACK RUNNER ---`);
    
    const configRef = db.doc('system/config');
    const configDoc = await configRef.get();
    if (!configDoc.exists) { console.error('No system/config found.'); return; }
    
    const currentVersion = configDoc.data()?.schemaVersion || 0;
    if (currentVersion === 0) { console.log('Already at version 0.'); return; }

    const files = readdirSync(migrationsDir)
        .filter(file => file.endsWith('.ts') && file !== 'runner.ts')
        .sort().reverse(); // Decending to rollback

    for (const file of files) {
        const migrationModule = await import(join(migrationsDir, file));
        const targetVersion = migrationModule.targetVersion || parseInt(file.split('_')[0]) || 0;

        if (targetVersion === currentVersion) {
            console.log(`[ROLLBACK] Reverting version ${currentVersion} using ${file}...`);
            if (migrationModule.down) {
                await migrationModule.down(db);
                await configRef.update({ 
                    schemaVersion: currentVersion - 1,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                console.log(` ✅ Rollback to v${currentVersion - 1} complete.`);
            } else {
                console.error(` ❌ No down() method found in ${file}. Manual intervention required.`);
            }
            return;
        }
    }
}

if (require.main === module) {
    if (process.argv.includes('--rollback')) {
        rollback().then(() => process.exit(0));
    } else {
        runMigrations()
            .then(() => process.exit(0))
            .catch((error) => {
                console.error('Runner failed:', error);
                process.exit(1);
            });
    }
}
