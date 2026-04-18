import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://rentsutra.vercel.app';

  // Core static pages
  const staticPages = [
    '',
    '/login',
    '/signup',
    '/about',
    '/contact',
    '/privacy-policy',
    '/terms-of-service',
    '/refund-policy',
    '/changelog',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: route === '' ? 1 : 0.8,
  }));

  // In a real app, you might fetch dynamic blog routes here
  // const posts = await getPosts();
  // const blogPages = posts.map(...)

  return [...staticPages];
}
