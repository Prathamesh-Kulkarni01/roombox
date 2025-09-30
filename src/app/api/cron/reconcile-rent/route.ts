
'use server';

import { reconcileAllGuests } from '@/ai/flows/reconcile-rent-cycles-flow';
import { NextRequest, NextResponse } from 'next/server';
import type { Guest } from '@/lib/types';
import { runReconciliationLogic } from '@/lib/reconciliation';

// --- API ROUTE HANDLER ---
export async function GET(request: NextRequest) {
  // Check if this is a Cypress test run
  const scenarioHeader = request.headers.get('X-Cypress-Scenario');
  if (scenarioHeader) {
    // --- MOCK TEST LOGIC ---
    // This logic is scoped inside GET so it doesn't run on server build
    const createMockGuest = (overrides: Partial<Guest>): Guest => ({
      id: `guest-test`,
      name: 'Test Guest',
      email: 'guest@test.com',
      phone: '1234567890',
      pgId: 'pg-1',
      pgName: 'Test PG',
      bedId: 'bed-1',
      rentStatus: 'unpaid',
      rentAmount: 1,
      depositAmount: 0,
      moveInDate: '2024-08-01T09:00:00.000Z',
      dueDate: '2024-08-01T10:00:00.000Z',
      isVacated: false,
      rentCycleUnit: 'minutes',
      rentCycleValue: 3,
      billingAnchorDay: 1,
      balanceBroughtForward: 1,
      rentPaidAmount: 0,
      kycStatus: 'verified',
      noticePeriodDays: 30,
      ...overrides,
    });

    const scenarios: { [key: string]: { guest: Guest; now: Date } } = {
      '2_mins_overdue': {
        guest: createMockGuest({}),
        now: new Date('2024-08-01T10:02:00.000Z'),
      },
      '4_mins_overdue': {
        guest: createMockGuest({}),
        now: new Date('2024-08-01T10:04:00.000Z'),
      },
      '7_mins_overdue': {
        guest: createMockGuest({}),
        now: new Date('2024-08-01T10:07:00.000Z'),
      },
      '9_mins_overdue': {
        guest: createMockGuest({}),
        now: new Date('2024-08-01T10:09:00.000Z'),
      },
      '1_month_overdue': {
        guest: createMockGuest({ rentCycleUnit: 'months', rentAmount: 500, balanceBroughtForward: 500, dueDate: '2024-07-15T00:00:00.000Z' }),
        now: new Date('2024-08-16T00:00:00.000Z'),
      },
      '3_months_overdue': {
        guest: createMockGuest({ rentCycleUnit: 'months', rentAmount: 1000, balanceBroughtForward: 0, dueDate: '2024-05-15T00:00:00.000Z' }),
        now: new Date('2024-08-16T00:00:00.000Z'),
      },
      'fully_paid': {
        guest: createMockGuest({ rentStatus: 'paid', balanceBroughtForward: 0, dueDate: '2024-09-01T00:00:00.000Z' }),
        now: new Date('2024-08-15T00:00:00.000Z'),
      },
      'notice_period': {
        guest: createMockGuest({ exitDate: '2024-08-30T00:00:00.000Z' }),
        now: new Date('2024-09-15T00:00:00.000Z'),
      },
      'vacated': {
        guest: createMockGuest({ isVacated: true, dueDate: '2024-07-15T00:00:00.000Z' }),
        now: new Date('2024-08-15T00:00:00.000Z'),
      },
      'due_in_future': {
        guest: createMockGuest({ dueDate: '2024-09-01T00:00:00.000Z' }),
        now: new Date('2024-08-15T00:00:00.000Z'),
      },
      'due_today': {
        guest: createMockGuest({ dueDate: '2024-08-15T00:00:00.000Z' }),
        now: new Date('2024-08-15T12:00:00.000Z'),
      },
      'eom_31_to_30': {
        guest: createMockGuest({ rentCycleUnit: 'months', rentAmount: 5000, dueDate: '2024-08-31T00:00:00.000Z', billingAnchorDay: 31, balanceBroughtForward: 0 }),
        now: new Date('2024-10-01T00:00:00.000Z'),
      },
      'eom_feb_non_leap': {
        guest: createMockGuest({ rentCycleUnit: 'months', rentAmount: 5000, dueDate: '2025-01-31T00:00:00.000Z', billingAnchorDay: 31, balanceBroughtForward: 0 }),
        now: new Date('2025-03-01T00:00:00.000Z'),
      },
      'eom_feb_leap': {
        guest: createMockGuest({ rentCycleUnit: 'months', rentAmount: 5000, dueDate: '2024-01-31T00:00:00.000Z', billingAnchorDay: 31, balanceBroughtForward: 0 }),
        now: new Date('2024-03-01T00:00:00.00Z'),
      }
    };

    const runReconciliationTest = (scenarioName: string) => {
        const scenario = scenarios[scenarioName];
        if (!scenario) {
            return { success: false, error: `Scenario "${scenarioName}" not found.` };
        }
        // Use the centralized, pure reconciliation logic
        const result = runReconciliationLogic(scenario.guest, scenario.now);
        return { success: true, guest: result.guest, cyclesProcessed: result.cyclesProcessed };
    }
    // --- END MOCK TEST LOGIC ---

    const result = runReconciliationTest(scenarioHeader);
    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 404 });
    }
  }

  // --- REAL CRON JOB LOGIC ---
  try {
    const authHeader = request.headers.get('authorization');
    const secret = process.env.CRON_SECRET;
    const isProd = process.env.NODE_ENV === 'production';
    if (isProd && (!secret || authHeader !== `Bearer ${secret}`)) {
      return new Response('Unauthorized', { status: 401 });
    }

    const result = await reconcileAllGuests(isProd ? undefined : 50);

    if (!result.success) {
      throw new Error('Failed to execute rent reconciliation flow.');
    }

    return NextResponse.json({
      success: true,
      message: `Successfully reconciled rent cycles for ${result.reconciledCount} tenants.`,
    });
  } catch (error: any) {
    console.error('Cron job error [reconcile-rent]:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'An internal server error occurred.' },
      { status: 500 }
    );
  }
}
