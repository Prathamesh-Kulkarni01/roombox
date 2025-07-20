
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/lib/hooks';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Check, LayoutDashboard, Wallet, Cloud, BotMessageSquare, X, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import InstallPWA from '@/components/install-pwa';
import { plans } from '@/lib/mock-data';
import type { Plan, PlanName } from '@/lib/types';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';


const features = [
    {
        icon: <LayoutDashboard className="h-8 w-8 text-primary" />,
        title: 'Visual Occupancy Dashboard',
        description: 'Ditch spreadsheets. Our intuitive property management dashboard lets you manage floors, rooms, and beds visually. See vacancies and guest details at a glance.',
      },
      {
        icon: <Wallet className="h-8 w-8 text-primary" />,
        title: 'Automated Finance Tracking',
        description: 'Effortlessly log expenses, track monthly revenue, and simplify rent collection. Get a clear, real-time view of your property’s financial health.',
      },
      {
        icon: <BotMessageSquare className="h-8 w-8 text-primary" />,
        title: 'AI-Powered Communication',
        description: 'Save time with AI-generated rent reminders and create SEO-friendly property listings to attract more high-quality tenants.',
      },
      {
        icon: <Cloud className="h-8 w-8 text-primary" />,
        title: 'Cloud Sync & Backup',
        description: 'Never lose your data. Paid plans securely back up your property data to the cloud, making it accessible from any device, anytime.',
      },
];

const faqs = [
    {
        question: "Is my data secure?",
        answer: "Absolutely. We use industry-standard encryption and security protocols to ensure your data is safe and private. You own your data, and we're committed to protecting it."
    },
    {
        question: "Can I manage multiple properties with one account?",
        answer: "Yes! RentVastu is designed to scale with your business. You can add and manage multiple properties, PGs, or hostels from a single, centralized dashboard, making it easy to oversee your entire rental portfolio."
    },
    {
        question: "How does the AI work?",
        answer: "Our AI tools are designed to be your smart assistant. For example, when you need to send a rent reminder, the AI analyzes the guest's details and generates a polite, professional message, saving you time and effort."
    },
    {
        question: "Is there a free trial?",
        answer: "RentVastu offers a free basic plan that's perfect for getting started. You can explore our core features and see how they fit your needs. When you're ready, you can upgrade to a paid plan for more advanced capabilities."
    }
]

const planOrder: PlanName[] = ['free', 'starter', 'pro'];

const getPlanFeatures = (plan: Plan) => [
    { text: `${plan.pgLimit === 'unlimited' ? 'Unlimited' : `Up to ${plan.pgLimit}`} Propert${plan.pgLimit !== 1 ? 'ies' : 'y'}`, included: true },
    { text: 'Rent Management', included: true },
    { text: 'Complaint Management', included: plan.hasComplaints },
    { text: 'Staff Management', included: plan.hasStaffManagement },
    { text: 'AI Rent Reminders', included: plan.hasAiRentReminders },
    { text: 'AI SEO Generator', included: plan.hasSeoGenerator },
    { text: 'Cloud Sync & Backup', included: plan.hasCloudSync },
    { text: 'WhatsApp Automation', included: plan.hasAutomatedWhatsapp },
    { text: 'Marketplace Listing', included: plan.hasMarketplace, isComingSoon: plan.id !== 'enterprise' },
];


export default function Home() {
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

  // if (isLoading || currentUser) {
  //   return (
  //     <div className="flex flex-col items-center justify-center min-h-[calc(100vh-56px)]">
  //        <div className="container mx-auto px-4 text-center py-24 md:py-32">
  //           <Skeleton className="h-12 md:h-16 w-3/4 mx-auto mb-6" />
  //           <Skeleton className="h-6 w-full max-w-2xl mx-auto mb-10" />
  //           <div className="flex justify-center gap-4">
  //               <Skeleton className="h-12 w-48" />
  //           </div>
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <div className="flex flex-col min-h-[calc(100vh-56px)] bg-background">
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-24 md:py-32">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 animate-in fade-in slide-in-from-top-8 duration-700 ease-out">
              The Modern OS for Your Rental Property
            </h1>
            <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto animate-in fade-in slide-in-from-top-8 duration-700 ease-out delay-100">
              Stop juggling spreadsheets. RentVastu automates your operations, from rent collection to guest management, all in one simple platform.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in zoom-in-95 duration-500 ease-out delay-200">
              <Button size="lg" asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <Link href="/login">
                    Get Started Now
                </Link>
              </Button>
            </div>
            <div className="mt-6">
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
                        RentVastu is built to solve the real problems of rental management.
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
                        Start for free, upgrade when you're ready. No hidden fees, cancel anytime.
                    </p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-5xl mx-auto items-start">
                    {planOrder.map(planId => {
                        const plan = plans[planId];
                        const isPopular = plan.id === 'starter';
                        const planFeatures = getPlanFeatures(plan);
                        return (
                            <Card key={plan.id} className={cn("p-6 flex flex-col", isPopular && "border-2 border-primary relative")}>
                                {isPopular && <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Most Popular</Badge>}
                                <CardContent className="p-0 flex-grow">
                                    <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                                    <p className="text-muted-foreground mb-6 h-10">{plan.description}</p>
                                    <div className="mb-6">
                                        <span className="text-4xl font-bold">
                                            {typeof plan.price === 'number' && plan.price > 0 ? `₹${plan.price}` : plan.price === 0 ? 'Free' : plan.price}
                                        </span>
                                        <span className="text-muted-foreground text-sm ml-1">{plan.pricePeriod}</span>
                                    </div>
                                    <ul className="space-y-3 mb-8 text-sm">
                                        {planFeatures.map(feature => (
                                            <li key={feature.text} className={cn("flex items-start gap-3", !feature.included && "text-muted-foreground")}>
                                                {feature.included ? <Check className="w-5 h-5 text-green-500 mt-0.5 shrink-0"/> : <X className="w-5 h-5 text-red-500 mt-0.5 shrink-0"/>}
                                                <span>
                                                    {feature.text}
                                                    {feature.isComingSoon && <Badge variant="outline" className="ml-2 text-xs">Soon</Badge>}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                                <Button asChild variant={isPopular ? 'default' : 'outline'} className={cn("w-full mt-4", isPopular && "bg-accent hover:bg-accent/90 text-accent-foreground")}>
                                    <Link href="/login">
                                      {plan.price === 0 ? 'Get Started' : 'Choose Plan'}
                                    </Link>
                                </Button>
                            </Card>
                        )
                    })}
                </div>
                 <div className="text-center mt-12">
                    <Card className="inline-block p-6 max-w-lg mx-auto">
                        <CardContent className="p-0 text-left">
                           <h3 className="text-xl font-bold mb-4 text-center">Enterprise Plan</h3>
                           <p className="text-muted-foreground mb-4">Need a custom solution? We offer tailored plans for large-scale operations with features like marketplace listings, dedicated support, and custom integrations.</p>
                           <Button variant="link" className="p-0 h-auto">Contact Sales &rarr;</Button>
                        </CardContent>
                    </Card>
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
              Ready to Simplify Your Rental Management?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join hundreds of property owners who have switched to a smarter way of working. Get started in minutes, no credit card required.
            </p>
            <Button size="lg" asChild className="bg-accent hover:bg-accent/90 text-accent-foreground text-lg py-6 px-8">
              <Link href="/login">Start for Free</Link>
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-muted/40 border-t">
        <div className="container mx-auto px-4 py-6 text-center text-muted-foreground text-sm">
          <p>&copy; {new Date().getFullYear()} RentVastu. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
