
'use client'

import React, { useMemo } from 'react';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { useAppSelector } from '@/lib/hooks';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, MapPin, Star, BedDouble, Users, IndianRupee, Wifi, Tv, Wind, Zap, ParkingCircle, Shirt } from 'lucide-react';
import PgCard from '@/components/pg-card';
import { Skeleton } from '@/components/ui/skeleton';

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
const SinglePgView = ({ pg }: { pg: any }) => (
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
                    <a href={`https://wa.me/${pg.contact}?text=Hi, I'm interested in your property "${pg.name}" listed on RentVastu.`} target="_blank" rel="noopener noreferrer">
                        <Button className="w-full bg-green-500 hover:bg-green-600 text-white">
                            Inquire on WhatsApp
                        </Button>
                    </a>
                </CardContent>
             </Card>
          </div>
        </div>
      </div>
       <div className="md:hidden sticky bottom-0 left-0 right-0 bg-background/90 backdrop-blur-sm p-4 border-t w-full">
         <a href={`https://wa.me/${pg.contact}?text=Hi, I'm interested in your property "${pg.name}" listed on RentVastu.`} target="_blank" rel="noopener noreferrer">
          <Button className="w-full text-lg bg-accent hover:bg-accent/90 text-accent-foreground">Inquire Now</Button>
         </a>
      </div>
    </div>
);

// This component will render the multi-property listing page
const MultiPgView = ({ pgs, siteTitle, owner }: { pgs: any[], siteTitle: string, owner: any }) => (
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


export default function SitePage({ params }: { params: { subdomain: string } }) {
  // This is a simplified example. In a real app, you would fetch the website configuration
  // and the associated PG data from your database based on the `params.subdomain`.
  
  // For demonstration, we'll find an owner whose PG name matches the subdomain slug
  // and assume their other PGs should be listed.
  const { pgs, isLoading } = useAppSelector(state => state.pgs);
  const { users } = useAppSelector(state => state.user); // Assuming you have a list of users
  
  // In a real app, you would fetch this from the website config saved by the owner
  const websiteConfig = {
      listedPgs: pgs.map(p => p.id), // a list of pg ids
      siteTitle: "Sunshine Properties",
      // ... other settings
  };

  const displayedPgs = useMemo(() => {
    return pgs.filter(pg => websiteConfig.listedPgs.includes(pg.id));
  }, [pgs, websiteConfig]);
  
  const owner = useAppSelector(state => state.user.currentUser); // Simplified for demo


  if (isLoading) {
    return (
        <div className="container mx-auto px-4 py-12">
             <header className="py-20 bg-muted/40">
                <div className="container mx-auto px-4 text-center">
                    <Skeleton className="h-12 w-1/2 mx-auto mb-4" />
                    <Skeleton className="h-6 w-3/4 mx-auto" />
                </div>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
                <Skeleton className="h-96 w-full" />
                <Skeleton className="h-96 w-full" />
                <Skeleton className="h-96 w-full" />
            </div>
        </div>
    )
  }

  if (displayedPgs.length === 0) {
    return notFound();
  }

  if (displayedPgs.length === 1) {
    return <SinglePgView pg={displayedPgs[0]} />;
  }

  return <MultiPgView pgs={displayedPgs} siteTitle={websiteConfig.siteTitle} owner={owner} />;
}
