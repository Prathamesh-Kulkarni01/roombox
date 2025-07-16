
import React from 'react';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, MapPin, Star, BedDouble, Users, IndianRupee, Wifi, Tv, Wind, Zap, ParkingCircle, Shirt, Building } from 'lucide-react';
import PgCard from '@/components/pg-card';
import { db } from '@/lib/firebase';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import type { PG } from '@/lib/types';
import { Metadata } from 'next';

const amenityIcons: { [key: string]: React.ReactNode } = {
  wifi: <Wifi className="w-5 h-5" />,
  ac: <Wind className="w-5 h-5" />,
  'power-backup': <Zap className="w-5 h-5" />,
  tv: <Tv className="w-5 h-5" />,
  laundry: <Shirt className="w-5 h-5" />,
  food: <IndianRupee className="w-5 h-5" />,
  parking: <ParkingCircle className="w-5 h-5" />,
};

// This component will render the single property detail page
const SinglePgView = ({ pg, owner }: { pg: PG, owner: { name: string, contactEmail?: string, contactPhone?: string } }) => (
  <div className="bg-muted/20">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-8">
          <div className="col-span-1 md:col-span-2">
            <Image
              src={pg.images[0]}
              alt={pg.name}
              width={1200}
              height={600}
              className="w-full h-auto max-h-[500px] object-cover rounded-lg"
              data-ai-hint="apartment room"
              priority
            />
          </div>
          {pg.images.slice(1, 3).map((img: string, index: number) => (
             <div key={index} className="hidden md:block">
                <Image
                src={img}
                alt={`${pg.name} gallery image ${index + 1}`}
                width={600}
                height={400}
                className="w-full h-64 object-cover rounded-lg"
                data-ai-hint="apartment interior"
              />
             </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <h1 className="text-3xl md:text-4xl font-bold font-headline mb-2">{pg.name}</h1>
            <div className="flex items-center gap-4 text-muted-foreground mb-4">
                <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" /> {pg.location}
                </div>
                 <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" /> {pg.rating || 'N/A'}
                </div>
            </div>
            
            <div className="flex flex-wrap gap-4 mb-8">
              <Badge variant="secondary" className="text-base p-2">
                <BedDouble className="w-4 h-4 mr-2" />
                {pg.totalBeds - pg.occupancy} Beds Available
              </Badge>
              <Badge variant="secondary" className="text-base p-2">
                <Users className="w-4 h-4 mr-2" />
                {pg.gender.charAt(0).toUpperCase() + pg.gender.slice(1)}
              </Badge>
              <Badge variant="secondary" className="text-base p-2">
                <IndianRupee className="w-4 h-4 mr-2" />
                Starts at {pg.priceRange.min}
              </Badge>
            </div>

            <Card>
                <CardHeader><CardTitle>Amenities</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {pg.amenities.map((amenity: string) => (
                        <div key={amenity} className="flex items-center gap-2 text-foreground">
                            {amenityIcons[amenity] || <Star className="w-5 h-5"/>}
                            <span className="capitalize">{amenity.replace('-',' ')}</span>
                        </div>
                    ))}
                </CardContent>
            </Card>

             <Card className="mt-8">
                <CardHeader><CardTitle>House Rules</CardTitle></CardHeader>
                <CardContent>
                   <ul className="space-y-2">
                        {pg.rules.map((rule: string, index: number) => (
                        <li key={index} className="flex items-start gap-2">
                            <CheckCircle className="w-5 h-5 text-green-500 mt-1" />
                            <span>{rule}</span>
                        </li>
                        ))}
                   </ul>
                </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
             <Card className="sticky top-20">
                <CardHeader><CardTitle>Contact Owner</CardTitle></CardHeader>
                <CardContent>
                    <p className="text-muted-foreground mb-4">Interested? Get in touch with the owner directly for a faster response.</p>
                    {owner.contactPhone ? (
                        <a href={`https://wa.me/${owner.contactPhone}?text=Hi, I'm interested in your property "${pg.name}" listed on RentVastu.`} target="_blank" rel="noopener noreferrer">
                            <Button className="w-full bg-green-500 hover:bg-green-600 text-white">
                                Inquire on WhatsApp
                            </Button>
                        </a>
                    ): (
                        <p className="text-sm text-muted-foreground">Contact information not provided.</p>
                    )}
                </CardContent>
             </Card>
          </div>
        </div>
      </div>
       <div className="md:hidden sticky bottom-0 left-0 right-0 bg-background/90 backdrop-blur-sm p-4 border-t w-full">
         {owner.contactPhone ? (
            <a href={`https://wa.me/${owner.contactPhone}?text=Hi, I'm interested in your property "${pg.name}" listed on RentVastu.`} target="_blank" rel="noopener noreferrer">
              <Button className="w-full text-lg bg-accent hover:bg-accent/90 text-accent-foreground">Inquire Now</Button>
            </a>
         ) : <Button className="w-full text-lg" disabled>Inquire Now</Button>}
      </div>
    </div>
);

// This component will render the multi-property listing page
const MultiPgView = ({ pgs, siteTitle, owner }: { pgs: PG[], siteTitle: string, owner: any }) => (
    <div className="bg-background">
        <header className="py-20 bg-muted/40">
            <div className="container mx-auto px-4 text-center">
                <h1 className="text-4xl md:text-5xl font-bold font-headline mb-4">{siteTitle || `${owner.name}'s Properties`}</h1>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Browse our collection of premium properties. Find your next home with us.</p>
            </div>
        </header>
        <main className="container mx-auto px-4 py-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {pgs.map(pg => (
                    <PgCard key={pg.id} pg={pg} />
                ))}
            </div>
        </main>
        <footer className="border-t mt-12">
            <div className="container mx-auto px-4 py-6 text-center text-muted-foreground text-sm">
                <p>&copy; {new Date().getFullYear()} {siteTitle || owner.name}. Powered by RentVastu.</p>
            </div>
        </footer>
    </div>
);

