

import type { Guest } from '../../src/lib/types';
import { format, addDays, subDays, addMinutes, subMinutes } from 'date-fns';
import { getReminderForGuest } from '../../src/lib/reminder-logic';

// --- Test Suite ---

describe('Rent Reminder Logic Unit Tests', () => {

    const createBaseGuest = (overrides: Partial<Guest>): Guest => ({
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
    });

    context('Overdue Reminders', () => {
        it('should send an overdue reminder 2 days past due', () => {
            cy.log('**Scenario:** A guest\'s rent was due 2 days ago.');
            cy.log('**Expected Outcome:** An "Overdue" reminder should be sent.');

            const dueDate = new Date('2024-08-15T00:00:00.000Z');
            const now = addDays(dueDate, 2);
            const guest = createBaseGuest({ dueDate: dueDate.toISOString() });
            
            const result = getReminderForGuest(guest, now);
            
            expect(result.shouldSend).to.be.true;
            expect(result.title).to.contain('Overdue');
            expect(result.body).to.contain('2 day(s)');
        });

        it('should send an overdue reminder 5 minutes past due (for minute cycles)', () => {
            cy.log('**Scenario:** A guest with minute-based billing is 5 minutes overdue.');
            cy.log('**Expected Outcome:** An "Overdue" reminder should be sent mentioning the minutes.');

            const dueDate = new Date('2024-08-15T10:00:00.000Z');
            const now = addMinutes(dueDate, 5);
            const guest = createBaseGuest({ dueDate: dueDate.toISOString(), rentCycleUnit: 'minutes' });
            
            const result = getReminderForGuest(guest, now);

            expect(result.shouldSend).to.be.true;
            expect(result.title).to.contain('Overdue');
            expect(result.body).to.contain('5 minute(s)');
        });
    });

    context('Upcoming Reminders', () => {
        it('should send an upcoming reminder 3 days before the due date', () => {
            cy.log('**Scenario:** A guest\'s rent is due in 3 days.');
            cy.log('**Expected Outcome:** A "Gentle Reminder" should be sent.');

            const dueDate = new Date('2024-08-15T00:00:00.000Z');
            const now = subDays(dueDate, 3);
            const guest = createBaseGuest({ dueDate: dueDate.toISOString() });
            
            const result = getReminderForGuest(guest, now);
            
            expect(result.shouldSend).to.be.true;
            expect(result.title).to.contain('Gentle Reminder');
            expect(result.body).to.contain('3 day(s)');
        });

         it('should send an upcoming reminder 2 minutes before the due date (for minute cycles)', () => {
            cy.log('**Scenario:** A guest with minute-based billing has a payment due in 2 minutes.');
            cy.log('**Expected Outcome:** A "Gentle Reminder" should be sent.');
            
            const dueDate = new Date('2024-08-15T10:02:00.000Z');
            const now = new Date('2024-08-15T10:00:00.000Z');
            const guest = createBaseGuest({ dueDate: dueDate.toISOString(), rentCycleUnit: 'minutes' });
            
            const result = getReminderForGuest(guest, now);
            
            expect(result.shouldSend).to.be.true;
            expect(result.title).to.contain('Gentle Reminder');
            expect(result.body).to.contain('2 minute(s)');
        });
    });

    context('Exclusion Scenarios (Should NOT Send)', () => {
        it('should NOT send a reminder if the guest has already paid', () => {
            cy.log('**Scenario:** A guest has already paid their rent (status is "paid").');
            cy.log('**Expected Outcome:** No reminder should be sent.');

            const guest = createBaseGuest({ rentStatus: 'paid' });
            const result = getReminderForGuest(guest, new Date());
            
            expect(result.shouldSend).to.be.false;
        });

        it('should NOT send a reminder if the guest is vacated', () => {
            cy.log('**Scenario:** A guest has already vacated the property.');
            cy.log('**Expected Outcome:** No reminder should be sent.');

            const guest = createBaseGuest({ isVacated: true, rentStatus: 'unpaid' });
            const result = getReminderForGuest(guest, new Date());

            expect(result.shouldSend).to.be.false;
        });

        it('should NOT send a reminder if the due date is far in the future (e.g., 10 days away)', () => {
             cy.log('**Scenario:** A guest\'s rent is due in 10 days, which is outside the 5-day reminder window.');
             cy.log('**Expected Outcome:** No reminder should be sent yet.');
            
            const dueDate = new Date('2024-08-15T00:00:00.000Z');
            const now = subDays(dueDate, 10);
            const guest = createBaseGuest({ dueDate: dueDate.toISOString() });
            
            const result = getReminderForGuest(guest, now);
            
            expect(result.shouldSend).to.be.false;
        });

        it('should send a "due today" reminder if due date is today but not yet past', () => {
            cy.log('**Scenario:** Rent is due today at 10 AM, and the current time is 9 AM.');
            cy.log('**Expected Outcome:** An upcoming reminder should be sent (e.g., "due in 1 hour").');

           const dueDate = new Date('2024-08-15T10:00:00.000Z');
           const now = new Date('2024-08-15T09:00:00.000Z');
           const guest = createBaseGuest({ dueDate: dueDate.toISOString(), rentCycleUnit: 'hours' });
           
           const result = getReminderForGuest(guest, now);

           expect(result.shouldSend).to.be.true;
           expect(result.title).to.contain('Gentle Reminder');
           expect(result.body).to.contain('1 hour(s)');
        });
        
         it('should NOT send an upcoming reminder if due date is in the past (overdue logic handles this)', () => {
             cy.log('**Scenario:** Rent was due today at 10 AM, and the current time is 11 AM.');
             cy.log('**Expected Outcome:** The system should generate an "Overdue" reminder, not an "Upcoming" one.');

            const dueDate = new Date('2024-08-15T10:00:00.000Z');
            const now = new Date('2024-08-15T11:00:00.00Z');
            const guest = createBaseGuest({ dueDate: dueDate.toISOString() });
            
            const result = getReminderForGuest(guest, now);
            
            expect(result.title).to.contain('Overdue'); // Handled by overdue logic, not upcoming
        });
    });
});

    