
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/lib/hooks';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Star, Users, Shield, Smartphone, TrendingUp, Heart, Zap, Globe, Phone, MapPin, IndianRupee, Building2, UserCheck, Clock, MessageSquare, BarChart3, Bot, LayoutTemplate, UserPlus, FileCog, ArrowRight, BrainCircuit, Download } from "lucide-react";
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
                    Stop Managing.
                  </span>
                  <br />
                  <span className="text-foreground">Start Growing.</span>
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
                       A Smarter Way to Run Your Business
                    </h2>
                    <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                        RentSutra is packed with features designed to save you time, reduce stress, and increase your profits.
                    </p>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[
                        {
                            icon: BarChart3,
                            title: "Financial Automation",
                            description: "Track every rupee automatically. Log expenses, see real-time revenue, and know your financial health without touching a spreadsheet.",
                        },
                        {
                            icon: Users,
                            title: "Seamless Tenant Management",
                            description: "From digital onboarding and rent tracking to managing move-outs, handle the entire guest lifecycle effortlessly.",
                        },
                        {
                            icon: Building2,
                            title: "Visual Occupancy Dashboard",
                            description: "See your entire property at a glance. Know which beds are vacant, occupied, or have pending rent, all in one visual map.",
                        },
                        {
                            icon: Bot,
                            title: "AI-Powered Communication",
                            description: "Automate polite rent reminders in multiple languages and let our AI assistant answer common tenant questions 24/7.",
                        },
                        {
                            icon: Smartphone,
                            title: "Professional Tenant App",
                            description: "Give your tenants a modern app to pay rent, raise complaints, and see announcements, just like top-tier properties.",
                        },
                        {
                            icon: Shield,
                            title: "Secure & Centralized Records",
                            description: "Keep all guest information, payment history, and documents securely stored and accessible anytime, anywhere.",
                        }
                    ].map((feature, index) => (
                        <Card key={index} className="border-0 shadow-card-soft bg-card hover:border-primary transition-all">
                            <CardHeader className="space-y-4">
                            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                                <feature.icon className="h-6 w-6" />
                            </div>
                            <CardTitle className="text-xl font-semibold">
                                {feature.title}
                            </CardTitle>
                            </CardHeader>
                            <CardContent>
                            <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                            </CardContent>
                        </Card>
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
                        <div className="text-4xl font-bold">₹30<span className="text-lg text-muted-foreground">/bed/month</span></div>
                        <p className="font-semibold">51-150 Beds</p>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li className="flex items-center"><Check className="w-4 h-4 text-green-500 mr-2" />Everything in Pro, plus:</li>
                            <li className="flex items-center"><Globe className="w-4 h-4 text-primary mr-2" />Custom Domain & Branding</li>
                            <li className="flex items-center"><Users className="w-4 h-4 text-primary mr-2" />Dedicated Account Manager</li>
                        </ul>
                    </CardContent>
                     <CardFooter>
                        <Button className="w-full" variant="outline" onClick={handleChoosePlan}>Contact Sales</Button>
                    </CardFooter>
                </Card>
            </div>
             <p className="text-center text-sm text-muted-foreground mt-8">For properties with more than 150 beds, we offer custom pricing at ₹28/bed. Please contact us.</p>
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
