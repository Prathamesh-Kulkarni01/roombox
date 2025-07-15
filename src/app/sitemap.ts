import { type MetadataRoute } from 'next'
 
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vasturent.app'
  
  // These are the static, public-facing pages on your site.
  const staticRoutes = [
    {
      url: `${baseUrl}/`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 1,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
     {
      url: `${baseUrl}/signup`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ] as MetadataRoute.Sitemap

  // In the future, if you have a public collection of PGs in Firestore,
  // you could fetch them and generate dynamic routes like this:
  /*
  const { pgs } = await getPublicPgsFromFirestore();
  const pgRoutes = pgs.map((pg) => ({
    url: `${baseUrl}/pg/${pg.id}`,
    lastModified: new Date(), // Or a date from your PG data
    changeFrequency: 'weekly',
    priority: 0.8,
  }));
  */

  // For now, we'll just return the static routes.
  // return [...staticRoutes, ...pgRoutes];
  return staticRoutes
}
