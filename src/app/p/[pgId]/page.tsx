import { notFound } from 'next/navigation';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Users, IndianRupee, Bed } from 'lucide-react';
import PublicLeadForm from './PublicLeadForm';

export const metadata = {
  title: 'Property Listing - Roombox',
  description: 'View property details and inquire about availability.',
};

export default async function PublicListingPage({ params }: { params: { pgId: string } }) {
  const db = await getAdminDb();
  const pgDoc = await db.collection('pgs').doc(params.pgId).get();

  if (!pgDoc.exists) {
    return notFound();
  }

  const pgData = pgDoc.data()!;
  // Only expose public-safe data
  const publicData = {
    id: pgDoc.id,
    name: pgData.name || 'Unnamed Property',
    location: pgData.location || 'Location not specified',
    city: pgData.city || 'Unknown City',
    gender: pgData.gender || 'Any',
    priceMin: pgData.priceRange?.min || 0,
    priceMax: pgData.priceRange?.max || 0,
    totalBeds: pgData.totalBeds || 'N/A',
    ownerId: pgData.ownerId
  };

  return (
    <div className="min-h-screen bg-surface-container-light dark:bg-surface-container py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-primary">
            {publicData.name}
          </h1>
          <p className="text-xl text-muted-foreground flex items-center justify-center gap-2">
            <MapPin className="w-5 h-5" /> {publicData.location}, {publicData.city}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="md:col-span-2 space-y-6">
            <Card className="border-primary/10 shadow-lg bg-card/50 backdrop-blur-md">
              <CardHeader>
                <CardTitle>Property Details</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-primary/10 text-primary">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Suitable For</p>
                    <p className="font-semibold capitalize">{publicData.gender}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-primary/10 text-primary">
                    <IndianRupee className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Rent Range</p>
                    <p className="font-semibold">
                      ₹{publicData.priceMin} - ₹{publicData.priceMax}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-primary/10 text-primary">
                    <Bed className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Capacity</p>
                    <p className="font-semibold">{publicData.totalBeds} Beds</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/10 shadow-lg bg-card/50 backdrop-blur-md">
              <CardHeader>
                <CardTitle>About this property</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  Located in the heart of {publicData.city}, {publicData.name} offers premium living 
                  facilities tailored for {publicData.gender} residents. Experience comfortable, 
                  hassle-free living with transparent pricing from ₹{publicData.priceMin}.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Lead Capture Form */}
          <div className="md:col-span-1">
            <Card className="border-primary/20 shadow-xl bg-primary/5 sticky top-6">
              <CardHeader>
                <CardTitle>Interested?</CardTitle>
                <CardDescription>Leave your details and the owner will get back to you shortly.</CardDescription>
              </CardHeader>
              <CardContent>
                <PublicLeadForm pgId={publicData.id} ownerId={publicData.ownerId} pgName={publicData.name} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
