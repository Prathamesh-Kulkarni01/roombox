'use server';

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { randomUUID } from 'crypto';

import { FirestoreJobQueue } from '@/lib/queue/FirestoreJobQueue';

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

        const baseAppUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://rentsutra.in';
        let jobsEnqueued = 0;
        const jobQueue = new FirestoreJobQueue();
        const enqueuePromises: Promise<void>[] = [];

        // 3. Iterate and enqueue jobs for enterprise tenants
        for (const userDoc of usersSnapshot.docs) {
            const userData = userDoc.data();
            const enterpriseProject = userData.subscription?.enterpriseProject;
            
            if (!enterpriseProject) continue;

            let targetDomain = '';
            
            // Prefer custom domain, fallback to subdomain
            if (enterpriseProject.customDomain) {
                targetDomain = `https://${enterpriseProject.customDomain}`;
            } else if (enterpriseProject.clientConfig?.subdomain) {
                const parsedBase = new URL(baseAppUrl);
                targetDomain = `https://${enterpriseProject.clientConfig.subdomain}.${parsedBase.hostname}`;
            } else {
                console.warn(`[Hub-Trigger] Enterprise owner ${userDoc.id} has no domain configured. Skipping.`);
                continue;
            }

            // In local development, override domain mapping if testing locally
            if (process.env.NODE_ENV !== 'production' && targetDomain.includes('rentsutra.in')) {
                // If local dev, we might be hitting localhost. Just skip or log.
                console.log(`[Hub-Trigger] Local dev: Would enqueue job for ${targetDomain}`);
                continue;
            }

            const jobId = randomUUID();
            
            enqueuePromises.push(jobQueue.enqueue({
                jobId,
                type: 'run-scheduled-jobs',
                targetDomain,
                ownerId: userDoc.id
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
