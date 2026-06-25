'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/lib/hooks';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
    Check, Star, Users, Smartphone, Zap, Phone, IndianRupee, 
    Building2, Clock, MessageSquare, BarChart3, Bot, LayoutTemplate, 
    UserPlus, ArrowRight, WalletCards, LayoutList, FilePieChart, 
    X, Wallet, History, Banknote, Calendar, CheckCircle, BedDouble, 
    ShieldCheck, ArrowRightLeft, ArrowUpRight, Search, BookUser
} from "lucide-react";
import Image from 'next/image';
import { cn } from '@/lib/utils';
import InstallPWA from '@/components/install-pwa';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

const Index = () => {
    const router = useRouter();
    const { currentUser } = useAppSelector((state) => state.user);
  
    const handleCTA = () => {
      if (!currentUser) {
        router.push('/login');
      } else {
        router.push('/dashboard/wallet');
      }
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-primary/20 selection:text-primary">
            
            {/* Header */}
            <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="bg-primary text-white p-1.5 rounded-lg">
                            <Building2 className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-xl tracking-tight text-slate-900">RentSutra</span>
                    </div>
                    <nav className="hidden md:flex gap-6 items-center text-sm font-medium text-slate-600">
                        <a href="#features" className="hover:text-primary transition-colors">Features</a>
                        <a href="#comparison" className="hover:text-primary transition-colors">Why Us</a>
                        <a href="#pricing" className="hover:text-primary transition-colors">Pricing</a>
                        <a href="#faq" className="hover:text-primary transition-colors">FAQ</a>
                    </nav>
                    <div className="flex items-center gap-3">
                        <InstallPWA />
                        <Button onClick={handleCTA} className="shadow-md shadow-primary/20">
                            {currentUser ? 'Go to Dashboard' : 'Login / Register'}
                        </Button>
                    </div>
                </div>
            </header>

            {/* 1. Hero Section */}
            <section className="relative overflow-hidden pt-24 pb-32 lg:pt-32 lg:pb-40">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-100 via-white to-white -z-10"></div>
                <div className="container mx-auto px-4 text-center relative z-10">
                    <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 px-4 py-1.5 text-sm font-semibold rounded-full shadow-sm mb-6 inline-flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-500 fill-amber-500" /> 
                        The Financial OS for Indian PG Owners
                    </Badge>
                    
                    <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] text-slate-900 max-w-4xl mx-auto">
                        Stop Chasing Rent. <br className="hidden md:block"/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-600">
                            Start Scaling Your PG.
                        </span>
                    </h1>
                    
                    <p className="mt-6 text-lg md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
                        Automated ledgers, isolated escrow security deposits, and zero-discrepancy rent collection. Replace your WhatsApp groups and lost diaries with bank-grade financial tracking.
                    </p>
                    
                    <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
                        <Button size="lg" onClick={handleCTA} className="h-14 px-8 text-lg font-bold shadow-xl shadow-primary/30 w-full sm:w-auto group">
                            Start Free Trial
                            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </Button>
                        <p className="text-sm font-medium text-slate-500 sm:ml-4 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-emerald-500" /> No credit card required.
                        </p>
                    </div>

                    {/* Hero Dashboard Preview (Mockup) */}
                    <div className="mt-20 max-w-5xl mx-auto relative rounded-xl border border-slate-200/50 bg-white/50 p-2 shadow-2xl shadow-indigo-900/5 backdrop-blur-sm">
                        <div className="absolute inset-x-10 -top-px h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"></div>
                        <div className="rounded-lg border bg-white shadow-sm overflow-hidden flex flex-col md:flex-row">
                            <div className="w-full md:w-64 border-r bg-slate-50 p-4 hidden md:block">
                                <div className="space-y-4">
                                    <div className="h-8 w-3/4 bg-slate-200 rounded animate-pulse"></div>
                                    <div className="h-8 w-full bg-slate-200 rounded animate-pulse"></div>
                                    <div className="h-8 w-5/6 bg-slate-200 rounded animate-pulse"></div>
                                </div>
                            </div>
                            <div className="flex-1 p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="font-bold text-lg flex items-center gap-2"><IndianRupee className="w-5 h-5 text-emerald-600" /> Revenue Ledger</h3>
                                    <Badge className="bg-emerald-100 text-emerald-700">Zero Discrepancies</Badge>
                                </div>
                                <div className="space-y-3">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-slate-50">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${i === 2 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                    {i === 2 ? <ArrowUpRight className="w-5 h-5" /> : <ArrowRightLeft className="w-5 h-5" />}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-sm">Rent Received - Room {100 + i}</p>
                                                    <p className="text-xs text-slate-500">Auto-reconciled via UPI</p>
                                                </div>
                                            </div>
                                            <p className="font-bold text-sm text-emerald-600">+ ₹8,500</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 2. The Pain vs The RentSutra Way */}
            <section id="comparison" className="py-24 bg-white">
                <div className="container mx-auto px-4">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                            The PG Business is Broken. <br/> <span className="text-primary">We Fixed It.</span>
                        </h2>
                        <p className="mt-4 text-lg text-slate-600">
                            Stop losing 10% of your revenue to unrecorded payments, forgotten dues, and messy diaries.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                        {/* The Old Way */}
                        <Card className="border-red-100 bg-red-50/30 shadow-none">
                            <CardHeader>
                                <CardTitle className="text-red-600 flex items-center gap-2">
                                    <X className="w-6 h-6" /> The Old Way
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-red-100 rounded text-red-600 shrink-0"><BookUser className="w-4 h-4" /></div>
                                    <p className="text-sm text-slate-700"><strong>Lost Diaries:</strong> Hand-written rent logs that get lost, damaged, or manipulated by staff.</p>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-red-100 rounded text-red-600 shrink-0"><MessageSquare className="w-4 h-4" /></div>
                                    <p className="text-sm text-slate-700"><strong>WhatsApp Chasing:</strong> Manually messaging 50 tenants every 1st of the month for rent.</p>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-red-100 rounded text-red-600 shrink-0"><History className="w-4 h-4" /></div>
                                    <p className="text-sm text-slate-700"><strong>Deposit Disputes:</strong> Arguments during move-out because security deposits were mixed with rent.</p>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-red-100 rounded text-red-600 shrink-0"><Search className="w-4 h-4" /></div>
                                    <p className="text-sm text-slate-700"><strong>Manual Reconciliations:</strong> Spending hours matching bank screenshots to specific rooms.</p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* The RentSutra Way */}
                        <Card className="border-emerald-200 bg-emerald-50/50 shadow-md relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-400/10 rounded-bl-full -z-10 blur-xl"></div>
                            <CardHeader>
                                <CardTitle className="text-emerald-700 flex items-center gap-2">
                                    <ShieldCheck className="w-6 h-6" /> The RentSutra Way
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-emerald-100 rounded text-emerald-700 shrink-0"><WalletCards className="w-4 h-4" /></div>
                                    <p className="text-sm text-slate-700"><strong>Immutable Ledger:</strong> Every payment, due, and penalty is tracked digitally with zero discrepancies.</p>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-emerald-100 rounded text-emerald-700 shrink-0"><Bot className="w-4 h-4" /></div>
                                    <p className="text-sm text-slate-700"><strong>Automated Reminders:</strong> System auto-generates bills and sends reminders on the exact due date.</p>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-emerald-100 rounded text-emerald-700 shrink-0"><Banknote className="w-4 h-4" /></div>
                                    <p className="text-sm text-slate-700"><strong>Escrow Wallets:</strong> Security deposits are safely cordoned off and tracked separately from operational rent.</p>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-emerald-100 rounded text-emerald-700 shrink-0"><Zap className="w-4 h-4" /></div>
                                    <p className="text-sm text-slate-700"><strong>1-Click Settlement:</strong> When a tenant leaves, click once to deduct notice penalties and finalize dues.</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>

            {/* 3. Core Features */}
            <section id="features" className="py-24 bg-slate-50">
                <div className="container mx-auto px-4">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                            Everything You Need to Run Your PG. <br className="hidden sm:block" /> Nothing You Don't.
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                        <Card className="hover:shadow-lg transition-shadow border-slate-200">
                            <CardHeader>
                                <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center mb-4">
                                    <BedDouble className="w-6 h-6" />
                                </div>
                                <CardTitle>Visual Bed Mapping</CardTitle>
                                <CardDescription>See your entire property at a glance.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-slate-600">
                                    Know exactly which beds are occupied, vacant, or in notice period using our visual floorplan UI. Prevent staff from hiding vacant beds to skim cash.
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="hover:shadow-lg transition-shadow border-slate-200">
                            <CardHeader>
                                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center mb-4">
                                    <History className="w-6 h-6" />
                                </div>
                                <CardTitle>Automated Settlement</CardTitle>
                                <CardDescription>Move-outs made simple and fast.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-slate-600">
                                    When a tenant leaves, our engine instantly calculates prorated rent, deducts damages from the escrow deposit, and generates a final settlement receipt in one click.
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="hover:shadow-lg transition-shadow border-slate-200">
                            <CardHeader>
                                <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center mb-4">
                                    <FilePieChart className="w-6 h-6" />
                                </div>
                                <CardTitle>Expense & Staff Tracking</CardTitle>
                                <CardDescription>Plug your daily operational money leaks.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-slate-600">
                                    Log groceries, maintenance, and staff payroll in the same app. Get real-time Profit & Loss statements to see your actual net yield per property.
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>

            {/* 4. Pricing Strategy (Trojan Horse) */}
            <section id="pricing" className="py-24 bg-slate-900 text-slate-50">
                <div className="container mx-auto px-4">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-white">
                            Simple, Transparent Pricing
                        </h2>
                        <p className="mt-4 text-lg text-slate-400">
                            Start for free. Scale when your PG business scales. No hidden fees.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                        {/* Free Tier */}
                        <Card className="bg-slate-800 border-slate-700 text-slate-100 relative">
                            <CardHeader>
                                <CardTitle className="text-2xl">Starter</CardTitle>
                                <CardDescription className="text-slate-400">Perfect for small PGs & new owners</CardDescription>
                                <div className="mt-4">
                                    <span className="text-5xl font-extrabold text-white">₹0</span>
                                    <span className="text-slate-400 ml-2">/forever</span>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center gap-3"><Check className="w-5 h-5 text-emerald-400" /> <span className="font-semibold">Up to 20 Tenants</span></div>
                                <div className="flex items-center gap-3"><Check className="w-5 h-5 text-emerald-400" /> <span>Core Ledger & Escrow</span></div>
                                <div className="flex items-center gap-3"><Check className="w-5 h-5 text-emerald-400" /> <span>Visual Bed Mapping</span></div>
                                <div className="flex items-center gap-3"><Check className="w-5 h-5 text-emerald-400" /> <span>Expense Tracking</span></div>
                            </CardContent>
                            <CardFooter>
                                <Button variant="outline" className="w-full text-slate-900 bg-white hover:bg-slate-100" onClick={handleCTA}>Start Free</Button>
                            </CardFooter>
                        </Card>

                        {/* Pro Tier */}
                        <Card className="bg-gradient-to-b from-primary to-indigo-800 border-indigo-600 text-white shadow-2xl relative transform md:-translate-y-4">
                            <div className="absolute top-0 right-0 bg-amber-500 text-amber-950 text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg uppercase tracking-wider">
                                Most Popular
                            </div>
                            <CardHeader>
                                <CardTitle className="text-2xl">Professional</CardTitle>
                                <CardDescription className="text-indigo-200">For serious operators scaling up</CardDescription>
                                <div className="mt-4">
                                    <span className="text-5xl font-extrabold">₹999</span>
                                    <span className="text-indigo-200 ml-2">/mo Base Fee</span>
                                </div>
                                <p className="text-sm text-indigo-300 font-medium">+ ₹50 per tenant / month</p>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center gap-3"><Check className="w-5 h-5 text-indigo-200" /> <span className="font-bold">Unlimited Tenants</span></div>
                                <div className="flex items-center gap-3"><Check className="w-5 h-5 text-indigo-200" /> <span>Automated WhatsApp Reminders</span></div>
                                <div className="flex items-center gap-3"><Check className="w-5 h-5 text-indigo-200" /> <span>Multi-Property Dashboards</span></div>
                                <div className="flex items-center gap-3"><Check className="w-5 h-5 text-indigo-200" /> <span>Staff & Payroll Management</span></div>
                                <div className="flex items-center gap-3"><Check className="w-5 h-5 text-indigo-200" /> <span>Priority Email & Phone Support</span></div>
                            </CardContent>
                            <CardFooter>
                                <Button className="w-full bg-white text-indigo-700 hover:bg-indigo-50 font-bold shadow-lg" onClick={handleCTA}>Upgrade to Pro</Button>
                            </CardFooter>
                        </Card>
                    </div>

                    <p className="text-center text-slate-500 text-sm mt-12">
                        Need Custom Branding, White-labeled Websites, or SEO? Contact us for Enterprise Add-ons.
                    </p>
                </div>
            </section>

            {/* 5. FAQ */}
            <section id="faq" className="py-24 bg-white">
                <div className="container mx-auto px-4 max-w-3xl">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold tracking-tight text-slate-900">Frequently Asked Questions</h2>
                    </div>

                    <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="item-1">
                            <AccordionTrigger className="text-left font-semibold">Is my financial data secure?</AccordionTrigger>
                            <AccordionContent className="text-slate-600">
                                Absolutely. RentSutra uses bank-grade encryption and isolated database structures. Your data is strictly yours and cannot be accessed by other PG owners or unauthorized staff.
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-2">
                            <AccordionTrigger className="text-left font-semibold">How hard is it to migrate my existing PG?</AccordionTrigger>
                            <AccordionContent className="text-slate-600">
                                Very easy. We provide a bulk-import Excel template. Just paste your current tenant list, rent dues, and room numbers, and you'll be fully digitized in under 5 minutes.
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-3">
                            <AccordionTrigger className="text-left font-semibold">Do my tenants need to download an app?</AccordionTrigger>
                            <AccordionContent className="text-slate-600">
                                No app download is required! Tenants can access their portal via a web link sent to their WhatsApp. However, they can install our lightweight PWA (Progressive Web App) directly from their browser for a native app experience.
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-4">
                            <AccordionTrigger className="text-left font-semibold">What happens if I cross 20 tenants on the Free plan?</AccordionTrigger>
                            <AccordionContent className="text-slate-600">
                                You will simply be prompted to upgrade to the Professional plan. None of your data will be locked or lost, but you won't be able to add the 21st tenant until you upgrade.
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-slate-950 text-slate-400 py-12 border-t border-slate-800">
                <div className="container mx-auto px-4 grid md:grid-cols-4 gap-8">
                    <div className="col-span-2">
                        <div className="flex items-center gap-2 mb-4">
                            <Building2 className="w-6 h-6 text-primary" />
                            <span className="font-bold text-xl text-slate-100">RentSutra</span>
                        </div>
                        <p className="text-sm text-slate-500 max-w-sm">
                            The definitive financial operating system for modern PG and co-living owners in India. Stop managing beds, start managing profit.
                        </p>
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-100 mb-4">Product</h4>
                        <ul className="space-y-2 text-sm">
                            <li><a href="#features" className="hover:text-primary transition-colors">Features</a></li>
                            <li><a href="#pricing" className="hover:text-primary transition-colors">Pricing</a></li>
                            <li><Link href="/login" className="hover:text-primary transition-colors">Login</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-100 mb-4">Legal</h4>
                        <ul className="space-y-2 text-sm">
                            <li><a href="#" className="hover:text-primary transition-colors">Privacy Policy</a></li>
                            <li><a href="#" className="hover:text-primary transition-colors">Terms of Service</a></li>
                            <li><a href="#" className="hover:text-primary transition-colors">Contact Us</a></li>
                        </ul>
                    </div>
                </div>
                <div className="container mx-auto px-4 mt-12 pt-8 border-t border-slate-800 text-sm text-center">
                    <p>&copy; {new Date().getFullYear()} RentSutra Technologies. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
};

export default Index;
