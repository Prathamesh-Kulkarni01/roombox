import { test as base, expect } from '@playwright/test';

export interface BazarTestData {
  sampleOrder: {
    customerName: string;
    customerPhone: string;
    address: string;
    items: Array<{ name: string; qty: number; price: number }>;
  };
}

export const test = base.extend<{ bazarData: BazarTestData }>({
  bazarData: async ({}, use) => {
    await use({
      sampleOrder: {
        customerName: 'Prathamesh Kulkarni',
        customerPhone: '+91 98765 43210',
        address: 'मेन रोड, बस स्टँड जवळ, पलूस',
        items: [
          { name: 'Chakki Fresh Atta', qty: 1, price: 235 },
          { name: 'Amul Milk 500ml', qty: 2, price: 28 },
        ],
      },
    });
  },
});

export { expect };

