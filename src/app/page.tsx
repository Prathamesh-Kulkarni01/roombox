
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, CheckCircle, Clock, FileText, IndianRupee, PieChart, Star, ThumbsUp, Users, Wand2, Zap } from 'lucide-react';

const painPoints = [
    { title: 'Scattered Spreadsheets', description: 'Juggling multiple files for rent, expenses, and guest data.', icon: <FileText className="w-10 h-10 text-destructive" /> },
    { title: 'Manual Rent Reminders', description: 'Endless follow-ups via calls and messages every month.', icon: <Clock className="w-10 h-10 text-destructive" /> },
    { title: 'Lost Complaint Slips', description: 'Losing track of tenant issues written on paper scraps.', icon: <ThumbsUp className="w-10 h-10 text-destructive" /> },
    { title: 'Onboarding Hassles', description: 'Lengthy paperwork and verification processes for new guests.', icon: <Users className="w-10 h-10 text-destructive" /> },
];

const stats = [
  {
    value: '90%',
    title: 'Less Paperwork',
    description: 'Digitize everything from rent receipts to KYC documents.',
    icon: <FileText className="h-8 w-8 text-primary" />,
  },
  {
    value: '40%',
    title: 'Faster Rent Collection',
    description: 'Automated reminders and diverse payment options improve cash flow.',
     icon: <IndianRupee className="h-8 w-8 text-primary" />,
  },
  {
    value: '15+',
    title: 'Hours Saved Weekly',
    description: 'Automate tedious tasks and focus on growing your business.',
    icon: <Clock className="h-8 w-8 text-primary" />,
  },
   {
    value: '5-Star',
    title: 'Tenant Ratings',
    description: 'Resolve issues faster and offer a modern, professional experience.',
    icon: <Star className="h-8 w-8 text-primary" />,
  },
];

const features = [
  {
    icon: <PieChart className="h-8 w-8 text-primary" />,
    title: 'Automated Dashboard',
    description: 'Get a real-time overview of your occupancy, revenue, and open complaints at a glance.',
  },
  {
    icon: <Zap className="h-8 w-8 text-primary" />,
    title: 'Visual Occupancy Management',
    description: 'Visually manage your PG layout, assign guests to beds, and track move-ins and move-outs easily.',
  },
  {
    icon: <Wand2 className="h-8 w-8 text-primary" />,
    title: 'AI-Powered Tools',
    description: 'Generate SEO-friendly listings and polite rent reminders to save time and improve outreach.',
  },
];


