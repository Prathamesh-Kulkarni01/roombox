/**
 * TENANT DASHBOARD LAYOUT
 *
 * Branding-aware: reads x-pg-subdomain header from middleware.
 * On a PG subdomain, wraps the tenant portal in a BrandingProvider
 * so the sidebar, bottom nav, and pages can show the PG's logo/name.
 *
 * On main domain (rentsutra.in/tenants), renders exactly as before.
 */
import { headers } from 'next/headers';
import { getBrandingForSubdomain } from '@/lib/actions/siteActions';
import { BrandingProvider } from '@/context/branding-context';
import type { PgBranding, BrandingContextValue } from '@/context/branding-context';
import TenantLayoutClient from './layout-client';

export default async function TenantDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const subdomain = headersList.get('x-pg-subdomain');

  let brandingValue: BrandingContextValue = { isSubdomain: false };

  if (subdomain) {
    const branding = await getBrandingForSubdomain(subdomain);
    if (branding) {
      const pgBranding: PgBranding = {
        isSubdomain: true,
        ...branding,
      };
      brandingValue = pgBranding;
    }
  }

  return (
    <BrandingProvider value={brandingValue}>
      <TenantLayoutClient>{children}</TenantLayoutClient>
    </BrandingProvider>
  );
}
