
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/lib/hooks';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Star, Users, Shield, Smartphone, TrendingUp, Heart, Zap, Globe, Phone, MapPin, IndianRupee, Building2, UserCheck, Clock, MessageSquare, BarChart3, Bot, LayoutTemplate, UserPlus, FileCog, ArrowRight, BrainCircuit, Download, WalletCards, LayoutList, FilePieChart, UserRoundCog, X, ArrowDown } from "lucide-react";
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

        {/* Why RentSutra Section */}
        <section className="py-20 bg-muted/40">
            <div className="container mx-auto px-4">
                <div className="text-center space-y-4 mb-12">
                    <h2 className="text-4xl lg:text-5xl font-bold">Stop Juggling, Start Managing</h2>
                    <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                        Tired of the chaos? See how RentSutra transforms your daily operations.
                    </p>
                </div>
                <div className="grid md:grid-cols-2 gap-8 items-center max-w-5xl mx-auto">
                    {/* The Old Way */}
                    <div className="bg-card p-8 rounded-xl border border-dashed border-red-500/50">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                               <X className="w-6 h-6 text-red-500" />
                            </div>
                            <h3 className="text-2xl font-bold">The Old Way</h3>
                        </div>
                        <ul className="space-y-3 text-muted-foreground">
                            <li className="flex items-start gap-3"><span className="font-bold text-red-500 mt-1">&bull;</span><span>Endless WhatsApp chats for rent reminders and complaints.</span></li>
                            <li className="flex items-start gap-3"><span className="font-bold text-red-500 mt-1">&bull;</span><span>Messy Excel sheets and paper registers for financial tracking.</span></li>
                            <li className="flex items-start gap-3"><span className="font-bold text-red-500 mt-1">&bull;</span><span>No clear view of your real-time occupancy or revenue.</span></li>
                            <li className="flex items-start gap-3"><span className="font-bold text-red-500 mt-1">&bull;</span><span>Manually calculating and reconciling monthly bills and dues.</span></li>
                        </ul>
                    </div>
                     {/* The RentSutra Way */}
                    <div className="bg-card p-8 rounded-xl border border-dashed border-green-500/50">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                               <Check className="w-6 h-6 text-green-500" />
                            </div>
                            <h3 className="text-2xl font-bold">The RentSutra Way</h3>
                        </div>
                        <ul className="space-y-3 text-muted-foreground">
                            <li className="flex items-start gap-3"><span className="font-bold text-green-500 mt-1">&bull;</span><span>Automated rent reminders and a professional tenant app.</span></li>
                            <li className="flex items-start gap-3"><span className="font-bold text-green-500 mt-1">&bull;</span><span>A single dashboard for all financial and operational data.</span></li>
                            <li className="flex items-start gap-3"><span className="font-bold text-green-500 mt-1">&bull;</span><span>Instant insights into occupancy, revenue, and pending dues.</span></li>
                            <li className="flex items-start gap-3"><span className="font-bold text-green-500 mt-1">&bull;</span><span>One-click rent reconciliation and bill splitting.</span></li>
                        </ul>
                    </div>
                </div>
            </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20">
            <div className="container mx-auto px-4">
                <div className="text-center space-y-4 mb-16">
                    <h2 className="text-4xl lg:text-5xl font-bold">
                       A Powerful Toolkit for Property Owners
                    </h2>
                    <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                        RentSutra is packed with features designed to save you time, reduce stress, and increase your profits.
                    </p>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[
                        {
                            icon: LayoutList,
                            title: "Visual Dashboard",
                            description: "Get a bird's-eye view of your entire property. See occupancy, rent status, and vacant beds at a glance.",
                        },
                        {
                            icon: WalletCards,
                            title: "Automated Rent Collection",
                            description: "Automatically track dues and send AI-powered reminders with payment links. Log cash, UPI, or in-app payments.",
                        },
                        {
                            icon: FilePieChart,
                            title: "Expense Tracking",
                            description: "Log every rupee spent with our simple expense manager. Know your exact profit and loss in real-time.",
                        },
                        {
                            icon: UserRoundCog,
                            title: "Staff & Role Management",
                            description: "Add your staff and assign specific permissions. Control who can view financials, edit guest details, or manage complaints.",
                        },
                        {
                            icon: MessageSquare,
                            title: "Complaint Management",
                            description: "A centralized system for tenants to raise issues and for you to track them to resolution.",
                        },
                         {
                            icon: Smartphone,
                            title: "Dedicated Tenant App",
                            description: "Give your tenants a professional app to pay rent, raise complaints, view the menu, and get help from an AI chatbot.",
                        },
                    ].map((feature, index) => (
                         <Card key={index} className="bg-muted/40 border-dashed hover:border-primary hover:bg-card transition-all">
                             <CardHeader>
                                 <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary mb-4">
                                     <feature.icon className="h-6 w-6" />
                                 </div>
                                 <CardTitle>{feature.title}</CardTitle>
                             </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">{feature.description}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-20 bg-muted/40">
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

    