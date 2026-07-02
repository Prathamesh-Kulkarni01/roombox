import { NextResponse } from 'next/server';

/**
 * Blocks debug/test API routes in production deployments.
 * Returns a 404 so scanners cannot distinguish disabled vs missing routes.
 */
export function rejectIfProduction(): NextResponse | null {
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse(null, { status: 404 });
  }
  return null;
}
