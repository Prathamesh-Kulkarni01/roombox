import type { BaseEntity } from '@/core/database/schema';

export type EntryType = 'DEBIT' | 'CREDIT';

export interface LedgerEntry {
  accountId: string;          // e.g. 'ACCOUNTS_RECEIVABLE', 'CASH_OR_UPI', 'RENTAL_REVENUE', 'BAZAR_SALES'
  accountName: string;
  type: EntryType;
  amount: number;             // Strictly positive
}

export interface JournalTransaction extends BaseEntity {
  transactionId: string;
  moduleId: string;           // 'rent' | 'bazar' | 'gym'
  referenceId: string;        // OrderId, InvoiceId, or PaymentId
  description: string;
  tenantId: string;
  entries: LedgerEntry[];     // Sum of Debits MUST strictly equal sum of Credits
  postedAt: string;
  schemaVersion: number;
}

export class GeneralLedgerService {
  /**
   * Validates and posts a balanced double-entry transaction
   */
  validateTransaction(entries: LedgerEntry[]): boolean {
    let debitSum = 0;
    let creditSum = 0;

    for (const e of entries) {
      if (e.amount <= 0) return false;
      if (e.type === 'DEBIT') debitSum += e.amount;
      else if (e.type === 'CREDIT') creditSum += e.amount;
    }

    // Floating-point precision guard
    return Math.abs(debitSum - creditSum) < 0.001;
  }
}

export const generalLedgerService = new GeneralLedgerService();

