'use server';

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { randomUUID } from 'crypto';
import { FirestoreJobQueue } from '@/lib/queue/FirestoreJobQueue';
import { filterDispatchableEnterpriseOwners } from '@/lib/cron/enterprise-utils';
import { isCronAuthorized, unauthorizedCronResponse } from '@/lib/cron/auth';

export async function GET(request: NextRequest) {
  try {
    if (!isCronAuthorized(request)) {
      return unauthorizedCronResponse();
    }

    const adminDb = await getAdminDb();
    
    const usersSnapshot = await adminDb.collection('users')
      .where('role', '==', 'owner')
      .where('subscription.planId', '==', 'enterprise')
      .get();

    let jobsEnqueued = 0;
    const jobQueue = new FirestoreJobQueue();
    const enqueuePromises: Promise<void>[] = [];

    const ownerEntries = usersSnapshot.docs.map((userDoc) => ({
      id: userDoc.id,
      data: userDoc.data() as Record<string, unknown>,
    }));

    for (const owner of await filterDispatchableEnterpriseOwners(ownerEntries)) {
      const jobId = randomUUID();

      enqueuePromises.push(jobQueue.enqueue({
        jobId,
        type: 'run-scheduled-jobs',
        targetDomain: owner.targetDomain,
        ownerId: owner.id,
      }));

      jobsEnqueued++;
    }

    await Promise.allSettled(enqueuePromises);

    return NextResponse.json({ 
      success: true, 
      message: `Enqueued ${jobsEnqueued} tenant cron jobs using JobQueue.` 
    });

  } catch (error: any) {
    console.error('[Hub-Trigger] Fatal error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