// Fetch site configuration from Firestore
async function getSiteData(subdomain: string) {
    if (!db) return null;
    
    // In dev, we treat the subdomain as the PG ID for direct preview
    if (process.env.NODE_ENV === 'development') {
        // This is a simplified dev path. We need to find the owner of this pg.
        // This is complex without a full query engine. We will assume a structure or mock it.
        // For now, let's just return a "not found" for dev to focus on production path.
        // A better dev approach would be a mock config.
        return null;
    }

    const siteDocRef = doc(db, 'sites', subdomain);
    const siteDoc = await getDoc(siteDocRef);

    if (!siteDoc.exists()) {
        return null;
    }
    const siteConfig = siteDoc.data() as { ownerId: string; listedPgs: string[], siteTitle: string, contactPhone?: string, contactEmail?: string };

    const ownerDocRef = doc(db, 'users', siteConfig.ownerId);
    const ownerDoc = await getDoc(ownerDocRef);
    const owner = ownerDoc.exists() ? ownerDoc.data() : { name: 'Property Owner' };


    if (siteConfig.listedPgs.length === 0) {
        return { pgs: [], siteConfig, owner };
    }

    const pgsQuery = query(
        collection(db, 'users_data', siteConfig.ownerId, 'pgs'),
        where('id', 'in', siteConfig.listedPgs)
    );
    const pgsSnapshot = await getDocs(pgsQuery);
    const pgs = pgsSnapshot.docs.map(doc => doc.data() as PG);

    return { pgs, siteConfig, owner };
}

export async function generateMetadata({ params }: { params: { subdomain: string } }): Promise<Metadata> {
  const data = await getSiteData(params.subdomain);
  if (!data) {
    return {
      title: 'Page Not Found',
    }
  }
  const { siteConfig, pgs } = data;
  return {
    title: `${siteConfig.siteTitle} | Powered by RentVastu`,
    description: `Browse properties offered by ${siteConfig.siteTitle}. Find your next home with amenities like WiFi, food, and more.`,
  }
}

export default async function SitePage({ params }: { params: { subdomain: string } }) {
  const data = await getSiteData(params.subdomain);

  if (!data || data.pgs.length === 0) {
    return notFound();
  }

  const { pgs, siteConfig, owner } = data;
  const mergedOwnerInfo = { ...owner, contactPhone: siteConfig.contactPhone, contactEmail: siteConfig.contactEmail };

  if (pgs.length === 1) {
    return <SinglePgView pg={pgs[0]} owner={mergedOwnerInfo} />;
  }

  return <MultiPgView pgs={pgs} siteTitle={siteConfig.siteTitle} owner={mergedOwnerInfo} />;
}
