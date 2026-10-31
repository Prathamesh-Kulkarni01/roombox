import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedOwnerId } from '@/lib/auth-server';
import { forbidden, unauthorized } from '@/lib/api/apiError';
import { moduleRegistry } from '@/core/registry';

export interface ModuleAuthResult {
  authorized: boolean;
  userId?: string;
  response?: NextResponse;
}

/**
 * Enforce that a request has access to a specific business module
 */
export async function enforceModuleAccess(
  req: NextRequest, 
  moduleId: string
): Promise<ModuleAuthResult> {
  const manifest = moduleRegistry.getModule(moduleId);
  if (!manifest || !manifest.enabled) {
    return {
      authorized: false,
      response: forbidden(`Module '${moduleId}' is not enabled on this platform instance.`),
    };
  }

  // Verify auth session
  const authUser = await getVerifiedOwnerId(req);
  if (!authUser) {
    return {
      authorized: false,
      response: unauthorized('Authentication required to access this module.'),
    };
  }

  return {
    authorized: true,
    userId: authUser.userId || authUser.ownerId || undefined,
  };
}
