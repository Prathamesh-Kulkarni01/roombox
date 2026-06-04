import { NextRequest, NextResponse } from 'next/server';

/**
 * ROOT DOMAINS — Apex + environment domains that are NOT PG subdomains.
 * Add any domain where the full hostname (without port) should pass through
 * as the main app, untouched by subdomain rewriting.
 */
const ROOT_DOMAINS = [
  // Production
  'roombox.in',
  'www.roombox.in',
  'rentsutra.in',
  'www.rentsutra.in',
  // Environments (staging, dev, preview)
  'dev.rentsutra.in',
  'staging.rentsutra.in',
  'preview.rentsutra.in',
  'dev.roombox.in',
  'staging.roombox.in',
  // Vercel auto-generated preview URLs
  'staging-rentsutra.vercel.app',
  'rentsutra.vercel.app',
  // Local development
  'localhost',
  '127.0.0.1',
];

/**
 * RESERVED SUBDOMAINS — Single-label subdomains that must NEVER be treated
 * as PG subdomains even if the parent domain isn't in ROOT_DOMAINS.
 * These are system/infrastructure names.
 */
const RESERVED_SUBDOMAINS = new Set([
  'www',
  'api',
  'dev',
  'staging',
  'preview',
  'admin',
  'app',
  'mail',
  'smtp',
  'ftp',
  'cdn',
  'static',
  'assets',
  'media',
  'monitoring',
  'sentry',
  'auth',
  'dashboard',
  'help',
  'docs',
  'blog',
]);

/**
 * Paths that should be served as-is (NOT rewritten to /site/[subdomain])
 * even when accessed from a PG subdomain. The subdomain context is injected
 * as a request header instead so pages can apply PG branding optionally.
 */
const PASSTHROUGH_PATHS = [
  '/login',
  '/tenants',
  '/complete-profile',
  '/invite',
  '/api',
  '/pay',
  '/signup',
  '/dashboard',  // owners might bookmark dashboard — should work on any domain
];

function isPassthroughPath(pathname: string): boolean {
  return PASSTHROUGH_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  );
}

export function middleware(req: NextRequest) {
  const host = req.headers.get('host') || '';
  // Strip port for local dev (e.g. "rahulpg.localhost:9002" → "rahulpg.localhost")
  const hostname = host.split(':')[0];

  // ── 1. ROOT DOMAIN CHECK ─────────────────────────────────────────────────────
  // Full hostname matches a known root/environment domain → pass through entirely
  const isRootDomain = ROOT_DOMAINS.some((d) => hostname === d);
  if (isRootDomain) {
    return NextResponse.next();
  }

  // ── 2. EXTRACT SUBDOMAIN ─────────────────────────────────────────────────────
  // Only treat as subdomain if the hostname has at least one dot
  if (!hostname.includes('.')) {
    return NextResponse.next();
  }

  const subdomain = hostname.split('.')[0]; // e.g. "rahulpg" from "rahulpg.rentsutra.in"

  // ── 3. RESERVED SUBDOMAIN CHECK ──────────────────────────────────────────────
  // Never treat system names like "dev", "staging", "api", "www" as PG subdomains
  if (!subdomain || RESERVED_SUBDOMAINS.has(subdomain.toLowerCase())) {
    return NextResponse.next();
  }

  // ── 4. VERCEL PREVIEW URLS ───────────────────────────────────────────────────
  // Vercel preview URLs look like "rentsutra-abc123-team.vercel.app"
  // These contain hyphens and end with .vercel.app — pass through
  if (hostname.endsWith('.vercel.app')) {
    return NextResponse.next();
  }

  // ── 5. PG SUBDOMAIN IDENTIFIED ───────────────────────────────────────────────
  // At this point, `subdomain` is a real PG slug (e.g. "rahulpg", "sharmapg").
  // Inject it as a REQUEST header so server components can read it via headers().

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-pg-subdomain', subdomain);

  // ── 5a. PASSTHROUGH PATHS ────────────────────────────────────────────────────
  // /login, /tenants, /complete-profile, etc. — serve the real app route
  // but with the subdomain header so pages can apply PG branding.
  if (isPassthroughPath(req.nextUrl.pathname)) {
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  // Already under /site/* — no double-rewrite, just inject header
  if (req.nextUrl.pathname.startsWith('/site/')) {
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  // ── 5b. PUBLIC PG SITE REWRITE ───────────────────────────────────────────────
  // rahulpg.rentsutra.in/* → /site/rahulpg/*
  // The URL shown to the user stays as rahulpg.rentsutra.in (transparent rewrite)
  const url = req.nextUrl.clone();
  url.pathname = `/site/${subdomain}${req.nextUrl.pathname === '/' ? '' : req.nextUrl.pathname}`;

  return NextResponse.rewrite(url, {
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT static assets and known non-page files.
     * This keeps middleware fast by not running on every asset request.
     */
    '/((?!_next/static|_next/image|favicon\\.ico|monitoring|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|xml|txt|json|woff2?|ttf|otf|eot|css|js)$).*)',
  ],
};
