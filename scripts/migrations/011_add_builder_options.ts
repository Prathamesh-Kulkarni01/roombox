import * as admin from 'firebase-admin';

export const targetVersion = 11;
export const collection = 'sites';

/**
 * Migration 011: Add Builder Options
 * 
 * Ensures all sites documents have schemaVersion 11 and default styling options.
 */
export async function up(db: admin.firestore.Firestore, isDryRun: boolean = false) {
    const sitesSnapshot = await db.collection('sites').get();
    
    let scanned = 0;
    let updated = 0;
    let errors = 0;
    const now = new Date();
    
    for (const doc of sitesSnapshot.docs) {
        scanned++;
        try {
            const siteData = doc.data();
            
            // Only update if schema version is less than 11
            if ((siteData.schemaVersion || 0) >= targetVersion) {
                continue;
            }

            const updates: Record<string, any> = {
                schemaVersion: targetVersion,
                updatedAt: now.getTime()
            };

            if (!siteData.websiteStyle) {
                updates.websiteStyle = 'classic';
            }
            if (!siteData.pwaShortName) {
                updates.pwaShortName = siteData.siteTitle ? siteData.siteTitle.slice(0, 12) : 'RentSutra';
            }
            if (!siteData.pwaBackgroundColor) {
                updates.pwaBackgroundColor = '#ffffff';
            }

            if (!isDryRun) {
                await doc.ref.update(updates);
            }
            updated++;
        } catch (error: any) {
            errors++;
            console.error(`  ❌ Failed to migrate site ${doc.id}:`, error.message);
        }
    }
    
    return { scanned, updated, errors };
}
