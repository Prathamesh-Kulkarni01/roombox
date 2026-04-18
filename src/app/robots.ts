import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://rentsutra.vercel.app';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/dashboard/', 
        '/admin/', 
        '/api/', 
        '/tenants/profile', 
        '/tenants/ledger'
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
