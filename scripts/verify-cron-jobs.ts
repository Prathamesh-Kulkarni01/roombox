import fs from 'fs';
import path from 'path';

export type CronJobStatus = 'active' | 'needs-attention' | 'inactive';

export interface CronJobAuditResult {
  slug: string;
  description: string;
  routePath: string;
  status: CronJobStatus;
  issues: string[];
  evidence: string[];
}

export interface CronJobAuditReport {
  generatedAt: string;
  jobs: CronJobAuditResult[];
}

const repoRoot = path.resolve(__dirname, '..');

const cronJobs = [
  {
    slug: 'calculate-billing',
    description: 'Monthly billing computation',
    routePath: 'src/app/api/cron/calculate-billing/route.ts',
    expectedSignals: ['runMonthlyBillingCron', 'isCronAuthorized'],
  },
  {
    slug: 'reconcile-rent',
    description: 'Rent reconciliation and accounting sync',
    routePath: 'src/app/api/cron/reconcile-rent/route.ts',
    expectedSignals: ['reconcileAllGuests', 'isCronAuthorized'],
  },
  {
    slug: 'send-rent-reminders',
    description: 'Standard-owner reminder dispatch',
    routePath: 'src/app/api/cron/send-rent-reminders/route.ts',
    expectedSignals: ['sendRemindersForOwner', 'reconcileAllGuests', 'isCronAuthorized'],
  },
  {
    slug: 'daily-briefing',
    description: 'Daily WhatsApp briefing',
    routePath: 'src/app/api/cron/daily-briefing/route.ts',
    expectedSignals: ['sendWhatsAppMessage', 'isCronAuthorized'],
  },
  {
    slug: 'hub-trigger',
    description: 'Enterprise hub trigger for tenant cron jobs',
    routePath: 'src/app/api/cron/hub-trigger/route.ts',
    expectedSignals: ['FirestoreJobQueue', 'enqueue', 'isCronAuthorized'],
  },
  {
    slug: 'hub-worker',
    description: 'Enterprise hub worker dispatching signed jobs',
    routePath: 'src/app/api/cron/hub-worker/route.ts',
    expectedSignals: ['FirestoreJobQueue', 'dequeue', 'signPayload', 'isCronAuthorized'],
  },
  {
    slug: 'internal-jobs',
    description: 'Tenant dispatcher for signed enterprise jobs',
    routePath: 'src/app/api/internal/jobs/route.ts',
    expectedSignals: ['verifyPayload', 'TenantScheduler', 'resolveTenant', 'tenantId', 'getCronSecret'],
  },
  {
    slug: 'maintenance',
    description: 'Consolidated maintenance cron for standard and enterprise owners',
    routePath: 'src/app/api/cron/maintenance/route.ts',
    expectedSignals: ['runMaintenanceCron', 'isCronAuthorized'],
  },
] as const;

export async function auditCronJobs(): Promise<CronJobAuditReport> {
  const jobs = await Promise.all(
    cronJobs.map(async (job) => {
      const fullPath = path.join(repoRoot, job.routePath);
      const source = await fs.promises.readFile(fullPath, 'utf8');

      const issues: string[] = [];
      const evidence: string[] = [];

      for (const signal of job.expectedSignals) {
        if (source.includes(signal)) {
          evidence.push(signal);
        }
      }

      if (!evidence.length) {
        issues.push('Route does not expose the expected cron logic markers.');
      }

      if (!/authorization|CRON_SECRET|isCronAuthorized|getCronSecret|verifyPayload/.test(source)) {
        issues.push('No authorization or CRON_SECRET enforcement detected.');
      }

      if (/mock|MOCK|dummy|sample/i.test(source)) {
        issues.push('Route still uses mock or placeholder data.');
      }

      if (/TODO|FIXME|placeholder/i.test(source)) {
        issues.push('Route contains TODO or placeholder markers.');
      }

      if (job.slug === 'daily-briefing' && /mock|MOCK/i.test(source)) {
        evidence.push('mock-owner-list');
      }

      let status: CronJobStatus = 'active';
      if (issues.length > 0) {
        status = issues.some((issue) => issue.includes('mock') || issue.includes('placeholder')) ? 'needs-attention' : 'inactive';
      }

      return {
        slug: job.slug,
        description: job.description,
        routePath: job.routePath,
        status,
        issues,
        evidence,
      } satisfies CronJobAuditResult;
    })
  );

  return {
    generatedAt: new Date().toISOString(),
    jobs,
  };
}

export async function printCronJobAudit(): Promise<void> {
  const report = await auditCronJobs();
  console.log(JSON.stringify(report, null, 2));
}

if (require.main === module) {
  void printCronJobAudit();
}
