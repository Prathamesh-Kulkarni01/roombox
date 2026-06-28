export class AuthHelpers {
  static spoofContext(tenantId: string, role: string = 'admin') {
    return {
      user: {
        uid: 'test-user-123',
        email: 'test@example.com'
      },
      tenantId,
      role
    };
  }

  static spoofFirebaseToken(overrides: any = {}) {
    return {
      uid: 'test-user-123',
      email: 'test@example.com',
      tenant: 'tenant-123',
      ...overrides
    };
  }
}
