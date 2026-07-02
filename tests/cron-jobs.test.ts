import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { auditCronJobs } from '../scripts/verify-cron-jobs';
import {
  categorizeOwners,
  dispatchEnterpriseMaintenance,
} from '../src/lib/cron/maintenance';
import { getCronSecret, isCronAuthorized } from '../src/lib/cron/auth';
import {
  filterDispatchableEnterpriseOwners,
  hasEnterpriseDataIsolation,
  resolveEnterpriseTargetDomain,
} from '../src/lib/cron/enterprise-utils';

describe('cron job audit', () => {
  it('keeps the core cron jobs active and flags the draft briefing flow', async () => {
    const report = await auditCronJobs();
    const jobs = new Map(report.jobs.map(job => [job.slug, job]));

    expect(jobs.get('send-rent-reminders')?.status).toBe('active');
    expect(jobs.get('reconcile-rent')?.status).toBe('active');
    expect(jobs.get('calculate-billing')?.status).toBe('active');
    expect(jobs.get('daily-briefing')?.status).toBe('needs-attention');
    expect(jobs.get('daily-briefing')?.issues.some(issue => issue.includes('mock'))).toBe(true);
    expect(jobs.get('hub-trigger')?.status).toBe('needs-attention');
    expect(jobs.get('hub-worker')?.status).toBe('needs-attention');
    expect(jobs.get('maintenance')?.status).toBe('active');
  });

  it('splits standard and isolated enterprise owners for the consolidated maintenance cron', () => {
    const result = categorizeOwners([
      { id: 'standard-owner', data: { subscription: { planId: 'free' } } },
      {
        id: 'enterprise-owner',
        data: {
          subscription: {
            planId: 'enterprise',
            enterpriseProject: { projectId: 'tenant-proj', serviceAccountJson: '{}' },
          },
        },
      },
      {
        id: 'enterprise-plan-only',
        data: { subscription: { planId: 'enterprise', enterpriseProject: { projectId: 'tenant-proj' } } },
      },
    ]);

    expect(result.standard).toEqual(['standard-owner', 'enterprise-plan-only']);
    expect(result.enterprise).toEqual(['enterprise-owner']);
  });

  it('requires isolated project credentials before enterprise dispatch', () => {
    expect(
      hasEnterpriseDataIsolation({
        subscription: {
          planId: 'enterprise',
          enterpriseProject: { projectId: 'tenant-proj', serviceAccountJson: '{}' },
        },
      })
    ).toBe(true);

    expect(
      hasEnterpriseDataIsolation({
        subscription: { planId: 'enterprise', enterpriseProject: { projectId: 'tenant-proj' } },
      })
    ).toBe(false);
  });

  it('resolves tenant domains for enterprise dispatch', () => {
    expect(
      resolveEnterpriseTargetDomain(
        { customDomain: 'pg.example.com' },
        'https://rentsutra.in'
      )
    ).toBe('https://pg.example.com');

    expect(
      resolveEnterpriseTargetDomain(
        { clientConfig: { subdomain: 'acme' } },
        'https://rentsutra.in'
      )
    ).toBe('https://acme.rentsutra.in');
  });

  it('filters dispatchable enterprise owners with credentials and domain', async () => {
    const dispatchable = await filterDispatchableEnterpriseOwners(
      [
        {
          id: 'ready-owner',
          data: {
            subscription: {
              planId: 'enterprise',
              enterpriseProject: {
                projectId: 'tenant-proj',
                serviceAccountJson: '{}',
                customDomain: 'pg.example.com',
              },
            },
          },
        },
        {
          id: 'missing-creds',
          data: {
            subscription: {
              planId: 'enterprise',
              enterpriseProject: { projectId: 'tenant-proj', customDomain: 'pg2.example.com' },
            },
          },
        },
      ],
      { allowProdDomainsInDev: true }
    );

    expect(dispatchable).toHaveLength(1);
    expect(dispatchable[0]).toMatchObject({
      id: 'ready-owner',
      targetDomain: 'https://pg.example.com',
    });
  });

  it('creates tenant-dispatch payloads per owner domain without central guest-data access', async () => {
    const { payloads } = await dispatchEnterpriseMaintenance([
      {
        id: 'enterprise-owner',
        data: { subscription: { planId: 'enterprise' } },
        targetDomain: 'https://tenant.example.com',
      },
    ]);

    expect(payloads).toHaveLength(1);
    expect(payloads[0]).toMatchObject({
      type: 'run-scheduled-jobs',
      tenantId: 'enterprise-owner',
      targetDomain: 'https://tenant.example.com',
    });
    expect(payloads[0].signedPayload.tenantId).toBe('enterprise-owner');
  });
});

describe('cron auth', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalCronSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('CRON_SECRET', 'r15bmwthar');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    process.env.NODE_ENV = originalNodeEnv;
    process.env.CRON_SECRET = originalCronSecret;
  });

  it('trims whitespace from CRON_SECRET', () => {
    vi.stubEnv('CRON_SECRET', '  r15bmwthar  ');
    expect(getCronSecret()).toBe('r15bmwthar');
  });

  it('accepts a matching bearer token in production', () => {
    const request = {
      headers: {
        get: (name: string) =>
          name === 'authorization' ? 'Bearer r15bmwthar' : null,
      },
    };

    expect(isCronAuthorized(request as unknown as import('next/server').NextRequest)).toBe(true);
  });

  it('rejects a missing or mismatched bearer token in production', () => {
    const missingAuth = {
      headers: { get: () => null },
    };
    const wrongToken = {
      headers: { get: () => 'Bearer wrong-secret' },
    };

    expect(isCronAuthorized(missingAuth as unknown as import('next/server').NextRequest)).toBe(false);
    expect(isCronAuthorized(wrongToken as unknown as import('next/server').NextRequest)).toBe(false);
  });

  it('rejects all requests in production when CRON_SECRET is missing', () => {
    vi.stubEnv('CRON_SECRET', '');
    const request = {
      headers: { get: () => 'Bearer anything' },
    };

    expect(getCronSecret()).toBeUndefined();
    expect(isCronAuthorized(request as unknown as import('next/server').NextRequest)).toBe(false);
  });
});
