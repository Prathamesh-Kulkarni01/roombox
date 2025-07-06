
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { ArrowRight, BedDouble, Check, IndianRupee, MessageCircle, PieChart, ShieldCheck, Users, Wand2, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const benefits = [
  {
    icon: <Zap className="h-8 w-8 text-primary" />,
    title: 'Save Time & Reduce Errors',
    description: 'Automate rent reminders, expense logging, and guest onboarding to reclaim your weekends and minimize manual mistakes.',
  },
  {
    icon: <IndianRupee className="h-8 w-8 text-primary" />,
    title: 'Increase Profitability',
    description: 'Get paid faster with automated collections. Track every rupee spent and earned for a crystal-clear view of your finances.',
  },
  {
    icon: <Users className="h-8 w-8 text-primary" />,
    title: 'Enhance Tenant Happiness',
    description: 'Resolve complaints faster, provide transparent communication, and offer a modern, professional experience that tenants love.',
  },
];

const features = [
  {
    value: "occupancy",
    title: "Visual Occupancy Management",
    description: "Ditch the confusing spreadsheets. Visually manage your entire PG layout, from floors and rooms to individual beds. See who's where, what's vacant, and manage move-ins/outs with a simple click.",
    image: "https://placehold.co/1024x768.png",
    imageHint: "PG layout management UI"
  },
  {
    value: "finance",
    title: "Automated Financial Dashboard",
    description: "Get a real-time pulse on your business. Track monthly revenue, log expenses with ease, and understand your profitability without complex calculations. PGOasis does the heavy lifting for you.",
    image: "https://placehold.co/1024x768.png",
    imageHint: "finance dashboard chart"
  },
  {
    value: "communication",
    title: "AI-Powered Smart Communication",
    description: "Communicate like a pro, effortlessly. Use AI to generate polite but firm rent reminders, and create SEO-optimized listings to attract more tenants. It's like having a personal assistant.",
    image: "https://placehold.co/1024x768.png",
    imageHint: "chat interface notifications"
  }
];

const faqs = [
    {
        question: "Is my data secure?",
        answer: "Absolutely. We use industry-standard encryption and security protocols to ensure your data is safe and private. You own your data, and we're committed to protecting it."
    },
    {
        question: "Can I manage multiple PGs with one account?",
        answer: "Yes! Our platform is designed to scale with your business. You can add and manage multiple PG locations from a single, centralized dashboard, making it easy to oversee your entire portfolio."
    },
    {
        question: "How does the AI work?",
        answer: "Our AI tools are designed to be your smart assistant. For example, when you need to send a rent reminder, the AI analyzes the guest's details and generates a polite, professional message, saving you time and effort."
    },
    {
        question: "Is there a free trial?",
        answer: "PGOasis offers a free basic plan that's perfect for getting started. You can explore our core features and see how they fit your needs. When you're ready, you can upgrade to a paid plan for more advanced capabilities."
    }
]


export default function Home() {
  return (
    <div className="flex flex-col min-h-[calc(100vh-56px)] bg-background">
      <main className="flex-1 overflow-x-hidden">
        {/* Hero Section */}
        <section className="relative py-20 md:py-32 bg-gradient-to-b from-background via-blue-50/50 to-background">
          <div className="absolute top-0 left-0 w-full h-full bg-grid-slate-900/[0.04] [mask-image:linear-gradient(to_bottom,white_5%,transparent_90%)]"></div>
          <div className="container mx-auto px-4 text-center relative">
            <h1 className="text-4xl md:text-6xl font-bold font-headline mb-6 animate-in fade-in slide-in-from-top-8 duration-700 ease-out">
              The Operating System for Your PG Business
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-3xl mx-auto animate-in fade-in slide-in-from-top-8 duration-700 ease-out delay-100">
              Go from chaotic spreadsheets to a streamlined, automated system. PGOasis centralizes your operations, automates rent collection, and enhances tenant satisfaction—all in one place.
            </p>
            <div className="flex justify-center gap-4 animate-in fade-in zoom-in-95 duration-500 ease-out delay-200">
              <Button size="lg" asChild className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg hover:shadow-xl transition-shadow">
                <Link href="/dashboard">Get Started for Free</Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="bg-background/50">
                <Link href="#features">See Features <ArrowRight className="ml-2 h-5 w-5" /></Link>
              </Button>
            </div>
             <div className="mt-16 animate-in fade-in zoom-in-95 duration-700 ease-out delay-300">
                <Image
                    src="https://placehold.co/1200x675.png"
                    width={1200}
                    height={675}
                    alt="PGOasis Dashboard Mockup"
                    className="rounded-t-xl border-2 border-border shadow-2xl mx-auto"
                    data-ai-hint="SaaS dashboard screenshot"
                    priority
                />
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-16 md:py-24 bg-background">
            <div className="container mx-auto px-4">
                <div className="text-center mb-12 animate-in fade-in duration-500">
                    <h2 className="text-3xl md:text-4xl font-bold font-headline">Stop Managing, Start Growing</h2>
                    <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
                        PGOasis is designed to solve the biggest headaches of PG management.
                    </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {benefits.map((benefit, index) => (
                        <div key={benefit.title} className="text-center p-6 animate-in fade-in zoom-in-95" style={{ animationDelay: `${index * 100}ms`}}>
                             <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-primary/10 mx-auto mb-6">
                                {benefit.icon}
                             </div>
                            <h3 className="text-xl font-semibold mb-2">{benefit.title}</h3>
                            <p className="text-muted-foreground">{benefit.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
        
        {/* Features with Tabs Section */}
        <section id="features" className="py-16 md:py-24 bg-primary/5">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12 animate-in fade-in duration-500">
              <h2 className="text-3xl md:text-4xl font-bold font-headline">Everything You Need, All In One Place</h2>
              <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
                Explore the powerful, intuitive features that give you complete control.
              </p>
            </div>
             <Tabs defaultValue="occupancy" className="w-full animate-in fade-in duration-500 delay-200">
              <TabsList className="grid w-full grid-cols-1 md:grid-cols-3 max-w-2xl mx-auto h-auto">
                {features.map(feature => (
                    <TabsTrigger key={feature.value} value={feature.value} className="py-2.5 text-base whitespace-normal">{feature.title}</TabsTrigger>
                ))}
              </TabsList>
              {features.map(feature => (
                 <TabsContent key={feature.value} value={feature.value} className="mt-10">
                    <Card className="overflow-hidden">
                       <div className="grid md:grid-cols-2 items-center">
                          <div className="p-8 md:p-12">
                             <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
                             <p className="text-muted-foreground text-lg">{feature.description}</p>
                          </div>
                          <div className="bg-muted h-full flex items-center justify-center p-8 md:p-0">
                             <Image
                                src={feature.image}
                                alt={feature.title}
                                width={1024}
                                height={768}
                                className="rounded-lg shadow-lg"
                                data-ai-hint={feature.imageHint}
                              />
                          </div>
                       </div>
                    </Card>
                 </TabsContent>
              ))}
            </Tabs>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-16 md:py-24 bg-background">
            <div className="container mx-auto px-4">
                <div className="text-center mb-12 animate-in fade-in duration-500">
                    <h2 className="text-3xl md:text-4xl font-bold font-headline">Simple Pricing for Every PG Owner</h2>
                    <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
                        Choose the plan that's right for you. Start for free, upgrade anytime.
                    </p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-5xl mx-auto items-center">
                    {/* Free Plan */}
                    <Card className="p-8 animate-in fade-in zoom-in-95 delay-100">
                        <CardContent className="p-0">
                            <h3 className="text-2xl font-bold mb-2">Basic</h3>
                            <p className="text-muted-foreground mb-6">For new owners getting started.</p>
                            <p className="text-4xl font-bold mb-6">Free</p>
                            <ul className="space-y-3 mb-8">
                                <li className="flex items-center gap-3"><Check className="w-5 h-5 text-green-500"/>Up to 1 PG</li>
                                <li className="flex items-center gap-3"><Check className="w-5 h-5 text-green-500"/>20 Beds</li>
                                <li className="flex items-center gap-3"><Check className="w-5 h-5 text-green-500"/>Basic Occupancy Mgt.</li>
                                <li className="flex items-center gap-3"><Check className="w-5 h-5 text-green-500"/>Manual Rent Tracking</li>
                            </ul>
                            <Button variant="outline" className="w-full">Get Started</Button>
                        </CardContent>
                    </Card>
                    {/* Pro Plan */}
                    <Card className="p-8 border-2 border-primary shadow-2xl shadow-primary/20 relative animate-in fade-in zoom-in-95 delay-200">
                         <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Most Popular</Badge>
                        <CardContent className="p-0">
                            <h3 className="text-2xl font-bold mb-2">Pro</h3>
                            <p className="text-muted-foreground mb-6">For growing businesses.</p>
                            <p className="text-4xl font-bold mb-6">₹999 <span className="text-lg font-normal text-muted-foreground">/mo</span></p>
                            <ul className="space-y-3 mb-8">
                                <li className="flex items-center gap-3"><Check className="w-5 h-5 text-green-500"/>Up to 5 PGs</li>
                                <li className="flex items-center gap-3"><Check className="w-5 h-5 text-green-500"/>Unlimited Beds</li>
                                <li className="flex items-center gap-3"><Check className="w-5 h-5 text-green-500"/>Expense & Complaint Mgt.</li>
                                <li className="flex items-center gap-3"><Check className="w-5 h-5 text-green-500"/>AI Reminders & SEO</li>
                                <li className="flex items-center gap-3"><Check className="w-5 h-5 text-green-500"/>Basic Analytics</li>
                            </ul>
                            <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">Choose Pro</Button>
                        </CardContent>
                    </Card>
                    {/* Enterprise Plan */}
                     <Card className="p-8 animate-in fade-in zoom-in-95 delay-300">
                        <CardContent className="p-0">
                            <h3 className="text-2xl font-bold mb-2">Enterprise</h3>
                            <p className="text-muted-foreground mb-6">For large-scale operators.</p>
                            <p className="text-4xl font-bold mb-6">Custom</p>
                            <ul className="space-y-3 mb-8">
                                <li className="flex items-center gap-3"><Check className="w-5 h-5 text-green-500"/>Unlimited PGs</li>
                                <li className="flex items-center gap-3"><Check className="w-5 h-5 text-green-500"/>WhatsApp API Integration</li>
                                <li className="flex items-center gap-3"><Check className="w-5 h-5 text-green-500"/>Advanced Analytics</li>
                                <li className="flex items-center gap-3"><Check className="w-5 h-5 text-green-500"/>Priority Support</li>
                            </ul>
                            <Button variant="outline" className="w-full">Contact Sales</Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 md:py-24 bg-primary/5">
            <div className="container mx-auto px-4">
                <div className="text-center mb-12 animate-in fade-in duration-500">
                    <h2 className="text-3xl md:text-4xl font-bold font-headline">Frequently Asked Questions</h2>
                </div>
                <div className="max-w-3xl mx-auto animate-in fade-in duration-500 delay-200">
                    <Accordion type="single" collapsible className="w-full">
                       {faqs.map((faq, index) => (
                           <AccordionItem value={`item-${index}`} key={index}>
                                <AccordionTrigger className="text-lg text-left">{faq.question}</AccordionTrigger>
                                <AccordionContent className="text-base text-muted-foreground">
                                    {faq.answer}
                                </AccordionContent>
                           </AccordionItem>
                       ))}
                    </Accordion>
                </div>
            </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-20 md:py-32 bg-background">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold font-headline mb-6 animate-in fade-in zoom-in-95 duration-500">
              Ready to Upgrade Your PG Management?
            </h2>
            <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto animate-in fade-in zoom-in-95 duration-500 delay-100">
              Join hundreds of other PG owners who have switched to a smarter way of working. Get started in minutes.
            </p>
            <Button size="lg" asChild className="bg-accent hover:bg-accent/90 text-accent-foreground text-lg py-6 px-8 animate-in fade-in zoom-in-95 duration-500 delay-200">
              <Link href="/dashboard">Start Your Free Trial</Link>
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
