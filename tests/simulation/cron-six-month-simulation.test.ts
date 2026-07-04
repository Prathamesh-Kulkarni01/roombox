import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runMaintenanceCron } from '../../src/lib/cron/maintenance';
import { getAdminDb } from '../../src/lib/firebaseAdmin';

// Mock dependencies
vi.mock('../../src/lib/firebaseAdmin', () => ({
  getAdminDb: vi.fn(),
}));

// We will implement the mocks directly in beforeEach to avoid clearAllMocks wiping dynamic imports
vi.mock('../../src/lib/enterprise/isolation', () => ({
  isEnterpriseIsolated: vi.fn(),
}));

vi.mock('../../src/lib/cron/enterprise-utils', () => ({
  filterDispatchableEnterpriseOwners: vi.fn(),
  isCentralGuestDataAccessBlocked: vi.fn(),
}));

vi.mock('../../src/lib/actions/reconciliationActions', () => ({
  reconcileAllGuests: vi.fn().mockResolvedValue({ success: true }),
  reconcileForOwner: vi.fn().mockResolvedValue({ success: true, reconciledCount: 1, errorCount: 0 }),
}));

vi.mock('../../src/lib/actions/reminderActions', () => ({
  sendRemindersForOwner: vi.fn().mockResolvedValue({ success: true, sentCount: 1, errorCount: 0 }),
}));

vi.mock('../../src/lib/actions/subscriptionActions', () => ({
  runMonthlyBillingCron: vi.fn().mockResolvedValue({ success: true }),
}));

describe('Advanced Edge-Case Cron Simulation (6-Months)', () => {
  let mockDb: any;
  let fetchMock: any;

  beforeEach(async () => {
    vi.useFakeTimers();
    // Start at a leap year edge case date (Feb 28th, 2024)
    vi.setSystemTime(new Date('2024-02-28T12:00:00Z'));
    
    const isolationUtils = await import('../../src/lib/enterprise/isolation');
    const enterpriseUtils = await import('../../src/lib/cron/enterprise-utils');
    vi.mocked(isolationUtils.isEnterpriseIsolated).mockImplementation((data: any) => data.plan === 'enterprise' && data.isIsolated !== false);
    vi.mocked(enterpriseUtils.filterDispatchableEnterpriseOwners).mockImplementation(async (candidates: any[]) => candidates.map((c: any) => ({
      id: c.id,
      data: c.data,
      targetDomain: c.data.customDomain || 'https://enterprise.local'
    })));
    
    // Complex dataset with multiple edge cases
    mockDb = {
      collection: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue({
          docs: [
            { id: 'std_1', data: () => ({ role: 'owner', plan: 'standard' }) }, // Happy standard
            { id: 'std_2', data: () => ({ role: 'owner', plan: 'standard', missingFields: true }) }, // Standard edge
            { id: 'ent_1', data: () => ({ role: 'owner', plan: 'enterprise', customDomain: 'https://ent1.com' }) }, // Happy enterprise
            { id: 'ent_2_fail', data: () => ({ role: 'owner', plan: 'enterprise', customDomain: 'https://fail.com' }) }, // Network failure simulation
            { id: 'ent_3_no_domain', data: () => ({ role: 'owner', plan: 'enterprise' }) }, // Fallback domain needed
            { id: 'hybrid_1', data: () => ({ role: 'owner', plan: 'enterprise', isIsolated: false }) }, // Enterprise but NOT isolated
          ]
        })
      })
    };
    vi.mocked(getAdminDb).mockResolvedValue(mockDb);

    // Mock fetch to simulate partial failures and successes based on target domain
    fetchMock = vi.fn(async (url: string) => {
      if (url.includes('fail.com')) {
        return { ok: false, status: 500, statusText: 'Internal Server Error', text: vi.fn().mockResolvedValue('Cron crash') };
      }
      return { ok: true, status: 200, text: vi.fn().mockResolvedValue('OK') };
    });
    global.fetch = fetchMock as any;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('Scenario 1: End-to-end 6-month simulation handling leaps, failures, and isolation constraints', async () => {
    
    let totalSuccess = 0;
    let totalFailures = 0;

    // Simulate 6 months by advancing exactly 30 days each time
    for (let month = 1; month <= 6; month++) {
      vi.advanceTimersByTime(30 * 24 * 60 * 60 * 1000);
      
      const result = await runMaintenanceCron({ includeEnterprise: true });
      
      // Standard dispatch validation (Billing runs centrally once)
      expect(result.standard).toBeDefined();
      expect((result.standard as any).billing.success).toBe(true);

      const entSummary = result.enterprise as any;
      
      // Total dispatched = 3 standards (std_1, std_2, hybrid_1) + 3 enterprise (ent_1, ent_2_fail, ent_3_no_domain) = 6
      expect(entSummary.queued).toBe(6);
      
      // 5 succeed, 1 fails (ent_2_fail)
      console.log('Fetch calls:', fetchMock.mock.calls.map((c: any) => c[0]));
      expect(entSummary.succeeded).toBe(5);
      expect(entSummary.failed).toBe(1);
      
      // Verify error payload capture
      expect(entSummary.errors[0].tenantId).toBe('ent_2_fail');
      expect(entSummary.errors[0].error).toContain('Cron crash');

      totalSuccess += entSummary.succeeded;
      totalFailures += entSummary.failed;

      // Ensure proper header injection for multi-tenancy isolation
      const fetchCalls = fetchMock.mock.calls;
      const thisMonthCalls = fetchCalls.slice(-6); // last 6 calls
      
      thisMonthCalls.forEach((call: any) => {
        const reqInit = call[1];
        expect(reqInit.headers['x-tenant-id']).toBeDefined();
        
        // Ensure standard owners were dispatched to the base app url
        if (reqInit.headers['x-tenant-id'].startsWith('std_')) {
          expect(call[0]).toContain(process.env.NEXT_PUBLIC_APP_URL || 'https://rentsutra.in');
        }
      });
    }

    // Verify 6 months totals
    expect(totalSuccess).toBe(30); // 5 * 6
    expect(totalFailures).toBe(6); // 1 * 6
    expect(fetchMock).toHaveBeenCalledTimes(36);
  });

  it('Scenario 2: maxStandardOwners parameter correctly limits processing batches', async () => {
    // Only process 1 standard owner to simulate pagination/throttling
    const result = await runMaintenanceCron({ maxStandardOwners: 1 });
    
    const entSummary = result.enterprise as any;
    // 1 standard + 3 enterprise = 4 total queued
    expect(entSummary.queued).toBe(4); 
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('Scenario 3: Missing CRON_SECRET throws in production mode', async () => {
    // Simulate production environment
    const originalEnv = process.env.NODE_ENV;
    const originalSecret = process.env.CRON_SECRET;
    
    process.env.NODE_ENV = 'production';
    delete process.env.CRON_SECRET;
    
    await expect(runMaintenanceCron()).rejects.toThrow('CRON_SECRET is required');

    // Cleanup
    process.env.NODE_ENV = originalEnv;
    process.env.CRON_SECRET = originalSecret;
  });
});
