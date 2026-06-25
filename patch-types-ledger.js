const fs = require('fs');
const path = require('path');

const typesPath = path.join(__dirname, 'src/lib/types.ts');
let typesStr = fs.readFileSync(typesPath, 'utf8');

// 1. Add FinancialEvent
const financialEventStr = `
export type FinancialEventType = 'rent_charge' | 'payment_received' | 'discount_applied' | 'late_fee' | 'deposit_received' | 'deposit_refunded' | 'utility_charge' | 'other_charge';

export interface FinancialEvent {
  id: string;
  guestId: string;
  pgId: string;
  ownerId: string;
  type: FinancialEventType;
  amount: number; // positive means tenant owes money (debit), negative means tenant paid (credit)
  description: string;
  date: string; // ISO string
  createdAt: string; // ISO string
  createdBy: string; // user ID
  metadata?: any;
  schemaVersion: number;
}
`;

if (!typesStr.includes('FinancialEventType')) {
    typesStr = typesStr + '\n' + financialEventStr;
}

// 2. Add walletBalance and deprecate ledger
typesStr = typesStr.replace(
  "  ledger: LedgerEntry[];",
  "  /** @deprecated Moving to financial_events subcollection */\n  ledger?: LedgerEntry[];\n  walletBalance?: number; // Escrow / Security Deposit / Advance balance"
);

fs.writeFileSync(typesPath, typesStr, 'utf8');
console.log("Types updated for Event-Sourced Ledger.");
