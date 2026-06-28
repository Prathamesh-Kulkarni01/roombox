import { describe, it, expect } from 'vitest';
import { Factories } from '../shared/factories';

describe('Testing Infrastructure - Factories sanity check', () => {
  it('should generate a valid tenant record', () => {
    const tenant = Factories.Tenant({ email: 'test@tenant.com' });
    
    expect(tenant.email).toBe('test@tenant.com');
    expect(tenant.uid).toBeDefined();
    expect(tenant.propertyId).toBeDefined();
    expect(tenant.rentAmount).toBeGreaterThan(0);
  });
});
