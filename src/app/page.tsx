
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/lib/hooks';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Star, Users, Shield, Smartphone, TrendingUp, Heart, Zap, Globe, Phone, MapPin, IndianRupee, Building2, UserCheck, Clock, MessageSquare, BarChart3, Bot, LayoutTemplate, UserPlus, FileCog, ArrowRight, BrainCircuit, Download, WalletCards, LayoutList, FilePieChart, UserRoundCog } from "lucide-react";
import Image from 'next/image';
import { cn } from '@/lib/utils';
import SubscriptionDialog from '@/components/dashboard/dialogs/SubscriptionDialog';
import InstallPWA from '@/components/install-pwa';

const Index = () => {
    const router = useRouter();
    const { currentUser, isLoading } = useAppSelector((state) => ({
      currentUser: state.user.currentUser,
      isLoading: state.app.isLoading,
    }));
    const [isSubDialogOpen, setIsSubDialogOpen] = useState(false);
  
    useEffect(() => {
      if (!isLoading && currentUser) {
        if (currentUser.role === 'unassigned') {
          router.replace('/complete-profile');
        } else if (currentUser.role === 'tenant') {
          router.replace('/tenants/my-pg');
        } else {
          router.replace('/dashboard');
        }
      }
    }, [isLoading, currentUser, router]);

  const handleChoosePlan = () => {
    if (!currentUser) {
      router.push('/login');
    } else {
      setIsSubDialogOpen(true);
    }
  };

  return (
    <>
      <SubscriptionDialog open={isSubDialogOpen} onOpenChange={setIsSubDialogOpen} />
      <div className="min-h-screen bg-background">
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <Badge className="bg-primary/10 text-primary border-primary/20 px-4 py-2 text-base">
                <Star className="w-5 h-5 mr-2" />
                The OS for Modern Rental Properties
              </Badge>
              
              <div className="space-y-6">
                <h1 className="text-4xl lg:text-6xl font-bold leading-tight">
                  <span className="bg-gradient-saffron bg-clip-text text-transparent">
                    The Modern OS
                  </span>
                  <br />
                  <span className="text-foreground">For Your Rental Property.</span>
                </h1>
                
                <p className="text-xl text-muted-foreground leading-relaxed">
                  RentSutra is the all-in-one platform that automates your PG, hostel, or co-living business. 
                  Replace your spreadsheets, registers, and WhatsApp chats with a single, powerful system.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" variant="hero" className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-shadow" asChild>
                   <Link href="/login">
                      <Smartphone className="mr-2 h-5 w-5" />
                      Get Started for Free
                  </Link>
                </Button>
                <InstallPWA />
              </div>

              <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-sm text-muted-foreground">
                <div className="flex items-center">
                  <Check className="w-4 h-4 text-green-500 mr-2" />
                  No credit card required
                </div>
                <div className="flex items-center">
                  <Check className="w-4 h-4 text-green-500 mr-2" />
                  Free forever for up to 10 beds
                </div>
                <div className="flex items-center">
                  <Check className="w-4 h-4 text-green-500 mr-2" />
                  App size less than 1MB
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-hero rounded-3xl blur-2xl opacity-30 animate-pulse-slow"></div>
              <Image 
                src="/images/indian-pg-owner-hero.webp"
                alt="Happy Indian PG Owner using RentSutra app on a tablet"
                width={600}
                height={600}
                className="relative z-10 w-full h-auto rounded-3xl animate-float"
                data-ai-hint="happy indian property manager"
                priority
              />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 bg-muted/40">
            <div className="container mx-auto px-4">
                <div className="text-center space-y-4 mb-16">
                    <h2 className="text-4xl lg:text-5xl font-bold">
                       Finally, an App That Works as Hard as You Do
                    </h2>
                    <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                        RentSutra is packed with features designed to save you time, reduce stress, and increase your profits.
                    </p>
                </div>
                <div className="space-y-20">
                    {[
                        {
                            icon: LayoutList,
                            title: "Digitize Your Operations",
                            description: "Stop juggling registers and spreadsheets. Create a visual layout of your property, manage staff roles with specific permissions, and track every detail from a single, powerful dashboard.",
                            img: "https://picsum.photos/seed/feature1/600/400",
                            imgHint: "dashboard layout",
                        },
                        {
                            icon: FilePieChart,
                            title: "Automate Your Finances",
                            description: "From collecting rent online with automated reminders to logging every single expense with our Quick-Add feature, RentSutra puts you in complete control of your cash flow. Know your exact financial health, instantly.",
                            img: "https://picsum.photos/seed/feature2/600/400",
                            imgHint: "financial charts",
                        },
                        {
                            icon: UserRoundCog,
                            title: "Enhance Tenant Living",
                            description: "Provide a professional experience with a dedicated tenant app. Tenants can pay rent, raise complaints with photos, view the food menu, and get instant answers from an AI chatbot, reducing your workload.",
                            img: "https://picsum.photos/seed/feature3/600/400",
                            imgHint: "mobile app screen",
                        },
                    ].map((feature, index) => (
                         <div key={index} className="grid md:grid-cols-2 gap-12 items-center">
                            <div className={cn("space-y-6", index % 2 === 1 && "md:order-2")}>
                                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-4">
                                    <feature.icon className="h-8 w-8" />
                                </div>
                                <h3 className="text-3xl font-bold">{feature.title}</h3>
                                <p className="text-lg text-muted-foreground">{feature.description}</p>
                            </div>
                            <div className={cn("relative", index % 2 === 1 && "md:order-1")}>
                                <div className="absolute inset-0 bg-gradient-hero rounded-3xl blur-2xl opacity-20"></div>
                                <Image
                                    src={feature.img}
                                    alt={feature.title}
                                    width={600}
                                    height={400}
                                    className="relative z-10 w-full h-auto rounded-2xl shadow-lg"
                                    data-ai-hint={feature.imgHint}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center space-y-4 mb-16">
              <h2 className="text-4xl lg:text-5xl font-bold">
                Simple, Fair Pricing That <span className="bg-gradient-saffron bg-clip-text text-transparent">Grows With You</span>
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                No complex plans, no hidden charges. Just one simple, affordable price that scales with your business.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
                {/* Free Plan */}
                <Card className="flex flex-col justify-between">
                    <CardHeader>
                        <CardTitle className="text-xl">Free Plan</CardTitle>
                        <CardDescription>Perfect for getting started</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="text-4xl font-bold">₹0</div>
                        <p className="font-semibold">Up to 10 Beds</p>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li className="flex items-center"><Check className="w-4 h-4 text-green-500 mr-2" />Core Property & Tenant Management</li>
                            <li className="flex items-center"><Check className="w-4 h-4 text-green-500 mr-2" />Basic Expense Tracking</li>
                        </ul>
                    </CardContent>
                    <CardFooter>
                         <Button className="w-full" variant="outline" asChild><Link href="/login">Get Started</Link></Button>
                    </CardFooter>
                </Card>

                {/* Pro Plan */}
                 <Card className="relative border-2 border-primary shadow-2xl shadow-primary/20 flex flex-col justify-between">
                    <Badge className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-saffron text-white shadow-lg">Most Popular</Badge>
                     <CardHeader>
                        <CardTitle className="text-xl">Pro Plan</CardTitle>
                        <CardDescription>For growing businesses that need automation</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="text-4xl font-bold">₹25<span className="text-lg text-muted-foreground">/bed/month</span></div>
                        <p className="font-semibold">1-50 Beds</p>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                             <li className="flex items-center"><Check className="w-4 h-4 text-green-500 mr-2" />Everything in Free, plus:</li>
                             <li className="flex items-center"><Zap className="w-4 h-4 text-primary mr-2" />Unlimited Properties & Staff</li>
                             <li className="flex items-center"><BrainCircuit className="w-4 h-4 text-primary mr-2" />All AI-Powered Features</li>
                             <li className="flex items-center"><IndianRupee className="w-4 h-4 text-primary mr-2" />Automated Payouts</li>
                        </ul>
                    </CardContent>
                     <CardFooter>
                        <Button className="w-full" variant="hero" onClick={handleChoosePlan}>Choose Pro</Button>
                    </CardFooter>
                </Card>

                {/* Enterprise Plan */}
                <Card className="flex flex-col justify-between">
                   <CardHeader>
                        <CardTitle className="text-xl">Enterprise Plan</CardTitle>
                        <CardDescription>For large-scale chains and custom needs</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="text-4xl font-bold">Custom</div>
                        <p className="font-semibold">150+ Beds</p>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li className="flex items-center"><Check className="w-4 h-4 text-green-500 mr-2" />Everything in Pro, plus:</li>
                            <li className="flex items-center"><IndianRupee className="w-4 h-4 text-primary mr-2" />Volume discounts (₹28/bed)</li>
                            <li className="flex items-center"><Globe className="w-4 h-4 text-primary mr-2" />Custom Domain & Branding</li>
                            <li className="flex items-center"><Users className="w-4 h-4 text-primary mr-2" />Dedicated Account Manager</li>
                        </ul>
                    </CardContent>
                     <CardFooter>
                        <Button className="w-full" variant="outline" asChild><a href="mailto:hello@rentsutra.com">Contact Sales</a></Button>
                    </CardFooter>
                </Card>
            </div>
          </div>
        </section>

        {/* Why Choose Us Section */}
        <section className="py-20">
            <div className="container mx-auto px-4">
                 <div className="text-center space-y-4 mb-16">
                    <h2 className="text-4xl lg:text-5xl font-bold">
                        Why is RentSutra <span className="bg-gradient-saffron bg-clip-text text-transparent">Better?</span>
                    </h2>
                    <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                        We are not just another generic software. We are built with a deep understanding of the Indian PG ecosystem.
                    </p>
                </div>
                 <div className="grid md:grid-cols-3 gap-8">
                     <div className="space-y-4 p-6 rounded-lg">
                        <div className="text-3xl font-bold text-muted-foreground">1.</div>
                        <h3 className="text-2xl font-semibold">Built for India</h3>
                        <p className="text-muted-foreground">From complex rent cycles and deposit management to multilingual AI reminders, every feature is designed for the unique challenges of the Indian rental market.</p>
                    </div>
                     <div className="space-y-4 p-6 rounded-lg bg-primary/10">
                        <div className="text-3xl font-bold text-muted-foreground">2.</div>
                        <h3 className="text-2xl font-semibold">True Automation</h3>
                        <p className="text-muted-foreground">Other apps are just digital diaries. RentSutra is an OS. It automatically reconciles rent, sends reminders, and manages your finances, saving you hours of manual work.</p>
                    </div>
                     <div className="space-y-4 p-6 rounded-lg">
                        <div className="text-3xl font-bold text-muted-foreground">3.</div>
                        <h3 className="text-2xl font-semibold">Grows with You</h3>
                        <p className="text-muted-foreground">Start with one property and grow to a hundred. Our simple, per-bed pricing and scalable features mean the platform adapts to your business, not the other way around.</p>
                    </div>
                 </div>
            </div>
        </section>

        {/* Footer */}
        <footer className="bg-card text-card-foreground py-12 border-t">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-4 gap-8">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-saffron rounded-lg flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-2xl font-bold">RentSutra</span>
                </div>
                <p className="text-muted-foreground">
                  The Modern OS for Your Rental Property. Made with ❤️ in India.
                </p>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-lg">Product</h4>
                <ul className="space-y-2 text-muted-foreground">
                  <li><Link href="#features" className="hover:text-primary transition-colors">Features</Link></li>
                  <li><Link href="#pricing" className="hover:text-primary transition-colors">Pricing</Link></li>
                  <li><Link href="/login" className="hover:text-primary transition-colors">Login</Link></li>
                </ul>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-lg">Support</h4>
                <ul className="space-y-2 text-muted-foreground">
                  <li><Link href="/blog/onboarding-guest" className="hover:text-primary transition-colors">Help Center</Link></li>
                </ul>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-lg">Connect</h4>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-center">
                    <Phone className="w-4 h-4 mr-2" />
                    +91 9999-123-456
                  </li>
                  <li className="flex items-center">
                    <Globe className="w-4 h-4 mr-2" />
                    hello@rentsutra.com
                  </li>
                </ul>
              </div>
            </div>

            <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
              <p>&copy; {new Date().getFullYear()} RentSutra. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Index;

    