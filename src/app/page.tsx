
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Check, LayoutDashboard, Wallet, MessageSquareWarning, BotMessageSquare, Users, Settings, ChefHat } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import InstallPWA from '@/components/install-pwa';
import { plans } from '@/lib/mock-data';
import type { Plan, PlanName } from '@/lib/types';
import { cn } from '@/lib/utils';

const features = [
    {
        icon: <LayoutDashboard className="h-8 w-8 text-primary" />,
        title: 'Visual Occupancy Dashboard',
        description: 'Ditch spreadsheets. Manage floors, rooms, and beds visually. See vacancies and guest details at a glance.',
      },
      {
        icon: <Wallet className="h-8 w-8 text-primary" />,
        title: 'Automated Finance Tracking',
        description: 'Effortlessly log expenses and track monthly revenue. Get a clear, real-time view of your PG’s financial health.',
      },
      {
        icon: <BotMessageSquare className="h-8 w-8 text-primary" />,
        title: 'AI-Powered Communication',
        description: 'Save time with AI-generated rent reminders and SEO-friendly listings to attract more high-quality tenants.',
      },
      {
        icon: <Users className="h-8 w-8 text-primary" />,
        title: 'Centralized Management',
        description: 'Handle guest onboarding, complaints, and staff management all from one unified, easy-to-use platform.',
      },
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

const planOrder: PlanName[] = ['free', 'pro', 'enterprise'];

export default function Home() {
  return (
    <div className="flex flex-col min-h-[calc(100vh-56px)] bg-background">
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-24 md:py-32">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 animate-in fade-in slide-in-from-top-8 duration-700 ease-out">
              The Modern OS for Your PG
            </h1>
            <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto animate-in fade-in slide-in-from-top-8 duration-700 ease-out delay-100">
              Stop juggling spreadsheets. PGOasis automates your operations, from rent collection to guest management, all in one simple platform.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in zoom-in-95 duration-500 ease-out delay-200">
              <Button size="lg" asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <Link href="/dashboard">Get Started for Free</Link>
              </Button>
              <InstallPWA />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-16 md:py-24 bg-muted/40">
            <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                    <Badge variant="outline" className="mb-4">Our Features</Badge>
                    <h2 className="text-3xl md:text-4xl font-bold">Everything You Need. Nothing You Don't.</h2>
                    <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
                        PGOasis is built to solve the real problems of PG management.
                    </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {features.map((feature, index) => (
                        <div key={feature.title} className="text-center p-2" >
                             <div className="flex items-center justify-center w-16 h-16 rounded-full bg-background mx-auto mb-6 ring-1 ring-border">
                                {feature.icon}
                             </div>
                            <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                            <p className="text-muted-foreground text-sm">{feature.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
        
        {/* Pricing Section */}
        <section id="pricing" className="py-16 md:py-24 bg-background">
            <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                    <Badge variant="outline" className="mb-4">Simple Pricing</Badge>
                    <h2 className="text-3xl md:text-4xl font-bold">Choose Your Plan</h2>
                    <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
                        Start for free, upgrade when you're ready. No hidden fees.
                    </p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-5xl mx-auto items-start">
                    {planOrder.map(planId => {
                        const plan = plans[planId];
                        const isPopular = plan.id === 'pro';
                        return (
                            <Card key={plan.id} className={cn("p-8", isPopular && "border-2 border-primary relative")}>
                                {isPopular && <Badge className="absolute -top-4 left-1/2 -translate-x-1/2">Most Popular</Badge>}
                                <CardContent className="p-0">
                                    <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                                    <p className="text-muted-foreground mb-6 h-10">{plan.description}</p>
                                    <div className="mb-6">
                                        <span className="text-4xl font-bold">
                                            {typeof plan.price === 'number' ? `₹${plan.price}`: plan.price}
                                        </span>
                                        <span className="text-muted-foreground text-sm">{plan.pricePeriod}</span>
                                    </div>
                                    <ul className="space-y-3 mb-8 text-sm">
                                        <li className="flex items-center gap-3"><Check className="w-5 h-5 text-green-500"/>{plan.pgLimit === 'unlimited' ? 'Unlimited' : `Up to ${plan.pgLimit}`} PG{plan.pgLimit !== 1 && 's'}</li>
                                        <li className="flex items-center gap-3"><Check className="w-5 h-5 text-green-500"/>{plan.bedLimit === 'unlimited' ? 'Unlimited' : `${plan.bedLimit}`} Beds</li>
                                        <li className="flex items-center gap-3"><Check className="w-5 h-5 text-green-500"/>{plan.hasComplaints ? 'Complaint Management' : <span className="text-muted-foreground">Basic Support</span>}</li>
                                        <li className="flex items-center gap-3"><Check className="w-5 h-5 text-green-500"/>{plan.hasStaffManagement ? 'Staff Management' : <span className="text-muted-foreground">Single User</span>}</li>
                                        <li className="flex items-center gap-3"><Check className="w-5 h-5 text-green-500"/>{plan.hasAiRentReminders ? 'AI Reminders' : <span className="text-muted-foreground">Manual Reminders</span>}</li>
                                    </ul>
                                    <Button variant={isPopular ? 'default' : 'outline'} className={cn("w-full", isPopular && "bg-accent hover:bg-accent/90 text-accent-foreground")}>
                                      <Link href="/signup">
                                        {plan.price === 0 ? 'Get Started' : 'Choose Plan'}
                                      </Link>
                                    </Button>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 md:py-24 bg-muted/40">
            <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold">Frequently Asked Questions</h2>
                </div>
                <div className="max-w-3xl mx-auto">
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
        <section className="py-24 md:py-32 bg-background">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Simplify Your PG Management?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join hundreds of PG owners who have switched to a smarter way of working. Get started in minutes, no credit card required.
            </p>
            <Button size="lg" asChild className="bg-accent hover:bg-accent/90 text-accent-foreground text-lg py-6 px-8">
              <Link href="/signup">Start Your Free Trial</Link>
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-muted/40 border-t">
        <div className="container mx-auto px-4 py-6 text-center text-muted-foreground text-sm">
          <p>&copy; {new Date().getFullYear()} PGOasis. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
