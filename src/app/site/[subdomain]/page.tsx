
'use client'

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { notFound, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { CheckCircle, MapPin, Star, BedDouble, Users, IndianRupee, Wifi, Tv, Wind, Zap, ParkingCircle, Shirt, Building, PowerOff, Loader2, Phone, Mail, MessageSquare, UtensilsCrossed, ShieldCheck, HomeIcon, Download, Smartphone } from 'lucide-react';
import PgCard from '@/components/pg-card';
import type { PG, SiteConfig, User } from '@/lib/types';
import { getSiteData } from '@/lib/actions/siteActions';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const amenityIcons: { [key: string]: React.ReactNode } = {
  wifi: <Wifi className="w-5 h-5 text-primary" />,
  ac: <Wind className="w-5 h-5 text-primary" />,
  'power-backup': <Zap className="w-5 h-5 text-primary" />,
  tv: <Tv className="w-5 h-5 text-primary" />,
  laundry: <Shirt className="w-5 h-5 text-primary" />,
  food: <UtensilsCrossed className="w-5 h-5 text-primary" />,
  parking: <ParkingCircle className="w-5 h-5 text-primary" />,
};

const featureCards = [
    { icon: <BedDouble/>, title: "Clean Rooms", description: "Regular housekeeping ensures a spotless living environment." },
    { icon: <UtensilsCrossed/>, title: "Hygienic Food", description: "Delicious and healthy veg/non-veg meals prepared daily." },
    { icon: <Wifi/>, title: "High-Speed WiFi", description: "Stay connected with our reliable, high-speed internet." },
    { icon: <ShieldCheck/>, title: "24/7 Security", description: "Your safety is our priority with CCTV and security staff." },
    { icon: <Zap/>, title: "Power Backup", description: "Uninterrupted power supply for your comfort and convenience." },
    { icon: <Shirt/>, title: "Laundry Support", description: "On-site laundry facilities to make your life easier." },
    { icon: <IndianRupee/>, title: "Digital Payments", description: "Pay rent and get receipts online through our tenant app." },
    { icon: <Smartphone/>, title: "Tenant App", description: "Manage complaints, get notices, and more, right from your phone." },
];

const faqs = [
    { q: "Can I vacate anytime?", a: "Yes, you can vacate anytime by providing a notice as per the rental agreement, typically 30 days. You can initiate the process directly from the tenant app." },
    { q: "How do I request room cleaning?", a: "You can raise a maintenance or cleaning request through the complaints section in the tenant app. Our team will address it promptly." },
    { q: "What is the security deposit refund process?", a: "The security deposit is fully refundable after your notice period ends, provided there are no damages to the property. It is processed within 7-10 working days." },
    { q: "How do I report issues?", a: "The best way is to use the 'Complaints' feature in the tenant app. This ensures your issue is logged and tracked until resolved." },
];


// This component will render the single property detail page
const SinglePgView = ({ pg, owner, subdomain }: { pg: PG, owner: User, subdomain: string }) => (
  <div className="bg-muted/20">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <Button variant="outline" asChild className="mb-6"><Link href={`/site/${subdomain}`}>&larr; Back to all properties</Link></Button>
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
                    {owner.phone ? (
                        <a href={`https://wa.me/${owner.phone}?text=Hi, I'm interested in your property "${pg.name}" listed on RentVastu.`} target="_blank" rel="noopener noreferrer">
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
         {owner.phone ? (
            <a href={`https://wa.me/${owner.phone}?text=Hi, I'm interested in your property "${pg.name}" listed on RentVastu.`} target="_blank" rel="noopener noreferrer">
              <Button className="w-full text-lg bg-accent hover:bg-accent/90 text-accent-foreground">Inquire Now</Button>
            </a>
         ) : <Button className="w-full text-lg" disabled>Inquire Now</Button>}
      </div>
    </div>
);

// This component will render the multi-property listing page
const MultiPgView = ({ pgs, siteConfig, owner }: { pgs: PG[], siteConfig: SiteConfig, owner: User }) => {
    
    return (
    <div className="bg-background text-foreground">
      {/* Hero Section */}
      <section className="relative bg-muted/30 py-20 md:py-32">
        <div className="container mx-auto px-4 z-10 relative">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold font-headline mb-4">{siteConfig.siteTitle}</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              Stay in clean, well-managed, and digitally enabled PGs. Book your bed, pay rent, and raise service requests online.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Button size="lg" asChild>
                <a href="#properties">
                    <HomeIcon className="mr-2" /> Explore Our Properties
                </a>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/login">
                  <Download className="mr-2" /> Download Tenant App
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
            <div>
                <Badge variant="outline" className="mb-4">About Us</Badge>
                <h2 className="text-3xl font-bold mb-4">A Better Way to Live</h2>
                <p className="text-muted-foreground text-lg">
                    We’re a trusted PG management company with properties across {pgs[0].city}. Our mission is to simplify shared living with clean rooms, good food, and digital convenience.
                </p>
                <div className="grid grid-cols-2 gap-6 mt-8">
                    <div>
                        <p className="text-3xl font-bold text-primary">{pgs.length}</p>
                        <p className="text-muted-foreground">Properties Managed</p>
                    </div>
                     <div>
                        <p className="text-3xl font-bold text-primary">5+</p>
                        <p className="text-muted-foreground">Years of Experience</p>
                    </div>
                </div>
            </div>
            <div>
                <Image src="https://placehold.co/600x400.png" width={600} height={400} alt="Group of people in a common area" className="rounded-lg shadow-lg" data-ai-hint="people community" />
            </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-16 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
            <div className="text-center mb-12">
                <h2 className="text-3xl font-bold">Everything You Need Under One Roof</h2>
                <p className="text-muted-foreground mt-2 max-w-xl mx-auto">We provide top-notch facilities to ensure a comfortable and hassle-free stay.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {featureCards.map(feature => (
                    <Card key={feature.title} className="text-center bg-background p-6">
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mx-auto mb-4 text-primary">
                            {feature.icon}
                        </div>
                        <h3 className="font-semibold mb-2">{feature.title}</h3>
                        <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </Card>
                ))}
            </div>
        </div>
      </section>
      
       {/* Properties Listing */}
      <section id="properties" className="py-16 md:py-24">
        <div className="container mx-auto px-4">
            <div className="text-center mb-12">
                <h2 className="text-3xl font-bold">Our Properties</h2>
                 <p className="text-muted-foreground mt-2 max-w-xl mx-auto">Find the perfect place that feels like home.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {pgs.map(pg => (
                    <PgCard key={pg.id} pg={pg} />
                ))}
            </div>
        </div>
      </section>

       {/* Testimonials */}
       <section className="py-16 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
           <div className="text-center mb-12">
                <h2 className="text-3xl font-bold">What Our Tenants Say</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                <Card>
                    <CardContent className="p-6">
                        <p className="text-muted-foreground mb-4">"Clean rooms, fast WiFi, and amazing food. Plus, I can manage everything on the app!"</p>
                        <div className="font-semibold">– Akash, Resident @ Whitefield PG</div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardContent className="p-6">
                        <p className="text-muted-foreground mb-4">"Much better than other PGs I stayed in. Support team is responsive and issues are fixed quickly."</p>
                        <div className="font-semibold">– Priya, Working Professional</div>
                    </CardContent>
                </Card>
            </div>
        </div>
       </section>

      {/* FAQs */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-3xl">
             <div className="text-center mb-12">
                <h2 className="text-3xl font-bold">Frequently Asked Questions</h2>
            </div>
            <Accordion type="single" collapsible>
                {faqs.map((faq, i) => (
                    <AccordionItem value={`item-${i}`} key={i}>
                        <AccordionTrigger className="text-lg">{faq.q}</AccordionTrigger>
                        <AccordionContent className="text-base text-muted-foreground">{faq.a}</AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-4">Looking for a Room? Join Us Today!</h2>
            <p className="max-w-xl mx-auto mb-8">Get the comfort of a home and the convenience of modern amenities.</p>
             <Button size="lg" variant="secondary" asChild>
                <a href={`https://wa.me/${owner.phone}?text=Hi, I'm interested in your properties listed on RentVastu.`}>
                  <MessageSquare className="mr-2" /> Contact PG Manager
                </a>
              </Button>
        </div>
      </section>


        <footer className="border-t">
            <div className="container mx-auto px-4 py-8">
                 <div className="grid md:grid-cols-3 gap-8">
                    <div>
                        <h3 className="font-bold text-lg mb-2">{siteConfig.siteTitle}</h3>
                        <p className="text-sm text-muted-foreground">Comfortable and hassle-free living spaces.</p>
                    </div>
                     <div>
                        <h3 className="font-semibold mb-2">Contact Us</h3>
                        <ul className="text-sm space-y-1 text-muted-foreground">
                           {owner.phone && <li className="flex items-center gap-2"><Phone className="w-4 h-4"/>{owner.phone}</li>}
                           {owner.email && <li className="flex items-center gap-2"><Mail className="w-4 h-4"/>{owner.email}</li>}
                        </ul>
                    </div>
                     <div>
                        <h3 className="font-semibold mb-2">Powered By</h3>
                        <p className="text-sm text-muted-foreground">
                            <a href="https://vasturent.app" target="_blank" rel="noopener noreferrer" className="hover:text-primary">RentVastu</a>
                        </p>
                    </div>
                 </div>
                 <div className="mt-8 pt-4 border-t text-center text-xs text-muted-foreground">
                    &copy; {new Date().getFullYear()} {siteConfig.siteTitle}. All rights reserved.
                 </div>
            </div>
        </footer>
    </div>
    )
};

export default function SitePage({ params }: { params: { subdomain: string } }) {
  const [data, setData] = useState<Awaited<ReturnType<typeof getSiteData>> | null>(null);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const pgIdToShow = searchParams.get('pgId');

  useEffect(() => {
    async function fetchData() {
      const isPreview = searchParams.get('preview') === 'true';
      const siteData = await getSiteData(params.subdomain, isPreview);
      setData(siteData);
      setLoading(false);
    }
    fetchData();
  }, [params.subdomain, searchParams]);

  if (loading) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
    );
  }

  if (!data) {
    notFound();
  }
  
  if (data.status === 'suspended' && searchParams.get('preview') !== 'true') {
      return (
          <div className="flex h-screen flex-col items-center justify-center text-center p-4">
              <PowerOff className="mb-4 h-16 w-16 text-muted-foreground" />
              <h1 className="text-2xl font-bold">Site Temporarily Unavailable</h1>
              <p className="text-muted-foreground">This site is currently offline. Please check back later.</p>
          </div>
      )
  }

  if (data.pgs.length === 0) {
      return (
        <div className="flex h-screen flex-col items-center justify-center text-center p-4">
            <Building className="mb-4 h-16 w-16 text-muted-foreground" />
            <h1 className="text-2xl font-bold">No Properties Listed</h1>
            <p className="text-muted-foreground">The owner has not listed any properties on this website yet.</p>
        </div>
      )
  }

  const { pgs, siteConfig, owner } = data;
  const mergedOwnerInfo = { ...owner, phone: siteConfig.contactPhone, email: siteConfig.contactEmail };

  const singlePg = pgIdToShow ? pgs.find(p => p.id === pgIdToShow) : (pgs.length === 1 ? pgs[0] : null);

  if (singlePg) {
    return <SinglePgView pg={singlePg} owner={mergedOwnerInfo} subdomain={params.subdomain}/>;
  }

  return <MultiPgView pgs={pgs} siteConfig={siteConfig} owner={mergedOwnerInfo} />;
}
