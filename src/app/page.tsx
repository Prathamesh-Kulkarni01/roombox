
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/lib/hooks';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Star, Users, Shield, Smartphone, TrendingUp, Heart, Zap, Globe, Phone, MapPin, IndianRupee, Building2, UserCheck, Clock, MessageSquare, BarChart3, Bot } from "lucide-react";
import Image from 'next/image';

const Index = () => {
    const router = useRouter();
    const { currentUser, isLoading } = useAppSelector((state) => ({
      currentUser: state.user.currentUser,
      isLoading: state.app.isLoading,
    }));
  
    useEffect(() => {
      if (!isLoading && currentUser) {
        if (currentUser.role === 'tenant') {
          router.replace('/tenants/my-pg');
        } else {
          router.replace('/dashboard');
        }
      }
    }, [isLoading, currentUser, router]);

  return (
    <div className="min-h-screen bg-background">

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <Badge className="bg-primary/10 text-primary border-primary/20 px-4 py-2">
              <Star className="w-4 h-4 mr-2" />
              The Modern OS for Your Rental Property
            </Badge>
            
            <div className="space-y-6">
              <h1 className="text-4xl lg:text-6xl font-bold leading-tight">
                <span className="text-foreground">Stop Managing,</span>
                <br />
                <span className="bg-gradient-saffron bg-clip-text text-transparent">
                  Start Growing Your PG Business
                </span>
              </h1>
              
              <p className="text-xl text-muted-foreground leading-relaxed">
                RentVastu is the all-in-one platform that replaces your spreadsheets, reminder calls, and paperwork with a single, smart system. Give your tenants a professional experience and get your time back.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" variant="hero" className="text-lg px-8 py-4" asChild>
                 <Link href="/login">
                    <Smartphone className="mr-2 h-5 w-5" />
                    Start For Free
                </Link>
              </Button>
            </div>

            <div className="flex items-center space-x-8 text-sm text-muted-foreground">
              <div className="flex items-center">
                <Check className="w-4 h-4 text-accent mr-2" />
                No credit card required
              </div>
              <div className="flex items-center">
                <Check className="w-4 h-4 text-accent mr-2" />
                Free forever plan available
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 bg-gradient-hero rounded-3xl blur-2xl opacity-30 animate-pulse-slow"></div>
            <Image 
              src="https://placehold.co/600x600.png"
              alt="A smiling property manager using the RentVastu dashboard on a tablet"
              width={600}
              height={600}
              className="relative z-10 w-full h-auto rounded-3xl shadow-trust animate-float"
              data-ai-hint="property manager app"
            />
          </div>
        </div>
      </section>

       {/* Features Section */}
      <section id="features" className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
            <div className="text-center space-y-4 mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold">
                Standardize Your PG. Modernize Your Management.
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Impress tenants with a professional system that handles everything, so you can focus on providing the best living experience.
            </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
                {
                icon: Building2,
                title: "Centralized Dashboard",
                description: "Visualize your entire property—floors, rooms, and beds. See real-time occupancy and rent status at a glance.",
                },
                {
                icon: BarChart3,
                title: "Effortless Financials",
                description: "Ditch the manual ledgers. Track every expense and rent payment automatically. See your property's financial health instantly.",
                },
                {
                icon: Smartphone,
                title: "A Professional Tenant App",
                description: "Give your tenants a modern app to pay rent, raise complaints, and see announcements. Stand out from the competition.",
                },
                {
                icon: Bot,
                title: "AI-Powered Communication",
                description: "Automate polite rent reminders. Let our AI assistant answer common tenant questions about rules and menus, 24/7.",
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
        </div>
      </section>

      {/* Testimonials */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center space-y-4 mb-16">
          <Badge className="bg-accent/10 text-accent border-accent/20">
            <Heart className="w-4 h-4 mr-2" />
            Loved By Owners Like You
          </Badge>
          <h2 className="text-4xl lg:text-5xl font-bold">
            Don't Just Take Our Word For It
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {[
            {
              name: "Priya S., Bangalore",
              text: "RentVastu gave my PG a professional touch. My tenants love the app, and I love getting my rent on time without the reminder calls. It has saved me countless hours.",
              rating: 5
            },
            {
              name: "Amit Patel, Pune", 
              text: "I manage two properties. Before RentVastu, it was chaos. Now, I see everything in one dashboard—from which bed is empty to my total monthly collection. It’s a game-changer.",
              rating: 5
            }
          ].map((testimonial, index) => (
            <Card key={index} className="border-0 shadow-card-soft bg-muted/30">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex space-x-1">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-accent text-accent" />
                    ))}
                  </div>
                  <p className="text-lg text-foreground italic leading-relaxed">
                    "{testimonial.text}"
                  </p>
                  <div className="pt-2">
                    <div className="font-semibold text-foreground">{testimonial.name}</div>
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
              Ready to Upgrade Your PG?
            </h2>
            <p className="text-xl text-white/90 max-w-3xl mx-auto">
              Join thousands of owners who have switched to a smarter way of working. 
              Get started in minutes—your first property is on us.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-white text-primary hover:bg-white/90 font-semibold px-8 py-4 text-lg" asChild>
              <Link href="/login">
                <Zap className="mr-2 h-5 w-5" />
                Claim Your Free Account
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-muted/50 py-12">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <div className="flex justify-center items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-gradient-saffron rounded-lg flex items-center justify-center">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-foreground">RentVastu</span>
          </div>
          <p>&copy; {new Date().getFullYear()} RentVastu. All rights reserved. Made with ❤️ in India.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;

    