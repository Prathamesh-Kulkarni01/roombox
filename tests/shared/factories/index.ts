import { faker } from '@faker-js/faker';

// A basic factory function type
type Factory<T> = (overrides?: Partial<T>) => T;

export interface UserTestRecord {
  uid: string;
  email: string;
  displayName: string;
}

export const createUserFactory: Factory<UserTestRecord> = (overrides = {}) => ({
  uid: overrides.uid || faker.string.uuid(),
  email: overrides.email || faker.internet.email(),
  displayName: overrides.displayName || faker.person.fullName(),
  ...overrides,
});

export interface TenantTestRecord extends UserTestRecord {
  propertyId: string;
  roomId: string;
  rentAmount: number;
}

export const createTenantFactory: Factory<TenantTestRecord> = (overrides = {}) => {
  const user = createUserFactory(overrides);
  return {
    ...user,
    propertyId: overrides.propertyId || faker.string.uuid(),
    roomId: overrides.roomId || faker.string.uuid(),
    rentAmount: overrides.rentAmount || parseInt(faker.finance.amount({ min: 5000, max: 25000, dec: 0 })),
    ...overrides,
  };
};

export const Factories = {
  User: createUserFactory,
  Tenant: createTenantFactory,
};
