'use server';

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { randomUUID } from 'crypto';

import { FirestoreJobQueue } from '@/lib/queue/FirestoreJobQueue';
import { filterDispatchableEnterpriseOwners } from '@/lib/cron/enterprise-utils';

export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization');
        const secret = process.env.CRON_SECRET;

        // 1. Validate Hub Auth (from cron-job.org)
        if (process.env.NODE_ENV === 'production' && (!secret || authHeader !== `Bearer ${secret}`)) {
            return new Response('Unauthorized Central Hub Request', { status: 401 });
        }

        const adminDb = await getAdminDb();
        
        // 2. Fetch all Enterprise Owners
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

        // 3. Enqueue only enterprise tenants with isolated DB credentials and a tenant domain
        for (const owner of filterDispatchableEnterpriseOwners(ownerEntries)) {
            const jobId = randomUUID();

            enqueuePromises.push(jobQueue.enqueue({
                jobId,
                type: 'run-scheduled-jobs',
                targetDomain: owner.targetDomain,
                ownerId: owner.id,
            }));

            jobsEnqueued++;
        }

        // Wait for all jobs to be enqueued
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
