
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/lib/hooks';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Star, Users, Shield, Smartphone, TrendingUp, Heart, Zap, Globe, Phone, MapPin, IndianRupee, Building2, UserCheck, Clock, MessageSquare, BarChart3, Bot, LayoutTemplate, UserPlus, FileCog } from "lucide-react";
import Image from 'next/image';
import { cn } from '@/lib/utils';
import SubscriptionDialog from '@/components/dashboard/dialogs/SubscriptionDialog';

const Index = () => {
    const router = useRouter();
    const { currentUser, isLoading } = useAppSelector((state) => ({
      currentUser: state.user.currentUser,
      isLoading: state.app.isLoading,
    }));
    const [isSubDialogOpen, setIsSubDialogOpen] = useState(false);
  
    useEffect(() => {
      if (!isLoading && currentUser) {
        if (currentUser.role === 'tenant') {
          router.replace('/tenants/my-pg');
        } else {
          router.replace('/dashboard');
        }
      }
    }, [isLoading, currentUser, router]);

  const handleChoosePlan = (planId: string) => {
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
              <Badge className="bg-primary/10 text-primary border-primary/20 px-4 py-2">
                <Star className="w-4 h-4 mr-2" />
                भारत का #1 PG Management Platform
              </Badge>
              
              <div className="space-y-6">
                <h1 className="text-4xl lg:text-6xl font-bold leading-tight">
                  <span className="bg-gradient-saffron bg-clip-text text-transparent">
                    अपना PG Business
                  </span>
                  <br />
                  <span className="text-foreground">Effortlessly Manage करें</span>
                </h1>
                
                <p className="text-xl text-muted-foreground leading-relaxed">
                  Stop juggling spreadsheets and manual entries. RentVastu automates your entire PG operations - 
                  from rent collection to tenant management, all in one simple platform built specifically for Indian PG owners.
                </p>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-10 h-10 rounded-full bg-gradient-saffron border-2 border-white flex items-center justify-center">
                      <UserCheck className="w-5 h-5 text-white" />
                    </div>
                  ))}
                </div>
                <div className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">2000+ PG Owners</span> ने पहले ही join कर लिया है
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" variant="hero" className="text-lg px-8 py-4" asChild>
                   <Link href="/login">
                      <Smartphone className="mr-2 h-5 w-5" />
                      Start Free Today
                  </Link>
                </Button>
              </div>

              <div className="flex items-center space-x-8 text-sm text-muted-foreground">
                <div className="flex items-center">
                  <Check className="w-4 h-4 text-accent mr-2" />
                  No Credit Card Required
                </div>
                <div className="flex items-center">
                  <Check className="w-4 h-4 text-accent mr-2" />
                  Free Forever Plan
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-hero rounded-3xl blur-2xl opacity-30 animate-pulse-slow"></div>
              <Image 
                src="https://placehold.co/600x600.png"
                alt="Happy Indian PG Owner using RentVastu app"
                width={600}
                height={600}
                className="relative z-10 w-full h-auto rounded-3xl shadow-trust animate-float"
                data-ai-hint="happy indian property manager"
              />
            </div>
          </div>
        </section>

        {/* Trust Indicators */}
        <section className="bg-background/80 backdrop-blur-sm py-12">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div className="space-y-2">
                <div className="text-3xl font-bold text-primary">₹50Cr+</div>
                <div className="text-sm text-muted-foreground">Monthly Rent Managed</div>
              </div>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-primary">2000+</div>
                <div className="text-sm text-muted-foreground">Happy PG Owners</div>
              </div>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-primary">25000+</div>
                <div className="text-sm text-muted-foreground">Tenants Served</div>
              </div>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-primary">98%</div>
                <div className="text-sm text-muted-foreground">Success Rate</div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="container mx-auto px-4 py-20">
          <div className="text-center space-y-4 mb-16">
            <Badge className="bg-accent/10 text-accent border-accent/20">
              <Zap className="w-4 h-4 mr-2" />
              Complete Solution
            </Badge>
            <h2 className="text-4xl lg:text-5xl font-bold">
              Everything You Need.{" "}
              <span className="bg-gradient-saffron bg-clip-text text-transparent">
                Nothing You Don't.
              </span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              RentVastu is built specifically for Indian PG owners to solve real problems of rental management.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Building2,
                title: "Visual Property Dashboard",
                description: "Ditch spreadsheets. Manage floors, rooms, and beds visually. See vacancies and tenant details at a glance.",
              },
              {
                icon: BarChart3,
                title: "Automated Finance Tracking",
                description: "Effortlessly log expenses, track monthly revenue, and simplify rent collection. Real-time financial health insights.",
              },
              {
                icon: Smartphone,
                title: "Professional Tenant App",
                description: "Impress your tenants with a modern app to pay rent, raise complaints, and see announcements, just like top PGs.",
              },
              {
                icon: MessageSquare,
                title: "AI-Powered Communication",
                description: "Automate polite rent reminders in Hindi/English and let our AI assistant answer common tenant questions about rules and menus.",
              },
              {
                icon: Users,
                title: "Seamless Tenant Lifecycle",
                description: "From digital onboarding and KYC to managing move-outs, handle the entire tenant journey in one place.",
              },
              {
                icon: Shield,
                title: "Secure & Organized Records",
                description: "Keep all guest information, payment history, and documents securely stored and accessible anytime, anywhere.",
              }
            ].map((feature, index) => (
              <Card key={index} className="group hover:shadow-trust transition-all duration-300 hover:-translate-y-2 border-0 shadow-card-soft bg-card">
                <CardHeader className="space-y-4">
                  <div className={`w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary`}>
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-xl font-semibold group-hover:text-primary transition-colors">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* How it Works Flowchart */}
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center space-y-4 mb-16">
              <h2 className="text-4xl lg:text-5xl font-bold">
                Just 4 Steps to <span className="bg-gradient-saffron bg-clip-text text-transparent">Full Automation</span>
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Transform your property management in minutes with our intuitive workflow.
              </p>
            </div>
            <div className="relative">
              {/* The connecting line */}
              <div className="absolute left-1/2 top-12 bottom-12 w-0.5 bg-border/80 hidden lg:block" aria-hidden="true"></div>

              <div className="space-y-16 lg:space-y-24">
                {[
                  {
                    step: 1,
                    icon: LayoutTemplate,
                    title: "Setup Your Property",
                    description: "Visually create floors, rooms, and beds to match your property layout. Set rent and sharing types for each room.",
                    align: "left"
                  },
                  {
                    step: 2,
                    icon: UserPlus,
                    title: "Onboard Your Guests",
                    description: "Add new guests to available beds with just a few clicks. The system automatically tracks their rent cycle and dues.",
                    align: "right"
                  },
                  {
                    step: 3,
                    icon: Zap,
                    title: "Automate Your Operations",
                    description: "Collect rent, send AI-powered reminders, log expenses, and manage complaints from a single, unified dashboard.",
                    align: "left"
                  },
                  {
                    step: 4,
                    icon: Smartphone,
                    title: "Empower Your Tenants",
                    description: "Invite tenants to the app where they can view their dues, see the menu, and raise complaints, giving them a professional experience.",
                    align: "right"
                  }
                ].map((item) => (
                  <div key={item.step} className="relative flex flex-col lg:flex-row items-center gap-8">
                    {/* Step Circle */}
                    <div className={cn("relative z-10 flex items-center justify-center w-16 h-16 rounded-full bg-primary text-primary-foreground text-2xl font-bold shadow-lg",
                      item.align === "left" ? "lg:order-2 lg:ml-auto" : "lg:order-1 lg:mr-auto"
                    )}>
                      {item.step}
                    </div>
                    
                    {/* Content Card */}
                    <div className={cn("w-full lg:w-5/12 p-8 bg-card rounded-lg shadow-card-soft border",
                      item.align === "left" ? "lg:order-1" : "lg:order-2"
                    )}>
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                          <item.icon className="w-6 h-6 text-accent"/>
                        </div>
                        <h3 className="text-2xl font-bold">{item.title}</h3>
                      </div>
                      <p className="text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>


        {/* Pricing Section */}
        <section id="pricing" className="bg-background/80 backdrop-blur-sm py-20">
          <div className="container mx-auto px-4">
            <div className="text-center space-y-4 mb-16">
              <Badge className="bg-primary/10 text-primary border-primary/20">
                <TrendingUp className="w-4 h-4 mr-2" />
                Simple Pricing
              </Badge>
              <h2 className="text-4xl lg:text-5xl font-bold">
                Choose Your <span className="bg-gradient-saffron bg-clip-text text-transparent">Perfect Plan</span>
              </h2>
              <p className="text-xl text-muted-foreground">
                Start for free, upgrade when you're ready. No hidden fees, cancel anytime.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {/* Free Plan */}
              <Card className="relative border-2 border-border shadow-card-soft">
                <CardHeader className="text-center space-y-4">
                  <CardTitle className="text-2xl">Free</CardTitle>
                  <CardDescription>Perfect for single property owners</CardDescription>
                  <div className="space-y-2">
                    <div className="text-4xl font-bold text-primary">Free</div>
                    <div className="text-sm text-muted-foreground">Forever</div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    {[
                      "Up to 1 Property",
                      "Rent Management",
                      "Tenant Management", 
                      "Basic Reports",
                      "Mobile App Access"
                    ].map((feature, index) => (
                      <div key={index} className="flex items-center">
                        <Check className="w-5 h-5 text-accent mr-3" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                  <Button className="w-full" variant="outline" onClick={() => handleChoosePlan('free')}>
                    Get Started Free
                  </Button>
                </CardContent>
              </Card>

              {/* Starter Plan */}
              <Card className="relative border-2 border-primary shadow-trust transform scale-105">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-gradient-saffron text-white px-4 py-1">
                    <Star className="w-4 h-4 mr-1" />
                    Most Popular
                  </Badge>
                </div>
                <CardHeader className="text-center space-y-4">
                  <CardTitle className="text-2xl">Starter</CardTitle>
                  <CardDescription>For growing PG businesses</CardDescription>
                  <div className="space-y-2">
                    <div className="text-4xl font-bold text-primary">₹99</div>
                    <div className="text-sm text-muted-foreground">per property per month</div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    {[
                      "Up to 5 Properties",
                      "All Free Features",
                      "Cloud Sync & Backup",
                      "AI Rent Reminders",
                      "Advanced Analytics",
                      "WhatsApp Integration",
                      "Priority Support"
                    ].map((feature, index) => (
                      <div key={index} className="flex items-center">
                        <Check className="w-5 h-5 text-accent mr-3" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                  <Button className="w-full" variant="hero" onClick={() => handleChoosePlan('starter')}>
                    Choose Starter
                  </Button>
                </CardContent>
              </Card>

              {/* Pro Plan */}
              <Card className="relative border-2 border-border shadow-card-soft">
                <CardHeader className="text-center space-y-4">
                  <CardTitle className="text-2xl">Pro</CardTitle>
                  <CardDescription>For large-scale operations</CardDescription>
                  <div className="space-y-2">
                    <div className="text-4xl font-bold text-primary">₹199</div>
                    <div className="text-sm text-muted-foreground">per property per month</div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    {[
                      "Unlimited Properties",
                      "All Starter Features",
                      "Advanced Automation",
                      "Custom Reports",
                      "API Access",
                      "Dedicated Support",
                      "White-label Option"
                    ].map((feature, index) => (
                      <div key={index} className="flex items-center">
                        <Check className="w-5 h-5 text-accent mr-3" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                  <Button className="w-full" variant="success" onClick={() => handleChoosePlan('pro')}>
                    Choose Pro
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="text-center mt-12">
              <p className="text-muted-foreground mb-4">
                Need a custom solution? Enterprise plans available for large-scale operations.
              </p>
              <Button variant="outline" size="lg" onClick={() => handleChoosePlan('enterprise')}>
                Contact Sales →
              </Button>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="container mx-auto px-4 py-20">
          <div className="text-center space-y-4 mb-16">
            <Badge className="bg-accent/10 text-accent border-accent/20">
              <Heart className="w-4 h-4 mr-2" />
              Customer Love
            </Badge>
            <h2 className="text-4xl lg:text-5xl font-bold">
              What PG Owners <span className="bg-gradient-saffron bg-clip-text text-transparent">Say About Us</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "Rajesh Kumar",
                location: "Delhi",
                text: "RentVastu ने मेरा PG business completely transform कर दिया। Now I can manage 3 properties effortlessly!",
                rating: 5
              },
              {
                name: "Priya Sharma", 
                location: "Bangalore",
                text: "The automated rent reminders and tenant management features have saved me 15+ hours every week. Highly recommended!",
                rating: 5
              },
              {
                name: "Mohammed Ali",
                location: "Pune", 
                text: "Finally, a software that understands Indian PG business. The Hindi support और local features are amazing!",
                rating: 5
              }
            ].map((testimonial, index) => (
              <Card key={index} className="border-0 shadow-card-soft hover:shadow-trust transition-all duration-300">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex space-x-1">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-5 h-5 fill-accent text-accent" />
                      ))}
                    </div>
                    <p className="text-muted-foreground italic leading-relaxed">
                      "{testimonial.text}"
                    </p>
                    <div className="border-t pt-4">
                      <div className="font-semibold text-foreground">{testimonial.name}</div>
                      <div className="text-sm text-muted-foreground">{testimonial.location}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-gradient-hero py-20">
          <div className="container mx-auto px-4 text-center space-y-8">
            <div className="space-y-4">
              <h2 className="text-4xl lg:text-5xl font-bold text-white">
                Ready to Transform Your PG Business?
              </h2>
              <p className="text-xl text-white/90 max-w-3xl mx-auto">
                Join thousands of PG owners who have switched to a smarter way of working. 
                Get started in minutes, no credit card required.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-white text-primary hover:bg-white/90 font-semibold px-8 py-4 text-lg" asChild>
                <Link href="/login">
                  <Smartphone className="mr-2 h-5 w-5" />
                  Start Free Today
                </Link>
              </Button>
            </div>

            <div className="flex items-center justify-center space-x-8 text-sm text-white/80">
              <div className="flex items-center">
                <Check className="w-4 h-4 mr-2" />
                Free Forever Plan
              </div>
              <div className="flex items-center">
                <Check className="w-4 h-4 mr-2" />
                Setup in 5 Minutes
              </div>
              <div className="flex items-center">
                <Check className="w-4 h-4 mr-2" />
                No Credit Card Required
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-card text-card-foreground py-12">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-4 gap-8">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-saffron rounded-lg flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-2xl font-bold">RentVastu</span>
                </div>
                <p className="text-muted-foreground">
                  India's most trusted PG management platform. Built by Indians, for Indians.
                </p>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-lg">Product</h4>
                <ul className="space-y-2 text-muted-foreground">
                  <li><Link href="#features" className="hover:text-primary transition-colors">Features</Link></li>
                  <li><Link href="#pricing" className="hover:text-primary transition-colors">Pricing</Link></li>
                  <li><Link href="/login" className="hover:text-primary transition-colors">Mobile App</Link></li>
                </ul>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-lg">Support</h4>
                <ul className="space-y-2 text-muted-foreground">
                  <li><a href="#" className="hover:text-primary transition-colors">Help Center</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">Contact Us</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">WhatsApp Support</a></li>
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
                    hello@rentvastu.com
                  </li>
                </ul>
              </div>
            </div>

            <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
              <p>&copy; {new Date().getFullYear()} RentVastu. All rights reserved. Made with ❤️ in India.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Index;

    