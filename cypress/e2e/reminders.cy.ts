import type { Guest } from '../../src/lib/types';
import { addDays, subDays, addMinutes, subMinutes, addHours, subHours, subMonths, formatISO } from 'date-fns';
import { getReminderForGuest } from '../../src/lib/reminder-logic';

describe('Robust Rent Reminder Tests', () => {

  const createBaseGuest = (overrides: Partial<Guest> = {}): Guest => ({
    id: 'guest-1',
    name: 'Test Tenant',
    userId: 'user-1',
    email: 'test@tenant.com',
    phone: '1234567890',
    pgId: 'pg-1',
    pgName: 'Test PG',
    bedId: 'bed-1',
    rentStatus: 'unpaid',
    rentAmount: 5000,
    depositAmount: 10000,
    moveInDate: '2024-08-01T00:00:00.000Z',
    dueDate: '2024-08-15T00:00:00.000Z',
    isVacated: false,
    rentCycleUnit: 'months',
    rentCycleValue: 1,
    billingAnchorDay: 15,
    noticePeriodDays: 30,
    kycStatus: 'pending',
    ...overrides,
  });

    const baseTime = new Date('2024-08-15T12:00:00.000Z');

    context('Overdue Reminders', () => {
        it('should send an overdue reminder 5 minutes past due (for minute cycles)', () => {
            const dueDate = subMinutes(baseTime, 5);
            const guest = createBaseGuest({ dueDate: dueDate.toISOString(), rentCycleUnit: 'minutes' });
            const result = getReminderForGuest(guest, baseTime);
            expect(result.shouldSend).to.be.true;
            expect(result.title).to.contain('Overdue');
            expect(result.body).to.contain('5 minute(s)');
        });

        it('should send an overdue reminder 2 hours past due (for hour cycles)', () => {
            const dueDate = subHours(baseTime, 2);
            const guest = createBaseGuest({ dueDate: dueDate.toISOString(), rentCycleUnit: 'hours' });
            const result = getReminderForGuest(guest, baseTime);
            expect(result.shouldSend).to.be.true;
            expect(result.title).to.contain('Overdue');
            expect(result.body).to.contain('2 hour(s)');
        });

        it('should send an overdue reminder 3 days past due (for day cycles)', () => {
            const dueDate = subDays(baseTime, 3);
            const guest = createBaseGuest({ dueDate: dueDate.toISOString(), rentCycleUnit: 'days' });
            const result = getReminderForGuest(guest, baseTime);
            expect(result.shouldSend).to.be.true;
            expect(result.title).to.contain('Overdue');
            expect(result.body).to.contain('3 day(s)');
        });
        
        it('should send an overdue reminder for a monthly cycle that is 1 month and 2 days overdue', () => {
            const dueDate = subDays(subMonths(baseTime, 1), 2);
            const guest = createBaseGuest({ dueDate: formatISO(dueDate), rentCycleUnit: 'months' });
            const result = getReminderForGuest(guest, baseTime);
            expect(result.shouldSend).to.be.true;
            expect(result.title).to.contain('Overdue');
            expect(result.body).to.contain('1 month'); 
        });
    });

    context('Upcoming Reminders', () => {
        it('should send an upcoming reminder 2 minutes before the due date (for minute cycles)', () => {
            const dueDate = addMinutes(baseTime, 2);
            const guest = createBaseGuest({ dueDate: dueDate.toISOString(), rentCycleUnit: 'minutes' });
            const result = getReminderForGuest(guest, baseTime);
            expect(result.shouldSend).to.be.true;
            expect(result.title).to.contain('Gentle Reminder');
            expect(result.body).to.contain('2 minute(s)');
        });

        it('should send an upcoming reminder 3 hours before the due date (for hour cycles)', () => {
            const dueDate = addHours(baseTime, 3);
            const guest = createBaseGuest({ dueDate: dueDate.toISOString(), rentCycleUnit: 'hours' });
            const result = getReminderForGuest(guest, baseTime);
            expect(result.shouldSend).to.be.true;
            expect(result.title).to.contain('Gentle Reminder');
            expect(result.body).to.contain('3 hour(s)');
        });

        it('should send an upcoming reminder 1 day before the due date (for day cycles)', () => {
            const dueDate = addDays(baseTime, 1);
            const guest = createBaseGuest({ dueDate: dueDate.toISOString(), rentCycleUnit: 'days' });
            const result = getReminderForGuest(guest, baseTime);
            expect(result.shouldSend).to.be.true;
            expect(result.title).to.contain('Gentle Reminder');
            expect(result.body).to.contain('1 day(s)');
        });
        
        it('should send an upcoming reminder 2 days before the due date (for monthly cycles)', () => {
            const dueDate = addDays(baseTime, 2);
            const guest = createBaseGuest({ dueDate: dueDate.toISOString(), rentCycleUnit: 'months' });
            const result = getReminderForGuest(guest, baseTime);
            expect(result.shouldSend).to.be.true;
            expect(result.title).to.contain('Gentle Reminder');
            expect(result.body).to.contain('2 day(s)');
        });
    });

    context('Edge Cases & Negative Scenarios', () => {
        it('should not send a reminder if the rent is paid', () => {
            const guest = createBaseGuest({ rentStatus: 'paid' });
            expect(getReminderForGuest(guest, baseTime).shouldSend).to.be.false;
        });

        it('should not send a reminder if the guest is vacated', () => {
            const guest = createBaseGuest({ isVacated: true });
            expect(getReminderForGuest(guest, baseTime).shouldSend).to.be.false;
        });
        
        it('should not send a reminder if the due date is far in the future', () => {
            const dueDate = addDays(baseTime, 5); // Outside the 3-day window for daily/monthly
            const guest = createBaseGuest({ dueDate: dueDate.toISOString(), rentCycleUnit: 'days' });
            expect(getReminderForGuest(guest, baseTime).shouldSend).to.be.false;
        });

        it('should trigger a reminder if the due date is exactly now', () => {
            const guest = createBaseGuest({ dueDate: baseTime.toISOString() });
            const result = getReminderForGuest(guest, baseTime);
            expect(result.shouldSend).to.be.true;
            expect(result.title).to.contain('Gentle Reminder');
        });

        it('should not send a reminder for a monthly cycle if due date is 4 days away', () => {
            const dueDate = addDays(baseTime, 4);
            const guest = createBaseGuest({ dueDate: dueDate.toISOString(), rentCycleUnit: 'months' });
            expect(getReminderForGuest(guest, baseTime).shouldSend).to.be.false;
        });
    });
});

    