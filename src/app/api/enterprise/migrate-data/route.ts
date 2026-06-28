import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedOwnerId } from '@/lib/auth-server';
import { resolveTenant } from '@/lib/tenantResolver';
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

    const { db: defaultDb } = await resolveTenant(req);
    const targetDb = await selectOwnerDataAdminDb(ownerId);

    const userDoc = await defaultDb.collection('users').doc(ownerId).get();
    const enterprise = userDoc.data()?.subscription?.enterpriseProject;
    
    if (!enterprise || !enterprise.projectId) {
      return badRequest('No active enterprise database configured.');
    }

    if (action === 'check') {
      const comparison: Record<string, { sourceCount: number; targetCount: number; status: 'SYNCED' | 'OUT_OF_SYNC' | 'EMPTY' }> = {};
      
      for (const col of SUBCOLLECTIONS) {
        const sourceSnap = await defaultDb
          .collection('users_data')
          .doc(ownerId)
          .collection(col)
          .get();

        const targetSnap = await targetDb
          .collection('users_data')
          .doc(ownerId)
          .collection(col)
          .get();

        const sourceCount = sourceSnap.size;
        const targetCount = targetSnap.size;

        let status: 'SYNCED' | 'OUT_OF_SYNC' | 'EMPTY' = 'SYNCED';
        if (sourceCount === 0 && targetCount === 0) {
          status = 'EMPTY';
        } else if (sourceCount !== targetCount) {
          status = 'OUT_OF_SYNC';
        }

        comparison[col] = { sourceCount, targetCount, status };
      }

      return NextResponse.json({ success: true, comparison });
    }

    // Default: 'sync' action
    const results: Record<string, { copied: number; errors: number; logs: string[] }> = {};

    for (const col of SUBCOLLECTIONS) {
      results[col] = { copied: 0, errors: 0, logs: [] };
      const sourceSnap = await defaultDb
        .collection('users_data')
        .doc(ownerId)
        .collection(col)
        .get();

      if (sourceSnap.empty) {
        results[col].logs.push(`No source records found for collection ${col}`);
        continue;
      }

      for (const doc of sourceSnap.docs) {
        try {
          const data = doc.data();
          // Ensure schemaVersion matches latest standard (e.g. 2)
          if (data.schemaVersion === undefined || data.schemaVersion < 2) {
            data.schemaVersion = 2; // Auto upgrade schema version during migration!
          }
          // Set default values safely as per global rules
          if (col === 'guests') {
            data.deposit = data.deposit ?? 0;
            data.status = data.status ?? 'active';
          }
          
          await targetDb
            .collection('users_data')
            .doc(ownerId)
            .collection(col)
            .doc(doc.id)
            .set(data, { merge: true });

          results[col].copied++;
          results[col].logs.push(`✅ [${col}] Synced document: ${doc.id}`);
        } catch (err: any) {
          results[col].errors++;
          results[col].logs.push(`❌ [${col}] Failed to sync document ${doc.id}: ${err.message || String(err)}`);
        }
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    return serverError(error, 'POST /api/enterprise/migrate-data');
  }
}