export default function Home() {
  return (
    <div className="flex flex-col min-h-[calc(100vh-56px)]">
      <main className="flex-1 overflow-x-hidden">
        {/* Hero Section */}
        <section className="relative py-20 md:py-32 bg-gradient-to-b from-primary/5 via-primary/10 to-primary/5">
          <div className="absolute top-0 left-0 w-full h-full bg-grid-slate-900/[0.04] [mask-image:linear-gradient(to_bottom,white_5%,transparent_90%)]"></div>
          <div className="container mx-auto px-4 text-center relative">
            <h1 className="text-4xl md:text-6xl font-bold font-headline mb-6 animate-in fade-in slide-in-from-top-8 duration-700 ease-out">
              Stop Juggling Spreadsheets. <br /> Start Growing Your PG Empire.
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-3xl mx-auto animate-in fade-in slide-in-from-top-8 duration-700 ease-out delay-100">
              PGOasis is the all-in-one platform that automates your daily tasks, from rent collection to complaint management, giving you back your time and boosting your profits.
            </p>
            <div className="flex justify-center gap-4 animate-in fade-in zoom-in-95 duration-500 ease-out delay-200">
              <Button size="lg" asChild className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg hover:shadow-xl transition-shadow">
                <Link href="/dashboard">Get Started for Free</Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="bg-background/50">
                <Link href="#features">Learn More <ArrowRight className="ml-2 h-5 w-5" /></Link>
              </Button>
            </div>
             <div className="mt-16 animate-in fade-in zoom-in-95 duration-700 ease-out delay-300">
                <Image
                    src="https://placehold.co/1200x600.png"
                    width={1200}
                    height={600}
                    alt="Dashboard mockup on a laptop"
                    className="rounded-t-lg shadow-2xl mx-auto"
                    data-ai-hint="dashboard laptop mockup"
                />
            </div>
          </div>
        </section>

        {/* Pain Points Section */}
        <section className="py-16 md:py-24 bg-background">
            <div className="container mx-auto px-4">
                <div className="text-center mb-12 animate-in fade-in duration-500">
                    <h2 className="text-3xl md:text-4xl font-bold font-headline">Sound Familiar? The Chaos of Manual Management</h2>
                    <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
                        If you're still relying on outdated methods, you're losing time, money, and your peace of mind.
                    </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    {painPoints.map((point, index) => (
                        <Card key={point.title} className="text-center p-6 bg-card border-2 border-dashed border-destructive/30 hover:border-destructive hover:shadow-lg hover:scale-105 transition-all duration-300 animate-in fade-in zoom-in-95" style={{ animationDelay: `${index * 100}ms`}}>
                             <CardContent className="p-0 flex flex-col items-center gap-4">
                                {point.icon}
                                <h3 className="text-xl font-semibold">{point.title}</h3>
                                <p className="text-muted-foreground">{point.description}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
        
        {/* Stats Section */}
        <section className="py-16 md:py-24 bg-primary/10">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12 animate-in fade-in duration-500">
              <h2 className="text-3xl md:text-4xl font-bold font-headline">The PGOasis Advantage: Real Results, Fast.</h2>
              <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
                Our platform is designed to deliver a measurable impact on your business from day one.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
               {stats.map((stat, index) => (
                <Card key={stat.title} className="bg-card p-2 hover:-translate-y-2 transition-transform duration-300 hover:shadow-2xl hover:shadow-primary/20 animate-in fade-in zoom-in-95" style={{ animationDelay: `${index * 100}ms`}}>
                   <CardContent className="p-6 flex flex-col items-start gap-3 text-left">
                     <span className="text-4xl font-bold text-primary">{stat.value}</span>
                     <h3 className="text-xl font-semibold">{stat.title}</h3>
                     <p className="text-muted-foreground">{stat.description}</p>
                   </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits/How it Works Section */}
         <section className="py-16 md:py-24 bg-background">
            <div className="container mx-auto px-4">
                 <div className="grid lg:grid-cols-2 gap-12 items-center">
                    <div className="order-2 lg:order-1 animate-in fade-in slide-in-from-left-16 duration-700 ease-out">
                        <h2 className="text-3xl md:text-4xl font-bold font-headline mb-6">From Chaos to Control in a Few Clicks</h2>
                        <p className="text-muted-foreground mb-8 text-lg">
                           PGOasis provides powerful, easy-to-use tools that give you complete command over your properties.
                        </p>
                        <ul className="space-y-4">
                            <li className="flex items-start gap-3">
                                <CheckCircle className="w-6 h-6 text-green-500 mt-1 shrink-0" />
                                <div>
                                    <h4 className="font-semibold">Centralize Your Operations</h4>
                                    <p className="text-muted-foreground">Manage multiple PGs from a single dashboard. Track occupancy, finances, and maintenance without switching apps.</p>
                                </div>
                            </li>
                            <li className="flex items-start gap-3">
                                <CheckCircle className="w-6 h-6 text-green-500 mt-1 shrink-0" />
                                <div>
                                    <h4 className="font-semibold">Automate Your Finances</h4>
                                    <p className="text-muted-foreground">Get paid faster with automated reminders, easy payment tracking, and insightful expense logging.</p>
                                </div>
                            </li>
                             <li className="flex items-start gap-3">
                                <CheckCircle className="w-6 h-6 text-green-500 mt-1 shrink-0" />
                                <div>
                                    <h4 className="font-semibold">Enhance Tenant Happiness</h4>
                                    <p className="text-muted-foreground">Quickly resolve issues, manage food menus, and provide a professional experience that keeps tenants staying longer.</p>
                                </div>
                            </li>
                        </ul>
                    </div>
                    <div className="order-1 lg:order-2 animate-in fade-in slide-in-from-right-16 duration-700 ease-out">
                        <Image
                            src="https://placehold.co/600x500.gif"
                            width={600}
                            height={500}
                            alt="Animated GIF of the dashboard in use"
                            className="rounded-lg shadow-2xl"
                            data-ai-hint="dashboard animated gif"
                            unoptimized
                         />
                    </div>
                 </div>
            </div>
        </section>
        
        {/* Features Section */}
        <section id="features" className="py-16 md:py-24 bg-primary/10">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12 animate-in fade-in duration-500">
              <h2 className="text-3xl md:text-4xl font-bold font-headline">Powerful Features, Effortless Control</h2>
              <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
                Everything you need to run your PG business like a pro, without the complexity.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <Card key={feature.title} className="bg-card p-2 hover:-translate-y-2 transition-transform duration-300 hover:shadow-2xl hover:shadow-primary/20 animate-in fade-in zoom-in-95" style={{ animationDelay: `${index * 100}ms`}}>
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

        {/* Case Study Section */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center animate-in fade-in zoom-in-95 duration-700 ease-out">
                 <h2 className="text-3xl md:text-4xl font-bold font-headline mb-12">A Success Story: How Ravi Doubled His Efficiency</h2>
                 <div className="grid md:grid-cols-5 gap-8 items-center text-left">
                    <div className="md:col-span-2">
                        <Image
                            src="https://placehold.co/400x400.png"
                            width={400}
                            height={400}
                            alt="Testimonial author Ravi Kumar"
                            className="rounded-full mx-auto shadow-lg"
                            data-ai-hint="smiling indian man"
                        />
                    </div>
                    <div className="md:col-span-3">
                         <blockquote className="text-xl md:text-2xl font-medium mb-6 border-l-4 border-primary pl-6">
                            "PGOasis completely changed how I manage my properties. I used to spend my weekends chasing payments. Now, it's all automated. I wish I had this years ago!"
                        </blockquote>
                        <cite className="font-semibold text-lg not-italic">Ravi Kumar</cite>
                        <p className="text-muted-foreground mb-6">Owner, Kumar Comforts PG</p>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <h4 className="font-bold mb-1">Before PGOasis:</h4>
                                <p className="text-muted-foreground">Wasted hours on spreadsheets, rent follow-ups, and lost complaint notes.</p>
                            </div>
                             <div>
                                <h4 className="font-bold mb-1">After PGOasis:</h4>
                                <p className="text-muted-foreground">Manages everything from one dashboard, saving time and improving tenant relations.</p>
                            </div>
                        </div>
                    </div>
                 </div>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-20 md:py-32 bg-primary/5">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold font-headline mb-6 animate-in fade-in zoom-in-95 duration-500">
              Ready to Take Control of Your PG?
            </h2>
            <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto animate-in fade-in zoom-in-95 duration-500 delay-100">
              Join dozens of other PG owners who have switched to a smarter way of working. Get started in minutes.
            </p>
            <Button size="lg" asChild className="bg-accent hover:bg-accent/90 text-accent-foreground text-lg py-6 px-8 animate-in fade-in zoom-in-95 duration-500 delay-200">
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
