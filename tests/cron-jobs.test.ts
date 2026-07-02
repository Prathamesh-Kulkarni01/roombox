import { describe, expect, it } from 'vitest';
import { auditCronJobs } from '../scripts/verify-cron-jobs';
import { categorizeOwners, dispatchEnterpriseMaintenance } from '../src/lib/cron/maintenance';

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
    ] as any[]);

    expect(result.standard).toEqual(['standard-owner']);
    expect(result.enterprise).toEqual(['enterprise-owner']);
  });

  it('creates tenant-dispatch payloads for enterprise owners without touching their DB directly', async () => {
    const payloads = await dispatchEnterpriseMaintenance([
      { id: 'enterprise-owner', data: { subscription: { planId: 'enterprise' } } },
    ] as any[], {
      targetDomain: 'https://tenant.example.com',
    });

    expect(payloads).toHaveLength(1);
    expect(payloads[0]).toMatchObject({
      type: 'run-scheduled-jobs',
      tenantId: 'enterprise-owner',
      targetDomain: 'https://tenant.example.com',
    });
  });
});
