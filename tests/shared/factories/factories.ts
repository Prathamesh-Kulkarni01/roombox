import { nanoid } from 'nanoid';

export class TenantFactory {
  static create(overrides: Partial<any> = {}) {
    return {
      id: nanoid(),
      name: 'Test Tenant',
      phone: '+919999999999',
      status: 'active',
      rent: 15000,
      createdAt: new Date().toISOString(),
      ...overrides
    };
  }
}

export class PropertyFactory {
  static create(overrides: Partial<any> = {}) {
    return {
      id: nanoid(),
      name: 'Test Property',
      address: '123 Test St',
      totalRooms: 10,
      createdAt: new Date().toISOString(),
      ...overrides
    };
  }
}

export class OwnerFactory {
  static create(overrides: Partial<any> = {}) {
    return {
      id: nanoid(),
      name: 'Test Owner',
      email: 'owner@test.com',
      ...overrides
    };
  }
}
