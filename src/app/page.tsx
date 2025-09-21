
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/lib/hooks';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Star, Users, Shield, Smartphone, TrendingUp, Heart, Zap, Globe, Phone, MapPin, IndianRupee, Building2, UserCheck, Clock, MessageSquare, BarChart3, Bot, LayoutTemplate, UserPlus, FileCog, ArrowRight, BrainCircuit, Download, WalletCards, LayoutList, FilePieChart, UserRoundCog, X, UtensilsCrossed, BookUser, Contact, Wallet, History } from "lucide-react";
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
  
    const primaryFeatures = [
    {
      title: "Visual Occupancy Dashboard",
      description: "Get a real-time, bird's-eye view of your business. Our visual dashboard shows you bed status, rent dues, and occupancy at a glance, replacing confusing spreadsheets forever.",
      visual: (
        <div className="w-full aspect-square bg-muted/40 rounded-lg p-4 flex flex-col justify-center gap-2 border">
            <div className="flex justify-between items-center bg-background p-2 rounded">
                <span className="text-sm font-semibold">Floor 1</span>
                <Badge variant="secondary">4/6 Occupied</Badge>
            </div>
            <div className="grid grid-cols-3 gap-2">
                <div className="aspect-square bg-green-200 rounded flex items-center justify-center text-xs text-green-900 font-bold">Bed A</div>
                <div className="aspect-square bg-red-200 rounded flex items-center justify-center text-xs text-red-900 font-bold">Bed B</div>
                <div className="aspect-square bg-green-200 rounded flex items-center justify-center text-xs text-green-900 font-bold">Bed C</div>
                <div className="aspect-square bg-yellow-200 rounded flex items-center justify-center text-xs text-yellow-900 font-bold animate-pulse">Available</div>
                <div className="aspect-square bg-green-200 rounded flex items-center justify-center text-xs text-green-900 font-bold">Bed E</div>
                <div className="aspect-square bg-yellow-200 rounded flex items-center justify-center text-xs text-yellow-900 font-bold animate-pulse">Available</div>
            </div>
        </div>
      )
    },
    {
      title: "Automated Financial Tracking",
      description: "From rent collection to expense logging, put your finances on autopilot. Send automated reminders with payment links and get instant clarity on your monthly profit and loss.",
      visual: (
        <div className="w-full aspect-square bg-muted/40 rounded-lg p-4 flex flex-col justify-center gap-3 border">
            <div className="bg-background p-3 rounded-lg shadow-sm">
                <div className="flex justify-between items-center">
                    <p className="text-sm font-medium">Rent Received</p>
                    <p className="text-sm font-bold text-green-600">+ ₹12,000</p>
                </div>
                <p className="text-xs text-muted-foreground">From Priya Sharma for Room 101</p>
            </div>
             <div className="bg-background p-3 rounded-lg shadow-sm">
                <div className="flex justify-between items-center">
                    <p className="text-sm font-medium">Expense Logged</p>
                    <p className="text-sm font-bold text-red-600">- ₹2,500</p>
                </div>
                <p className="text-xs text-muted-foreground">Groceries for the week</p>
            </div>
            <div className="bg-primary/10 text-primary p-3 rounded-lg shadow-sm mt-2 text-center">
                <p className="text-sm font-bold">Net Profit Updated</p>
            </div>
        </div>
      )
    },
    {
      title: "Effortless Operations",
      description: "Manage complaints, plan menus, and assign staff roles with specific permissions. Everything you need to run a smooth operation is in one place, accessible from anywhere.",
      visual: (
        <div className="w-full aspect-square bg-muted/40 rounded-lg p-4 flex flex-col justify-center gap-3 border">
            <div className="bg-background p-3 rounded-lg shadow-sm transition-all hover:scale-105">
                <div className="flex justify-between items-center mb-1">
                    <p className="font-semibold text-sm">New Complaint</p>
                    <Badge variant="destructive">Open</Badge>
                </div>
                <p className="text-xs text-muted-foreground">"Wi-fi is not working in Room 204." - Akash</p>
            </div>
             <div className="bg-background p-3 rounded-lg shadow-sm transition-all hover:scale-105">
                <div className="flex justify-between items-center mb-1">
                    <p className="font-semibold text-sm">Complaint Assigned</p>
                    <Badge variant="secondary" className="bg-orange-100 text-orange-800">In Progress</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Assigned to Manager for follow-up.</p>
            </div>
        </div>
      )
    },
    {
      title: "A Professional Tenant App",
      description: "Provide your residents with a modern mobile app. They can pay rent, raise complaints, check the food menu, and get instant answers from an AI chatbot, reducing your workload.",
      visual: (
        <div className="w-full aspect-square bg-muted/40 rounded-lg p-4 flex items-center justify-center border">
            <div className="w-48 h-80 bg-background rounded-2xl shadow-2xl p-3 flex flex-col">
                <div className="text-xs font-bold mb-2 text-center">Tenant App</div>
                <div className="space-y-2 text-xs">
                    <div className="bg-primary text-primary-foreground p-2 rounded-lg ml-auto rounded-br-none">What's for dinner?</div>
                    <div className="bg-muted p-2 rounded-lg mr-auto rounded-bl-none">Tonight we are serving Veg Biryani and Raita!</div>
                </div>
                 <div className="mt-auto text-center">
                     <Button size="sm" className="w-full h-8 text-xs">Pay Rent</Button>
                 </div>
            </div>
        </div>
      )
    }
  ];

   const secondaryFeatures = [
        { icon: Contact, title: "Staff Management", description: "Assign roles and permissions to your team members." },
        { icon: LayoutList, title: "Property Layout", description: "Create a digital twin of your property with floors, rooms, and beds." },
        { icon: UserPlus, title: "Guest Onboarding", description: "Easily add new tenants and manage their entire lifecycle." },
        { icon: BookUser, title: "Rent Passbook", description: "Track all payments, dues, and security deposits in one place." },
        { icon: Wallet, title: "Expense Tracking", description: "Log and categorize all your property-related expenses." },
        { icon: MessageSquare, title: "Complaint Management", description: "Receive and manage tenant complaints efficiently." },
        { icon: UtensilsCrossed, title: "Food Menu Planner", description: "Plan and display your weekly menu for all tenants." },
        { icon: BrainCircuit, title: "AI-Powered Tools", description: "Leverage AI for reminders, SEO content, and tenant support." },
        { icon: UserCheck, title: "KYC Verification", description: "Automate tenant document verification for added security." },
        { icon: Globe, title: "Public Website", description: "Get a professional, public-facing website for your brand." },
        { icon: History, title: "Tenant History", description: "Maintain records of all past tenants for future reference." },
        { icon: BarChart3, title: "Advanced Analytics", description: "Get deep insights into your business performance and trends." },
    ];

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
                src="https://picsum.photos/seed/hero/600/600"
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
            <div className="container mx-auto px-4 space-y-24">
                <div className="text-center space-y-4">
                    <h2 className="text-4xl lg:text-5xl font-bold">
                       A Powerful Toolkit for Property Owners
                    </h2>
                    <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                        RentSutra is packed with features designed to save you time, reduce stress, and increase your profits.
                    </p>
                </div>
                {primaryFeatures.map((feature, index) => (
                    <div key={index} className="grid md:grid-cols-2 gap-12 items-center">
                        <div className={cn("space-y-4", index % 2 === 1 && 'md:order-2')}>
                            <Badge variant="outline">{feature.title}</Badge>
                            <h3 className="text-3xl font-bold">{feature.title}</h3>
                            <p className="text-lg text-muted-foreground">{feature.description}</p>
                        </div>
                        <div className={cn("relative", index % 2 === 1 && 'md:order-1')}>
                            {feature.visual}
                        </div>
                    </div>
                ))}
            </div>
             <div className="container mx-auto px-4 pt-24">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {secondaryFeatures.map((feature) => (
                    <div key={feature.title} className="flex items-start gap-4">
                        <div className="flex-shrink-0 p-3 bg-primary/10 rounded-full">
                           <feature.icon className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg">{feature.title}</h3>
                            <p className="text-sm text-muted-foreground">{feature.description}</p>
                        </div>
                    </div>
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

            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
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
                        <p className="font-semibold">1 - 50 Beds</p>
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
                        <p className="font-semibold">50+ Beds</p>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li className="flex items-center"><Check className="w-4 h-4 text-green-500 mr-2" />Everything in Pro, plus:</li>
                            <li className="flex items-center"><IndianRupee className="w-4 h-4 text-primary mr-2" />Volume discounts (from ₹28/bed)</li>
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

    