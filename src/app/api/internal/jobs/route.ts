

import { NextRequest, NextResponse, after } from 'next/server';
import { resolveTenant } from '@/platform/auth/server/tenant-resolver';
import { verifyPayload, SignedPayload } from '@/lib/cryptoUtils';
import { TenantScheduler } from '@/lib/tenant/TenantScheduler';
import { getCronSecret } from '@/lib/cron/auth';

export const maxDuration = 300; // Allow 5 minutes for processing up to 10,000+ tenants in the background

export async function POST(request: NextRequest) {
    try {
        const secret = getCronSecret();
        
        if (process.env.NODE_ENV === 'production' && !secret) {
            console.error('[Tenant Dispatcher] CRON_SECRET is not configured on the server.');
            return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
        }

        const payload: SignedPayload = await request.json();

        if (secret) {
            const isValid = verifyPayload(payload, secret);
            if (!isValid) {
                return new Response('Unauthorized, Expired, or Tampered Payload', { status: 401 });
            }
        } else if (process.env.NODE_ENV === 'production') {
            return new Response('Unauthorized', { status: 401 });
        }

        // 2. Resolve Tenant dynamically based on the requested domain
        const { tenantId, isEnterprise, db } = await resolveTenant(request);

        if (!tenantId) {
            console.error('[Tenant Dispatcher] Failed to resolve tenant from request URL:', request.url);
            return NextResponse.json({ success: false, error: 'Could not resolve tenant' }, { status: 400 });
        }
        
        // 3. Verify payload intended for this tenant
        if (payload.tenantId !== tenantId) {
            console.error(`[Tenant Dispatcher] Payload tenantId mismatch. Expected ${tenantId}, got ${payload.tenantId}`);
            return NextResponse.json({ success: false, error: 'Tenant Mismatch' }, { status: 403 });
        }

        console.log(`[Tenant Dispatcher] Valid payload received for Enterprise Owner: ${tenantId}`);

        // 4. Delegate to the TenantScheduler based on job type
        if (payload.type === 'run-scheduled-jobs') {
            if (!db) {
                throw new Error("Resolved tenant database is missing.");
            }
            after(async () => {
                try {
                    const scheduler = new TenantScheduler(tenantId, db, new Date(payload.issuedAt));
                    await scheduler.runAllScheduledJobs(payload.jobId);
                } catch (e) {
                    console.error(`[Tenant Dispatcher] Background job failed for ${tenantId}:`, e);
                }
            });
        } else {
            console.warn(`[Tenant Dispatcher] Unknown job type: ${payload.type}`);
            return NextResponse.json({ success: false, error: 'Unknown job type' }, { status: 400 });
        }

        return NextResponse.json({ 
            success: true, 
            message: 'Tenant cron jobs dispatched to background successfully',
            jobId: payload.jobId,
            results: 'Processing in background'
        }, { status: 202 });

    } catch (error: any) {
        console.error('[Tenant Dispatcher] Fatal error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
