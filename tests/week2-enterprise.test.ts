import { describe, expect, it } from 'vitest';
import {
  isEnterpriseIsolated,
  isEnterprisePlan,
  getEnterpriseProject,
} from '../src/lib/enterprise/isolation';

describe('enterprise isolation', () => {
  it('detects isolated owners by credentials, not planId alone', () => {
    expect(
      isEnterpriseIsolated({
        subscription: {
          planId: 'enterprise',
          enterpriseProject: { projectId: 'tenant-proj', serviceAccountJson: '{}' },
        },
      })
    ).toBe(true);

    expect(
      isEnterpriseIsolated({
        subscription: {
          planId: 'enterprise',
          enterpriseProject: { projectId: 'tenant-proj' },
        },
      })
    ).toBe(false);

    expect(
      isEnterpriseIsolated({
        subscription: { planId: 'monthly' },
      })
    ).toBe(false);
  });

  it('distinguishes enterprise plan from isolated setup', () => {
    const halfProvisioned = {
      subscription: {
        planId: 'enterprise',
        enterpriseProject: { projectId: 'tenant-proj' },
      },
    };

    expect(isEnterprisePlan(halfProvisioned)).toBe(true);
    expect(isEnterpriseIsolated(halfProvisioned)).toBe(false);
  });

  it('reads enterprise project config from owner data', () => {
    const project = getEnterpriseProject({
      subscription: {
        enterpriseProject: { projectId: 'abc', databaseId: 'owner-db' },
      },
    });

    expect(project).toMatchObject({ projectId: 'abc', databaseId: 'owner-db' });
  });
});

describe('tenant-config sanitization', () => {
  it('only exposes public Firebase web config keys', async () => {
    const { sanitizeClientConfig } = await import('../src/lib/enterprise/tenant-config-public');

    const sanitized = sanitizeClientConfig({
      apiKey: 'AIza-test',
      authDomain: 'proj.firebaseapp.com',
      projectId: 'proj',
      secretInternalField: 'must-not-leak',
    });

    expect(sanitized).toEqual({
      apiKey: 'AIza-test',
      authDomain: 'proj.firebaseapp.com',
      projectId: 'proj',
    });
    expect(sanitized).not.toHaveProperty('secretInternalField');
  });
});
