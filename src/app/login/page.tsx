/**
 * LOGIN PAGE — Server Component Shell
 *
 * Reads x-pg-subdomain header (injected by middleware when on a subdomain),
 * fetches PG branding, and provides it via BrandingContext.
 * The actual login UI is in login-client.tsx (client component).
 *
 * On main domain: renders generic RentSutra login UI unchanged.
 * On subdomain:   renders branded login with PG logo, name, colors.
 */
import { headers } from 'next/headers';
import { getBrandingForSubdomain } from '@/lib/actions/siteActions';
import { BrandingProvider } from '@/context/branding-context';
import type { PgBranding, BrandingContextValue } from '@/context/branding-context';
import LoginPageClient from './login-client';

export default async function LoginPage() {
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
      <LoginPageClient />
    </BrandingProvider>
  );
}
