const fs = require('fs');
const path = require('path');

// 1. Fix types.ts
const typesPath = path.join(__dirname, 'src/lib/types.ts');
let types = fs.readFileSync(typesPath, 'utf8');
if (!types.includes('  ownerId: string;')) {
    types = types.replace('export interface Guest extends BaseEntity {', 'export interface Guest extends BaseEntity {\n  ownerId: string;');
    fs.writeFileSync(typesPath, types, 'utf8');
}

// 2. Fix dashboard page types
const dashPath = path.join(__dirname, 'src/app/dashboard/tenant-management/[guestId]/page.tsx');
let dash = fs.readFileSync(dashPath, 'utf8');
dash = dash.replace(
    `type: (e.type === 'deposit_received' || e.amount < 0 || e.type === 'payment_received') ? 'credit' : 'debit',`,
    `type: (e.type === 'deposit_received' || e.amount < 0 || e.type === 'payment_received') ? 'credit' as const : 'debit' as const,`
);
dash = dash.replace(
    `amountType: 'numeric',`,
    `amountType: 'numeric' as const,`
);
// Fix symbolicValue warning
dash = dash.replace(
    `displayAmount: debit.symbolicValue || "XXX",`,
    `displayAmount: "XXX",` // since amountType is numeric, symbolicValue shouldn't matter here
);
fs.writeFileSync(dashPath, dash, 'utf8');

console.log("Fixed main page types.");
