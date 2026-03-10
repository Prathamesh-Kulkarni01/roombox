import { runReconciliationLogic } from '../src/lib/reconciliation';
import { getReminderForGuest } from '../src/lib/reminder-logic';
import { Guest } from '../src/lib/types';
import { addMinutes } from 'date-fns';
import * as fs from 'fs';

let out = "";
const log = (msg: string) => out += msg + "\n";

const now = new Date();
const guest: Guest = {
    id: 'g-1',
    name: 'Test',
    dueDate: addMinutes(now, 10).toISOString(),
    moveInDate: now.toISOString(),
    rentCycleUnit: 'minutes',
    rentCycleValue: 10,
    rentAmount: 100,
    ledger: [],
    balance: 0,
    rentStatus: 'paid', // Initial cycle paid
    isVacated: false,
    billingAnchorDay: now.getDate()
} as any;

for (let i = 0; i <= 25; i++) {
    const sim = addMinutes(now, i);
    log(`[Min +${i}]`);

    const recon = runReconciliationLogic(guest, sim);
    if (recon.cyclesProcessed > 0) {
        Object.assign(guest, recon.guest);
        log(`  🔄 Reconciled ${recon.cyclesProcessed} cycle(s). New Due: ${guest.dueDate}, Status: ${guest.rentStatus}`);
    }

    const reminder = getReminderForGuest(guest, sim);
    if (reminder.shouldSend) {
        log(`  📨 REMINDER: [${reminder.type}] ${reminder.title}`);
    }
}

fs.writeFileSync('tmp/out-test.txt', out, 'utf8');
