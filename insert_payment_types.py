#!/usr/bin/env python3

# Read the original file
with open('src/lib/types.ts', 'r') as f:
    lines = f.readlines()

# Find the line after "}" that ends the Payment interface
insert_index = None
for i, line in enumerate(lines):
    if line.strip() == '}' and i > 70:  # Around line 81
        # Check if the next line contains "export type BedStatus"
        if i + 2 < len(lines) and 'BedStatus' in lines[i + 2]:
            insert_index = i + 2
            break

if insert_index is None:
    print("Could not find insertion point")
    exit(1)

# New payment method types to insert
new_types = """
// Payment Method Types
export interface PaymentMethodBase {
  id: string;
  name: string;
  isActive: boolean;
  isPrimary: boolean;
  createdAt: string;
  razorpay_fund_account_id?: string;
}

export interface BankPaymentMethod extends PaymentMethodBase {
  type: 'bank_account';
  accountNumber: string;
  accountNumberLast4: string;
  ifscCode: string;
  accountHolderName: string;
  bankName?: string;
}

export interface UpiPaymentMethod extends PaymentMethodBase {
  type: 'upi';
  vpaAddress: string;
}

export type PaymentMethod = BankPaymentMethod | UpiPaymentMethod;

export interface PaymentMethodValidationResult {
  isValid: boolean;
  error?: string;
}

"""

# Insert the new types
new_lines = lines[:insert_index] + [new_types] + lines[insert_index:]

# Write the updated file
with open('src/lib/types.ts', 'w') as f:
    f.writelines(new_lines)

print("Successfully inserted payment method types")
