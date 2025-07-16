
'use client'

// This file is kept for direct linking but the main public view is now at /site/[subdomain]
// This can be used for things like marketplace listings in the future.
// For now, we can redirect or show a simpler version.

import { useMemo } from 'react';
import { notFound, useParams } from 'next/navigation';
import { useAppSelector } from '@/lib/hooks';
import { Skeleton } from '@/components/ui/skeleton';
import { Building } from 'lucide-react';
import SitePage from '../../site/[subdomain]/page';

export default function PgDetailPage() {
    const params = useParams();
    const pgId = params.id as string;
    const { pgs, isLoading } = useAppSelector(state => state.pgs);

    const pg = useMemo(() => pgs.find(p => p.id === pgId || p.name.toLowerCase().replace(/\s+/g, '-') === pgId), [pgs, pgId]);
    
    // This is a simplified logic. In a real app, you would have a more robust way
    // to map a PG to its owner's subdomain. For now, we'll just render the site page
    // with the pgId as a stand-in for the subdomain.
    const subdomain = pgId; 

    if (isLoading) {
        return (
            <div className="container mx-auto px-4 py-12">
                <Skeleton className="h-[60vh] w-full" />
            </div>
        )
    }

    if (!pg) {
        return notFound();
    }
    
    // We can reuse the main site page component logic here.
    // It will automatically handle showing one or more properties.
    // For a direct link, it will just show the single property view.
    return <SitePage params={{ subdomain }} />;
}
