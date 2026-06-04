/**
 * Branded Login Page Wrapper
 * 
 * This is a server component that reads the x-pg-subdomain header
 * injected by the middleware. When on a subdomain (e.g. rahulpg.rentsutra.in/login),
 * it fetches the PG's branding and wraps the login page client component
 * with a BrandingProvider so the login UI can show the PG's logo/name.
 * 
 * On the main domain (rentsutra.in/login), this renders the login page
 * exactly as before with no branding override.
 */

import { headers } from 'next/headers';
import { getBrandingForSubdomain } from '@/lib/actions/siteActions';
import { BrandingProvider, PgBranding } from '@/context/branding-context';
import LoginPageClient from './login-client';

export default async function LoginPage() {
  const headersList = await headers();
  const subdomain = headersList.get('x-pg-subdomain');

  let brandingValue: PgBranding | { isSubdomain: false } = { isSubdomain: false };

  if (subdomain) {
    const branding = await getBrandingForSubdomain(subdomain);
    if (branding) {
      brandingValue = {
        isSubdomain: true,
        ...branding,
      };
    }
  }

  return (
    <BrandingProvider value={brandingValue}>
      <LoginPageClient />
    </BrandingProvider>
  );
}
