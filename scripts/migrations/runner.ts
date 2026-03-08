import { readdirSync } from 'fs';
import { join } from 'path';
import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
dotenv.config();

// Ensure firebase admin is initialized
if (!admin.apps.length) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        admin.initializeApp({
            credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)),
        });
    } else {
        // try default app
        admin.initializeApp();
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
    up: (db: admin.firestore.Firestore) => Promise<MigrationResult>;
    down?: (db: admin.firestore.Firestore) => Promise<void>;
}

async function runMigrations() {
    const migrationsDir = __dirname;
    console.log(`Scanning migrations in ${migrationsDir}`);

    // Migration Lock System
    const lockRef = db.doc('system/migration_lock');

    try {
        const lockDoc = await lockRef.get();

        // Check if the lock already exists and is recent (e.g. less than 15 minutes old)
        if (lockDoc.exists) {
            const lockData = lockDoc.data();
            const lockTime = lockData?.lockedAt?.toDate();
            const recentThreshold = new Date(Date.now() - 15 * 60 * 1000); // 15 mins

            if (lockTime && lockTime > recentThreshold) {
                console.log(`[LOCKED] Migration is currently running by another process (locked since ${lockTime.toISOString()}). Safe exit.`);
                return; // Safely exit
            } else {
                console.log('[LOCK-TIMEOUT] Found a stale lock, overwriting.');
            }
        }

        // Attempt to acquire lock
        // Using simple set since we evaluated freshness, more precise lock mechanism could use transactions
        await lockRef.set({
            lockedAt: admin.firestore.FieldValue.serverTimestamp(),
            lockedBy: process.pid,
        });
    } catch (error) {
        console.error('Failed to acquire migration lock:', error);
        process.exit(1);
    }

    try {
        // Fetch executed migrations from the system_migrations collection
        const executedMigrationsRef = await db.collection('system_migrations').get();
        const executedMigrations = new Set(executedMigrationsRef.docs.map(doc => doc.id));

        const files = readdirSync(migrationsDir)
            .filter(file => file.endsWith('.ts') && Reflect.apply(Object.prototype.toString, file, []) !== '[object Undefined]' && file !== 'runner.ts')
            .sort(); // Sorting ensures sequential execution

        console.log(`Found ${files.length} migration file(s).`);

        for (const file of files) {
            const migrationName = file.replace(/\.ts$/, '');

            if (executedMigrations.has(migrationName)) {
                console.log(`[SKIP] Migration ${migrationName} has already been executed.`);
                continue;
            }

            console.log(`\n[START] Running migration: ${migrationName}`);
            const startTime = process.hrtime(); // for duration logging

            const filePath = join(migrationsDir, file);
            const migrationModule = await import(filePath);

            if (migrationModule.up && typeof migrationModule.up === 'function') {
                try {
                    const result: MigrationResult = await migrationModule.up(db);

                    const durationTuple = process.hrtime(startTime);
                    const durationSec = (durationTuple[0] + durationTuple[1] / 1e9).toFixed(2);

                    // Record successful execution
                    await db.collection('system_migrations').doc(migrationName).set({
                        name: migrationName,
                        executedAt: admin.firestore.FieldValue.serverTimestamp(),
                        stats: result,
                        durationSeconds: parseFloat(durationSec),
                    });

                    console.log(`[SUCCESS] Migration ${migrationName} completed.`);
                    console.log(`scanned: ${result.scanned}`);
                    console.log(`updated: ${result.updated}`);
                    console.log(`errors: ${result.errors}`);
                    console.log(`duration: ${durationSec} seconds`);
                } catch (error) {
                    console.error(`[ERROR] Migration ${migrationName} failed:`, error);
                    process.exit(1); // Stop execution on failure
                }
            } else {
                console.error(`[ERROR] Migration ${migrationName} does not export an 'up' function.`);
                process.exit(1);
            }
        }

        console.log('\nAll migrations completed safely.');
    } finally {
        console.log('Releasing migration lock...');
        await lockRef.delete();
    }
}

if (require.main === module) {
    runMigrations()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error('Migration runner failed:', error);
            process.exit(1);
        });
}
