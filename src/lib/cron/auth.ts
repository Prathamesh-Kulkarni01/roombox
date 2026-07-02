import type { NextRequest } from 'next/server';

export function getCronSecret(): string | undefined {
  const secret = process.env.CRON_SECRET?.trim();
  return secret || undefined;
}

export function isCronAuthorized(request: NextRequest): boolean {
  if (process.env.NODE_ENV !== 'production') {
    return true;
  }

  const secret = getCronSecret();
  if (!secret) {
    console.error('[CronAuth] CRON_SECRET is not configured in production');
    return false;
  }

  const authHeader = request.headers.get('authorization')?.trim();
  if (!authHeader) {
    return false;
  }

  return authHeader === `Bearer ${secret}`;
}

export function unauthorizedCronResponse(): Response {
  return new Response('Unauthorized', { status: 401 });
}
