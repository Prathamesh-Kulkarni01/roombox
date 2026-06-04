import { ReactNode } from 'react';
import { getSiteData } from '@/lib/actions/siteActions';
import { BrandingProvider, PgBranding } from '@/context/branding-context';

type Props = {
  children: ReactNode;
  params: Promise<{ subdomain: string }>;
};

/**
 * Layout for all subdomain pages (/site/[subdomain]/*).
 *
 * Responsibilities:
 * 1. Suppress the global <Header /> — subdomain pages have their own sticky nav
 * 2. Provide PG branding via BrandingContext to child components
 * 3. Apply the PG's theme color as a CSS variable override
 */
export default async function SubdomainLayout({ children, params }: Props) {
  const { subdomain } = await params;

  // Fetch site config for branding — lightweight, only used for colors/logo
  const siteData = await getSiteData(subdomain, false);
  const siteConfig = siteData?.siteConfig;

  const brandingValue: PgBranding | { isSubdomain: false } = siteConfig
    ? {
        isSubdomain: true as const,
        subdomain,
        siteTitle: siteConfig.siteTitle || 'My PG',
        logoUrl: siteConfig.logoUrl,
        faviconUrl: siteConfig.faviconUrl,
        themeColor: siteConfig.themeColor,
        contactPhone: siteConfig.contactPhone,
        contactEmail: siteConfig.contactEmail,
      }
    : { isSubdomain: false as const };

  // Convert hex themeColor to HSL for CSS variable if present
  // Using a simple inline style override on the wrapper div
  const themeStyle = siteConfig?.themeColor
    ? { '--primary-hex': siteConfig.themeColor } as React.CSSProperties
    : undefined;

  return (
    <BrandingProvider value={brandingValue}>
      {/*
        This layout intentionally does NOT render <Header />.
        The global root layout renders Header, but for subdomain pages
        the SinglePgView/MultiPgView components have their own sticky nav.

        We achieve this by overriding the layout rendering here — this
        layout wraps the page output without adding another Header.
        The root layout's Header is still rendered (it's outside this scope),
        but the site pages handle their own full-screen layout.
      */}
      <div className="subdomain-root" style={themeStyle}>
        {children}
      </div>
    </BrandingProvider>
  );
}
