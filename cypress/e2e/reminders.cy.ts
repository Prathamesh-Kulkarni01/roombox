import type { Guest } from '../../src/lib/types';
import { addDays, subDays, addMinutes, subMinutes, addHours, subHours, subMonths } from 'date-fns';
import { getReminderForGuest } from '../../src/lib/reminder-logic';
 const REMINDER_WINDOW = 3; // last 3 units
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

  const REMINDER_WINDOW = 3; // last 3 units

  // -----------------------
  // MINUTES
  // -----------------------
  [1, 2, 3].forEach(min => {
    it(`Upcoming reminder in ${min} minute(s)`, () => {
      const now = subMinutes(new Date('2024-08-15T00:00:00.000Z'), min);
      const guest = createBaseGuest({ dueDate: addMinutes(now, min).toISOString(), rentCycleUnit: 'minutes' });
      const result = getReminderForGuest(guest, now);
      expect(result.shouldSend).to.be.true;
      expect(result.title).to.contain('Gentle Reminder');
      expect(result.body).to.match(new RegExp(`${min} minute\\(s\\)`));
    });

    it(`Overdue by ${min} minute(s)`, () => {
      const now = addMinutes(new Date('2024-08-15T00:00:00.000Z'), min);
      const guest = createBaseGuest({ dueDate: subMinutes(now, min).toISOString(), rentCycleUnit: 'minutes' });
      const result = getReminderForGuest(guest, now);
      expect(result.shouldSend).to.be.true;
      expect(result.title).to.contain('Overdue');
      expect(result.body).to.match(new RegExp(`${min} minute\\(s\\)`));
    });
  });

  // -----------------------
  // HOURS
  // -----------------------
  [1, 2, 3].forEach(hr => {
    it(`Upcoming reminder in ${hr} hour(s)`, () => {
      const now = subHours(new Date('2024-08-15T00:00:00.000Z'), hr);
      const guest = createBaseGuest({ dueDate: addHours(now, hr).toISOString(), rentCycleUnit: 'hours' });
      const result = getReminderForGuest(guest, now);
      expect(result.shouldSend).to.be.true;
      expect(result.title).to.contain('Gentle Reminder');
      expect(result.body).to.match(new RegExp(`${hr} hour\\(s\\)`));
    });

    it(`Overdue by ${hr} hour(s)`, () => {
      const now = addHours(new Date('2024-08-15T00:00:00.000Z'), hr);
      const guest = createBaseGuest({ dueDate: subHours(now, hr).toISOString(), rentCycleUnit: 'hours' });
      const result = getReminderForGuest(guest, now);
      expect(result.shouldSend).to.be.true;
      expect(result.title).to.contain('Overdue');
      expect(result.body).to.match(new RegExp(`${hr} hour\\(s\\)`));
    });
  });

  // -----------------------
  // DAYS
  // -----------------------
  [1, 2, 3].forEach(day => {
    it(`Upcoming reminder in last ${day} day(s)`, () => {
      const now = subDays(new Date('2024-08-15T00:00:00.000Z'), day);
      const guest = createBaseGuest({ dueDate: addDays(now, day).toISOString(), rentCycleUnit: 'days' });
      const result = getReminderForGuest(guest, now);
      expect(result.shouldSend).to.be.true;
      expect(result.title).to.contain('Gentle Reminder');
      expect(result.body).to.match(new RegExp(`${day} day\\(s\\)`));
    });

    it(`Overdue by ${day} day(s)`, () => {
      const now = addDays(new Date('2024-08-15T00:00:00.000Z'), day);
      const guest = createBaseGuest({ dueDate: subDays(now, day).toISOString(), rentCycleUnit: 'days' });
      const result = getReminderForGuest(guest, now);
      expect(result.shouldSend).to.be.true;
      expect(result.title).to.contain('Overdue');
      expect(result.body).to.match(new RegExp(`${day} day\\(s\\)`));
    });
  });

  // -----------------------
  // MONTHS (last 3 days reminder)
  // -----------------------
  [1, 2, 3].forEach(dayBefore => {
    it(`Monthly cycle: reminder ${dayBefore} day(s) before due`, () => {
      const now = subDays(new Date('2024-08-15T00:00:00.000Z'), dayBefore);
      const guest = createBaseGuest({ dueDate: addDays(now, dayBefore).toISOString(), rentCycleUnit: 'months' });
      const result = getReminderForGuest(guest, now);
      expect(result.shouldSend).to.be.true;
      expect(result.title).to.contain('Gentle Reminder');
      expect(result.body).to.match(new RegExp(`${dayBefore} day\\(s\\)`));
    });
  });

  [1, 2, 3].forEach(month => {
    it(`Overdue by ${month} month(s)`, () => {
      const now = addDays(new Date('2024-08-15T00:00:00.000Z'), month * 30);
      const guest = createBaseGuest({ dueDate: subDays(now, month * 30).toISOString(), rentCycleUnit: 'months' });
      const result = getReminderForGuest(guest, now);
      expect(result.shouldSend).to.be.true;
      expect(result.title).to.contain('Overdue');
      expect(result.body).to.match(new RegExp(`${month} month\\(s\\)`));
    });
  });

  // -----------------------
  // EDGE CASES
  // -----------------------
  it('No reminder if tenant paid or vacated', () => {
    const paidGuest = createBaseGuest({ rentStatus: 'paid' });
    const vacatedGuest = createBaseGuest({ isVacated: true });
    expect(getReminderForGuest(paidGuest).shouldSend).to.be.false;
    expect(getReminderForGuest(vacatedGuest).shouldSend).to.be.false;
  });

  it('Due exactly now triggers reminder', () => {
    const now = new Date();
    const guest = createBaseGuest({ dueDate: now.toISOString() });
    const result = getReminderForGuest(guest, now);
    expect(result.shouldSend).to.be.true;
    expect(result.title).to.contain('Gentle Reminder');
  });

  it('Upcoming beyond reminder window should not send', () => {
    const futureGuest = createBaseGuest({ dueDate: addDays(new Date(), 10).toISOString(), rentCycleUnit: 'days' });
    const result = getReminderForGuest(futureGuest, new Date());
    expect(result.shouldSend).to.be.false;
  });

  it('Overdue by multiple cycles', () => {
    const now = addDays(new Date('2024-08-15T00:00:00.000Z'), 65);
    const guest = createBaseGuest({ dueDate: '2024-08-01T00:00:00.000Z', rentCycleUnit: 'months' });
    const result = getReminderForGuest(guest, now);
    expect(result.shouldSend).to.be.true;
    expect(result.title).to.contain('Overdue');
  });



 

  // -----------------------
  // MINUTES
  // -----------------------
  [1, 2, 3].forEach(min => {
    it(`Upcoming reminder in ${min} minute(s)`, () => {
      const now = subMinutes(new Date('2024-08-15T00:00:00.000Z'), min);
      const guest = createBaseGuest({ dueDate: addMinutes(now, min).toISOString(), rentCycleUnit: 'minutes' });
      const result = getReminderForGuest(guest, now);
      expect(result.shouldSend).to.be.true;
      expect(result.title).to.contain('Gentle Reminder');
      expect(result.body).to.match(new RegExp(`${min} minute\\(s\\)`));
    });

    it(`Overdue by ${min} minute(s)`, () => {
      const now = addMinutes(new Date('2024-08-15T00:00:00.000Z'), min);
      const guest = createBaseGuest({ dueDate: subMinutes(now, min).toISOString(), rentCycleUnit: 'minutes' });
      const result = getReminderForGuest(guest, now);
      expect(result.shouldSend).to.be.true;
      expect(result.title).to.contain('Overdue');
      expect(result.body).to.match(new RegExp(`${min} minute\\(s\\)`));
    });
  });

  // -----------------------
  // HOURS
  // -----------------------
  [1, 2, 3].forEach(hr => {
    it(`Upcoming reminder in ${hr} hour(s)`, () => {
      const now = subHours(new Date('2024-08-15T00:00:00.000Z'), hr);
      const guest = createBaseGuest({ dueDate: addHours(now, hr).toISOString(), rentCycleUnit: 'hours' });
      const result = getReminderForGuest(guest, now);
      expect(result.shouldSend).to.be.true;
      expect(result.title).to.contain('Gentle Reminder');
      expect(result.body).to.match(new RegExp(`${hr} hour\\(s\\)`));
    });

    it(`Overdue by ${hr} hour(s)`, () => {
      const now = addHours(new Date('2024-08-15T00:00:00.000Z'), hr);
      const guest = createBaseGuest({ dueDate: subHours(now, hr).toISOString(), rentCycleUnit: 'hours' });
      const result = getReminderForGuest(guest, now);
      expect(result.shouldSend).to.be.true;
      expect(result.title).to.contain('Overdue');
      expect(result.body).to.match(new RegExp(`${hr} hour\\(s\\)`));
    });
  });

  // -----------------------
  // DAYS
  // -----------------------
  [1, 2, 3].forEach(day => {
    it(`Upcoming reminder in last ${day} day(s)`, () => {
      const now = subDays(new Date('2024-08-15T00:00:00.000Z'), day);
      const guest = createBaseGuest({ dueDate: addDays(now, day).toISOString(), rentCycleUnit: 'days' });
      const result = getReminderForGuest(guest, now);
      expect(result.shouldSend).to.be.true;
      expect(result.title).to.contain('Gentle Reminder');
      expect(result.body).to.match(new RegExp(`${day} day\\(s\\)`));
    });

    it(`Overdue by ${day} day(s)`, () => {
      const now = addDays(new Date('2024-08-15T00:00:00.000Z'), day);
      const guest = createBaseGuest({ dueDate: subDays(now, day).toISOString(), rentCycleUnit: 'days' });
      const result = getReminderForGuest(guest, now);
      expect(result.shouldSend).to.be.true;
      expect(result.title).to.contain('Overdue');
      expect(result.body).to.match(new RegExp(`${day} day\\(s\\)`));
    });
  });

   // -----------------------
  // Monthly reminders last 3 days before due
  // -----------------------
    const months = [
    { name: 'Jan', year: 2025, day: 15 },
    { name: 'Feb', year: 2025, day: 15 },
    { name: 'Mar', year: 2025, day: 15 },
    { name: 'Apr', year: 2025, day: 15 },
    { name: 'May', year: 2025, day: 15 },
  ];

  months.forEach(m => {
    [1, 2, 3].forEach(dayBefore => {
      it(`Reminder sent ${dayBefore} day(s) before due in ${m.name} ${m.year}`, () => {
        const dueDate = new Date(m.year, m.day === 29 && m.name === 'Feb' ? 1 : m.day - 1, m.day); // Feb 2025 28 days handled
        const now = subDays(dueDate, dayBefore);
        const guest = createBaseGuest({ dueDate: dueDate.toISOString(), rentCycleUnit: 'months' });
        const result = getReminderForGuest(guest, now);
        expect(result.shouldSend).to.be.true;
        expect(result.title).to.contain('Gentle Reminder');
        expect(result.body).to.match(new RegExp(`${dayBefore} day\\(s\\)`));
      });
    });
  });

  // -----------------------
  // Monthly overdue reminders
  // -----------------------
  [1, 2, 3].forEach(monthMissed => {
    it(`Overdue by ${monthMissed} month(s)`, () => {
      const dueDate = subMonths(new Date('2025-01-15T00:00:00.000Z'), monthMissed);
      const now = new Date('2025-01-15T00:00:00.000Z');
      const guest = createBaseGuest({ dueDate: dueDate.toISOString(), rentCycleUnit: 'months' });
      const result = getReminderForGuest(guest, now);
      expect(result.shouldSend).to.be.true;
      expect(result.title).to.contain('Overdue');
      expect(result.body).to.match(new RegExp(`${monthMissed} month\\(s\\)`));
    });
  });

  
  // -----------------------
  // Future reminders not sent
  // -----------------------
  it('No reminder if due more than 3 days away in March 2025', () => {
    const dueDate = new Date(2025, 2, 15); // Mar 15, 2025
    const now = subDays(dueDate, 5); // 5 days before
    const guest = createBaseGuest({ dueDate: dueDate.toISOString(), rentCycleUnit: 'months' });
    const result = getReminderForGuest(guest, now);
    expect(result.shouldSend).to.be.false;
  });

  // -----------------------
  // Paid or vacated tenants
  // -----------------------
  it('No reminder if tenant paid', () => {
    const paidGuest = createBaseGuest({ rentStatus: 'paid' });
    expect(getReminderForGuest(paidGuest).shouldSend).to.be.false;
  });

  it('No reminder if tenant vacated', () => {
    const vacatedGuest = createBaseGuest({ isVacated: true });
    expect(getReminderForGuest(vacatedGuest).shouldSend).to.be.false;
  });

  // -----------------------
  // Due exactly today triggers reminder
  // -----------------------
  it('Reminder sent if due today', () => {
    const now = new Date('2025-01-15T00:00:00.000Z');
    const guest = createBaseGuest({ dueDate: now.toISOString() });
    const result = getReminderForGuest(guest, now);
    expect(result.shouldSend).to.be.true;
    expect(result.title).to.contain('Gentle Reminder');
  });


  // -----------------------
  // EDGE CASES
  // -----------------------
  it('No reminder if tenant paid or vacated', () => {
    const paidGuest = createBaseGuest({ rentStatus: 'paid' });
    const vacatedGuest = createBaseGuest({ isVacated: true });
    expect(getReminderForGuest(paidGuest).shouldSend).to.be.false;
    expect(getReminderForGuest(vacatedGuest).shouldSend).to.be.false;
  });

  it('Due exactly now triggers reminder', () => {
    const now = new Date();
    const guest = createBaseGuest({ dueDate: now.toISOString() });
    const result = getReminderForGuest(guest, now);
    expect(result.shouldSend).to.be.true;
    expect(result.title).to.contain('Gentle Reminder');
  });

  it('Upcoming beyond reminder window should not send', () => {
    const futureGuest = createBaseGuest({ dueDate: addDays(new Date(), 10).toISOString(), rentCycleUnit: 'days' });
    const result = getReminderForGuest(futureGuest, new Date());
    expect(result.shouldSend).to.be.false;
  });

  it('Overdue by multiple cycles', () => {
    const now = addDays(new Date('2024-08-15T00:00:00.000Z'), 65);
    const guest = createBaseGuest({ dueDate: '2024-08-01T00:00:00.000Z', rentCycleUnit: 'months' });
    const result = getReminderForGuest(guest, now);
    expect(result.shouldSend).to.be.true;
    expect(result.title).to.contain('Overdue');
  });
});
