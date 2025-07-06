import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { PG } from '@/lib/types';
import { MapPin, Star, BedDouble, Users, IndianRupee } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PgCardProps {
  pg: PG;
}

const genderBadgeColor = {
  male: 'bg-blue-100 text-blue-800',
  female: 'bg-pink-100 text-pink-800',
  'co-ed': 'bg-purple-100 text-purple-800',
};

export default function PgCard({ pg }: PgCardProps) {
  return (
    <Card className="flex flex-col overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="p-0 relative">
        <Image
          src={pg.images[0]}
          alt={pg.name}
          width={400}
          height={250}
          className="w-full h-48 object-cover"
          data-ai-hint="apartment room"
        />
        <div className="absolute top-2 right-2 flex gap-2">
            <Badge className={cn("border-transparent", genderBadgeColor[pg.gender])}>
                {pg.gender.charAt(0).toUpperCase() + pg.gender.slice(1)}
            </Badge>
            <Badge variant="default" className="bg-background/80 text-foreground backdrop-blur-sm">
                <Star className="w-3 h-3 mr-1 text-yellow-500 fill-yellow-500" />
                {pg.rating}
            </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 flex-grow">
        <CardTitle className="text-lg font-headline mb-2 truncate">{pg.name}</CardTitle>
        <div className="text-sm text-muted-foreground flex items-center gap-1 mb-2">
            <MapPin className="w-4 h-4" />
            <span>{pg.location}</span>
        </div>
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
            <div className="flex items-center gap-1">
                <BedDouble className="w-4 h-4 text-primary" />
                <span>{pg.totalBeds - pg.occupancy} Beds Left</span>
            </div>
             <div className="flex items-center gap-1">
                <Users className="w-4 h-4 text-primary" />
                <span>{pg.occupancy}/{pg.totalBeds} Occupancy</span>
            </div>
        </div>
         <div className="flex flex-wrap gap-2 mb-4">
          {pg.amenities.slice(0,3).map((amenity) => (
            <Badge key={amenity} variant="secondary" className="text-xs">
              {amenity.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </Badge>
          ))}
          {pg.amenities.length > 3 && <Badge variant="secondary" className="text-xs">+{pg.amenities.length - 3} more</Badge>}
        </div>
      </CardContent>
      <CardFooter className="p-4 bg-primary/5 flex justify-between items-center">
        <div className="font-semibold text-lg flex items-center">
            <IndianRupee className="w-5 h-5" />
            {pg.priceRange.min}
            <span className="text-sm text-muted-foreground ml-1">/month</span>
        </div>
        <Button asChild size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground">
          <Link href={`/pg/${pg.id}`}>View Details</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
