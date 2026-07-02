import { describe, expect, it } from 'vitest';
import { auditCronJobs } from '../scripts/verify-cron-jobs';
import {
  categorizeOwners,
  dispatchEnterpriseMaintenance,
} from '../src/lib/cron/maintenance';
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
  });

  it('splits standard and enterprise owners for the consolidated maintenance cron', () => {
    const result = categorizeOwners([
      { id: 'standard-owner', data: { subscription: { planId: 'free' } } },
      { id: 'enterprise-owner', data: { subscription: { planId: 'enterprise' } } },
    ]);

    expect(result.standard).toEqual(['standard-owner']);
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

  it('filters dispatchable enterprise owners with credentials and domain', () => {
    const dispatchable = filterDispatchableEnterpriseOwners(
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
