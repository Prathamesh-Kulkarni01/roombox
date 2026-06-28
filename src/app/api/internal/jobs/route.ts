'use server';

import { NextRequest, NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/tenantResolver';
import { verifyPayload, SignedPayload } from '@/lib/cryptoUtils';
import { TenantScheduler } from '@/lib/tenant/TenantScheduler';

export async function POST(request: NextRequest) {
    try {
        const secret = process.env.CRON_SECRET;
        
        if (process.env.NODE_ENV === 'production' && !secret) {
            console.error('[Tenant Dispatcher] CRON_SECRET is not configured on the server.');
            return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
        }

        // Parse the signed payload from the body
        const payload: SignedPayload = await request.json();

        // 1. Validate the HMAC signature and expiration
        if (process.env.NODE_ENV === 'production') {
            const isValid = verifyPayload(payload, secret!);
            if (!isValid) {
                return new Response('Unauthorized, Expired, or Tampered Payload', { status: 401 });
            }
        }

        // 2. Resolve Tenant dynamically based on the requested domain
        const { tenantId, isEnterprise, db } = await resolveTenant(request);

        if (!tenantId || !isEnterprise) {
            console.error('[Tenant Dispatcher] Failed to resolve enterprise tenant from request URL:', request.url);
            return NextResponse.json({ success: false, error: 'Not an enterprise tenant domain' }, { status: 400 });
        }
        
        // 3. Verify payload intended for this tenant
        if (payload.tenantId !== tenantId) {
            console.error(`[Tenant Dispatcher] Payload tenantId mismatch. Expected ${tenantId}, got ${payload.tenantId}`);
            return NextResponse.json({ success: false, error: 'Tenant Mismatch' }, { status: 403 });
        }

        console.log(`[Tenant Dispatcher] Valid payload received for Enterprise Owner: ${tenantId}`);

        let results: any = null;

        // 4. Delegate to the TenantScheduler based on job type
        if (payload.type === 'run-scheduled-jobs') {
            if (!db) {
                throw new Error("Resolved tenant database is missing.");
            }
            const scheduler = new TenantScheduler(tenantId, db, new Date(payload.issuedAt));
            results = await scheduler.runAllScheduledJobs(payload.jobId);
        } else {
            console.warn(`[Tenant Dispatcher] Unknown job type: ${payload.type}`);
            return NextResponse.json({ success: false, error: 'Unknown job type' }, { status: 400 });
        }

        return NextResponse.json({ 
            success: true, 
            message: 'Tenant cron jobs completed successfully',
            jobId: payload.jobId,
            results
        });

    } catch (error: any) {
        console.error('[Tenant Dispatcher] Fatal error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
