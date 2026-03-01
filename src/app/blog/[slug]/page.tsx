
import { notFound } from 'next/navigation';
import { trainingGuides } from '@/lib/blog-data';
import { Metadata, ResolvingMetadata } from 'next';

type Props = {
  params: { slug: string }
}

export async function generateStaticParams() {
  return trainingGuides.map((post) => ({
    slug: post.slug,
  }))
}

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const guide = trainingGuides.find(guide => guide.slug === params.slug);

  if (!guide) {
    return {
      title: 'Guide Not Found',
    }
  }

  return {
    title: `${guide.title} | RentSutra Guide`,
    description: guide.description,
  }
}

export default function BlogPage({ params }: Props) {
  const guide = trainingGuides.find(guide => guide.slug === params.slug);

  if (!guide) {
    notFound();
  }

  // The rendering logic is now handled by the layout.
  // We just pass the content as a child.
  return (
    <div dangerouslySetInnerHTML={{ __html: guide.content }} />
  );
}
