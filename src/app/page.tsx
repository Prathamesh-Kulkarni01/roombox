'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, BarChart, CheckCircle, ChefHat, FileText, IndianRupee, MessageSquareWarning, Users, Wand2, Zap } from 'lucide-react';

const features = [
  {
    icon: <Zap className="h-8 w-8 text-primary" />,
    title: 'Automated Dashboard',
    description: 'Get a real-time overview of your occupancy, revenue, and open complaints at a glance.',
  },
  {
    icon: <IndianRupee className="h-8 w-8 text-primary" />,
    title: 'Effortless Rent Collection',
    description: 'Track payments, accept partial payments, and send AI-powered reminders with a single click.',
  },
  {
    icon: <Users className="h-8 w-8 text-primary" />,
    title: 'Visual Occupancy Management',
    description: 'Visually manage your PG layout, assign guests to beds, and track move-ins and move-outs easily.',
  },
  {
    icon: <MessageSquareWarning className="h-8 w-8 text-primary" />,
    title: 'Centralized Complaint System',
    description: 'Log, track, and resolve guest complaints efficiently, ensuring tenant satisfaction.',
  },
  {
    icon: <ChefHat className="h-8 w-8 text-primary" />,
    title: 'Menu & Food Planning',
    description: 'Plan your weekly menu and keep tenants informed. Inventory management coming soon!',
  },
  {
    icon: <Wand2 className="h-8 w-8 text-primary" />,
    title: 'AI-Powered Tools',
    description: 'Generate SEO-friendly listings and polite rent reminders to save time and improve outreach.',
  },
];

const painPoints = [
    { title: 'Scattered Spreadsheets', description: 'Juggling multiple files for rent, expenses, and guest data.' },
    { title: 'Manual Rent Reminders', description: 'Endless follow-ups via calls and messages every month.' },
    { title: 'Lost Complaint Slips', description: 'Losing track of tenant issues written on paper scraps.' },
    { title: 'Onboarding Hassles', description: 'Lengthy paperwork and verification processes for new guests.' },
];


export default function Home() {
  return (
    <div className="flex flex-col min-h-[calc(100vh-56px)]">
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 md:py-32 bg-primary/10">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-6xl font-bold font-headline mb-6">
              The Modern Way to Manage Your PG
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-3xl mx-auto">
              Stop juggling spreadsheets and notebooks. PGOasis centralizes your operations, automates tedious tasks, and helps you provide a better experience for your tenants.
            </p>
            <div className="flex justify-center gap-4">
              <Button size="lg" asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <Link href="/dashboard">Get Started for Free</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="#features">Learn More <ArrowRight className="ml-2 h-5 w-5" /></Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Pain Points Section */}
        <section className="py-16 md:py-24 bg-background">
            <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold font-headline">Tired of the Old Way?</h2>
                    <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
                        If you're still relying on manual methods, you're losing time and money. Sound familiar?
                    </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    {painPoints.map((point) => (
                        <Card key={point.title} className="text-center p-6 bg-card border-2 border-dashed">
                             <CardContent className="p-0 flex flex-col items-center gap-4">
                                <FileText className="w-10 h-10 text-destructive" />
                                <h3 className="text-xl font-semibold">{point.title}</h3>
                                <p className="text-muted-foreground">{point.description}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
        
        {/* Features Section */}
        <section id="features" className="py-16 md:py-24 bg-primary/10">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold font-headline">Everything You Need, All in One Place</h2>
              <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
                PGOasis is packed with features designed specifically for PG owners to streamline their workflow.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature) => (
                <Card key={feature.title} className="bg-card p-2">
                   <CardContent className="p-6 flex flex-col items-start gap-4 text-left">
                     {feature.icon}
                     <h3 className="text-xl font-semibold">{feature.title}</h3>
                     <p className="text-muted-foreground">{feature.description}</p>
                   </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits Section */}
         <section className="py-16 md:py-24 bg-background">
            <div className="container mx-auto px-4">
                 <div className="grid lg:grid-cols-2 gap-12 items-center">
                    <div className="order-2 lg:order-1">
                        <h2 className="text-3xl md:text-4xl font-bold font-headline mb-6">Transform Your PG Business</h2>
                        <p className="text-muted-foreground mb-8 text-lg">
                           Move from chaos to control. Our platform empowers you to not just manage, but to grow.
                        </p>
                        <ul className="space-y-4">
                            <li className="flex items-start gap-3">
                                <CheckCircle className="w-6 h-6 text-green-500 mt-1 shrink-0" />
                                <div>
                                    <h4 className="font-semibold">Save 10+ Hours Every Week</h4>
                                    <p className="text-muted-foreground">Automate rent reminders, expense logging, and reporting so you can focus on what matters.</p>
                                </div>
                            </li>
                            <li className="flex items-start gap-3">
                                <CheckCircle className="w-6 h-6 text-green-500 mt-1 shrink-0" />
                                <div>
                                    <h4 className="font-semibold">Improve Cash Flow</h4>
                                    <p className="text-muted-foreground">Get paid faster with timely reminders and easy payment tracking, including partial payments.</p>
                                </div>
                            </li>
                             <li className="flex items-start gap-3">
                                <CheckCircle className="w-6 h-6 text-green-500 mt-1 shrink-0" />
                                <div>
                                    <h4 className="font-semibold">Enhance Tenant Happiness</h4>
                                    <p className="text-muted-foreground">Quickly resolve issues and provide a professional experience that keeps your tenants staying longer.</p>
                                </div>
                            </li>
                        </ul>
                    </div>
                    <div className="order-1 lg:order-2">
                        <Image
                            src="https://placehold.co/600x500.png"
                            width={600}
                            height={500}
                            alt="Dashboard screenshot"
                            className="rounded-lg shadow-2xl"
                            data-ai-hint="dashboard analytics"
                         />
                    </div>
                 </div>
            </div>
        </section>

        {/* Testimonial Section */}
        <section className="py-16 md:py-24 bg-primary/10">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <Image
                  src="https://placehold.co/100x100.png"
                  width={100}
                  height={100}
                  alt="Testimonial author"
                  className="rounded-full mx-auto mb-6"
                  data-ai-hint="smiling person"
                />
              <blockquote className="text-xl md:text-2xl font-medium mb-4">
                "PGOasis completely changed how I manage my properties. I used to spend my weekends chasing payments. Now, it's all automated. I wish I had this years ago!"
              </blockquote>
              <cite className="font-semibold text-lg not-italic">Ravi Kumar</cite>
              <p className="text-muted-foreground">Owner, Kumar Comforts PG</p>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-20 md:py-32 bg-background">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold font-headline mb-6">
              Ready to Simplify Your PG Management?
            </h2>
            <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
              Join dozens of other PG owners who have switched to a smarter way of working.
            </p>
            <Button size="lg" asChild className="bg-accent hover:bg-accent/90 text-accent-foreground text-lg py-6 px-8">
              <Link href="/dashboard">Start Your Free Trial Today</Link>
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-muted/40 border-t">
        <div className="container mx-auto px-4 py-6 text-center text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} PGOasis. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
