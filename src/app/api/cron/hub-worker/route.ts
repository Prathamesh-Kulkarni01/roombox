'use server';

import { NextRequest, NextResponse } from 'next/server';
import { FirestoreJobQueue } from '@/lib/queue/FirestoreJobQueue';
import { signPayload, SignedPayload } from '@/lib/cryptoUtils';
import { getCronSecret, isCronAuthorized, unauthorizedCronResponse } from '@/lib/cron/auth';

export async function GET(request: NextRequest) {
  try {
    if (!isCronAuthorized(request)) {
      return unauthorizedCronResponse();
    }

    const secret = getCronSecret();
    if (!secret) {
      return NextResponse.json(
        { success: false, error: 'CRON_SECRET is not configured' },
        { status: 500 }
      );
    }

    const jobQueue = new FirestoreJobQueue();
    const jobs = await jobQueue.dequeue(50);

    if (jobs.length === 0) {
      return NextResponse.json({ success: true, message: 'No pending jobs.' });
    }

    const triggerPromises: Promise<any>[] = [];
    
    for (const job of jobs) {
      const { jobId, type, targetDomain, ownerId } = job.payload;
      const targetUrl = `${targetDomain}/api/internal/jobs`;
      
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);
      
      const payload: Omit<SignedPayload, 'signature'> = {
        jobId,
        version: 1,
        issuedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        tenantId: ownerId,
        type
      };
      
      const signature = signPayload(payload, secret);
      const signedPayload = { ...payload, signature };

      console.log(`[Hub-Worker] Dispatching signed job ${jobId} to ${targetUrl}`);

      const fetchPromise = fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(signedPayload)
      }).then(async (res) => {
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          console.error(`[Hub-Worker] Job ${jobId} failed: ${res.status} ${res.statusText} - ${text}`);
          await jobQueue.fail(job.id, `${res.status} ${res.statusText}`);
        } else {
          console.log(`[Hub-Worker] Job ${jobId} completed successfully`);
          await jobQueue.complete(job.id);
        }
      }).catch(async (err) => {
        console.error(`[Hub-Worker] Error dispatching job ${jobId}`, err.message);
        await jobQueue.fail(job.id, err.message);
      });

      triggerPromises.push(fetchPromise);
    }

    await Promise.allSettled(triggerPromises);

    return NextResponse.json({ 
      success: true, 
      message: `Processed ${triggerPromises.length} tenant cron jobs.` 
    });

  } catch (error: any) {
    console.error('[Hub-Worker] Fatal error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
