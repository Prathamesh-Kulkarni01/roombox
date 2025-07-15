
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, MapPin, Star, BedDouble, Users, IndianRupee, Wifi, Tv, Wind, Zap, ParkingCircle, Shirt } from 'lucide-react';

const amenityIcons = {
  wifi: <Wifi className="w-5 h-5" />,
  ac: <Wind className="w-5 h-5" />,
  'power-backup': <Zap className="w-5 h-5" />,
  tv: <Tv className="w-5 h-5" />,
  laundry: <Shirt className="w-5 h-5" />,
  food: <IndianRupee className="w-5 h-5" />,
  parking: <ParkingCircle className="w-5 h-5" />,
};

export default function PgDetailPage({ params }: { params: { id: string } }) {
  // This page was dependent on mock data and needs to be connected to a public
  // Firebase collection to work correctly. For now, it will show a 404 page.
  notFound();

  // The code below is preserved for when this page is connected to a live data source.
  /*
  const pg = null; // Fetch PG data from a public collection using params.id

  if (!pg) {
    notFound();
  }

  return (
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
          {pg.images.slice(1, 3).map((img, index) => (
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
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" /> {pg.rating}
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
                    {pg.amenities.map(amenity => (
                        <div key={amenity} className="flex items-center gap-2 text-foreground">
                            {amenityIcons[amenity]}
                            <span className="capitalize">{amenity.replace('-',' ')}</span>
                        </div>
                    ))}
                </CardContent>
            </Card>

             <Card className="mt-8">
                <CardHeader><CardTitle>House Rules</CardTitle></CardHeader>
                <CardContent>
                   <ul className="space-y-2">
                        {pg.rules.map((rule, index) => (
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
  */
}
