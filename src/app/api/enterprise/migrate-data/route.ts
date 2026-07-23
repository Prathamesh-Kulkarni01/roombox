import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedOwnerId } from '@/lib/auth-server';
import { getAdminDb, selectOwnerDataAdminDb } from '@/lib/firebaseAdmin';
import { unauthorized, serverError, badRequest } from '@/lib/api/apiError';

const SUBCOLLECTIONS = [
  'pgs',
  'guests',
  'staff',
  'complaints',
  'ledger',
  'daily_attendance_summary',
  'utrs',
  'meter_readings',
  'staff_advances',
  'staff_payrolls',
  'refund_records'
];

export async function POST(req: NextRequest) {
  const { ownerId, error: authError } = await getVerifiedOwnerId(req);
  if (!ownerId) return unauthorized(authError);

  try {
    const body = await req.json().catch(() => ({}));
    const { action = 'sync' } = body;

    // CRITICAL: Source must ALWAYS be the central DB, not resolveTenant().
    // Once an enterprise DB is connected, resolveTenant() returns the custom DB,
    // which means source === target and nothing gets migrated.
    const centralDb = await getAdminDb();
    const targetDb = await selectOwnerDataAdminDb(ownerId);

    // Validate enterprise is configured by reading from the central DB
    const userDoc = await centralDb.collection('users').doc(ownerId).get();
    const enterprise = userDoc.data()?.subscription?.enterpriseProject;
    
    if (!enterprise || !enterprise.projectId) {
      return badRequest('No active enterprise database configured.');
    }

    if (action === 'check') {
      const comparison: Record<string, { sourceCount: number; targetCount: number; status: 'SYNCED' | 'OUT_OF_SYNC' | 'EMPTY' }> = {};
      
      // 1. Check Subcollections
      for (const col of SUBCOLLECTIONS) {
        const sourceSnap = await centralDb.collection('users_data').doc(ownerId).collection(col).get();
        const targetSnap = await targetDb.collection('users_data').doc(ownerId).collection(col).get();
        const sourceCount = sourceSnap.size;
        const targetCount = targetSnap.size;

        let status: 'SYNCED' | 'OUT_OF_SYNC' | 'EMPTY' = 'SYNCED';
        if (sourceCount === 0 && targetCount === 0) status = 'EMPTY';
        else if (sourceCount !== targetCount) status = 'OUT_OF_SYNC';
        comparison[col] = { sourceCount, targetCount, status };
      }

      // 2. Check Top-Level single documents (pwa_configs)
      const topLevelDocs = ['pwa_configs'];
      for (const col of topLevelDocs) {
        const sourceDoc = await centralDb.collection(col).doc(ownerId).get();
        const targetDoc = await targetDb.collection(col).doc(ownerId).get();
        const sourceCount = sourceDoc.exists ? 1 : 0;
        const targetCount = targetDoc.exists ? 1 : 0;
        
        let status: 'SYNCED' | 'OUT_OF_SYNC' | 'EMPTY' = 'SYNCED';
        if (sourceCount === 0 && targetCount === 0) status = 'EMPTY';
        else if (sourceCount !== targetCount) status = 'OUT_OF_SYNC';
        comparison[col] = { sourceCount, targetCount, status };
      }

      // 3. Check sites — query by ownerId field directly
      const sitesSourceSnap = await centralDb.collection('sites').where('ownerId', '==', ownerId).get();
      const sitesTargetSnap = await targetDb.collection('sites').where('ownerId', '==', ownerId).get();
      comparison['sites'] = {
        sourceCount: sitesSourceSnap.size,
        targetCount: sitesTargetSnap.size,
        status: (sitesSourceSnap.size === 0 && sitesTargetSnap.size === 0) ? 'EMPTY' : (sitesSourceSnap.size === sitesTargetSnap.size ? 'SYNCED' : 'OUT_OF_SYNC')
      };

      const magicSourceSnap = await centralDb.collection('magic_links').where('ownerId', '==', ownerId).get();
      const magicTargetSnap = await targetDb.collection('magic_links').where('ownerId', '==', ownerId).get();
      comparison['magic_links'] = {
        sourceCount: magicSourceSnap.size,
        targetCount: magicTargetSnap.size,
        status: (magicSourceSnap.size === 0 && magicTargetSnap.size === 0) ? 'EMPTY' : (magicSourceSnap.size === magicTargetSnap.size ? 'SYNCED' : 'OUT_OF_SYNC')
      };

      return NextResponse.json({ success: true, comparison });
    }

    // Default: 'sync' action
    const results: Record<string, { copied: number; errors: number; logs: string[] }> = {};

    // 1. Sync Subcollections
    for (const col of SUBCOLLECTIONS) {
      results[col] = { copied: 0, errors: 0, logs: [] };
      const sourceSnap = await centralDb.collection('users_data').doc(ownerId).collection(col).get();

      if (sourceSnap.empty) {
        results[col].logs.push(`No source records found for collection ${col}`);
        continue;
      }

      for (const doc of sourceSnap.docs) {
        try {
          const data = doc.data();
          if (data.schemaVersion === undefined || data.schemaVersion < 2) data.schemaVersion = 2;
          if (col === 'guests') {
            data.deposit = data.deposit ?? 0;
            data.status = data.status ?? 'active';
          }
          await targetDb.collection('users_data').doc(ownerId).collection(col).doc(doc.id).set(data, { merge: true });
          results[col].copied++;
          results[col].logs.push(`Synced document: ${doc.id}`);
        } catch (err: any) {
          results[col].errors++;
          results[col].logs.push(`Failed to sync ${doc.id}: ${err.message}`);
        }
      }
    }

    // 2. Sync Top-Level single documents
    const topLevelDocs = ['pwa_configs'];
    for (const col of topLevelDocs) {
      results[col] = { copied: 0, errors: 0, logs: [] };
      try {
        const sourceDoc = await centralDb.collection(col).doc(ownerId).get();
        if (sourceDoc.exists) {
          await targetDb.collection(col).doc(ownerId).set(sourceDoc.data()!, { merge: true });
          results[col].copied++;
          results[col].logs.push(`Synced owner doc for ${col}`);
        } else {
          results[col].logs.push(`No source doc found for ${col}`);
        }
      } catch (err: any) {
        results[col].errors++;
        results[col].logs.push(`Failed to sync ${col}: ${err.message}`);
      }
    }

    // 3. Sync Sites — query by ownerId field directly
    results['sites'] = { copied: 0, errors: 0, logs: [] };
    try {
      const sitesSnap = await centralDb.collection('sites').where('ownerId', '==', ownerId).get();
      if (!sitesSnap.empty) {
        for (const doc of sitesSnap.docs) {
          await targetDb.collection('sites').doc(doc.id).set(doc.data()!, { merge: true });
          results['sites'].copied++;
          results['sites'].logs.push(`Synced site config for ${doc.id}`);
        }
      } else {
        results['sites'].logs.push('No site configs found for owner');
      }
    } catch (err: any) {
      results['sites'].errors++;
      results['sites'].logs.push(`Failed to sync sites: ${err.message}`);
    }

    // 4. Sync Magic Links
    results['magic_links'] = { copied: 0, errors: 0, logs: [] };
    try {
      const magicSnap = await centralDb.collection('magic_links').where('ownerId', '==', ownerId).get();
      if (!magicSnap.empty) {
        for (const doc of magicSnap.docs) {
          await targetDb.collection('magic_links').doc(doc.id).set(doc.data()!, { merge: true });
          results['magic_links'].copied++;
        }
        results['magic_links'].logs.push(`Synced ${magicSnap.size} magic links`);
      } else {
        results['magic_links'].logs.push(`No magic links found`);
      }
    } catch (err: any) {
      results['magic_links'].errors++;
      results['magic_links'].logs.push(`Failed to sync magic links: ${err.message}`);
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    return serverError(error, 'POST /api/enterprise/migrate-data');
  }
}
