
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/lib/hooks';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Star, Users, Smartphone, TrendingUp, Zap, Globe, Phone, MapPin, IndianRupee, Building2, UserCheck, Clock, MessageSquare, BarChart3, Bot, LayoutTemplate, UserPlus, FileCog, ArrowRight, BrainCircuit, Download, WalletCards, LayoutList, FilePieChart, UserRoundCog, X, UtensilsCrossed, BookUser, Contact, Wallet, History, Paintbrush, Target, Banknote, GitBranch, Share2, Calendar, ArrowLeftRight, CheckCircle, Pencil, User as UserIcon, BedDouble, Lock, Server, Plus } from "lucide-react";
import Image from 'next/image';
import { cn } from '@/lib/utils';
import WalletPlanDialog from '@/components/dashboard/dialogs/WalletPlanDialog';
import InstallPWA from '@/components/install-pwa';
import type { User as UserType } from '@/lib/types';
import { useTranslation } from '@/context/language-context';
import { PRICING_CONFIG } from '@/lib/constants';
import SavingsCalculator from '@/components/SavingsCalculator';
import { Sparkles } from 'lucide-react';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";


const Index = () => {
    const router = useRouter();
    const { t } = useTranslation();
    const { currentUser } = useAppSelector((state) => state.user);
    const [isSubDialogOpen, setIsSubDialogOpen] = useState(false);
  
    const handleChoosePlan = () => {
      if (!currentUser) {
        router.push('/login');
      } else {
        setIsSubDialogOpen(true);
      }
    };
  
    const primaryFeatures = [
    {
      title: t('landing_primary_1_title'),
      description: t('landing_primary_1_desc'),
      visual: (
        <div className="w-full aspect-video bg-card border rounded-lg p-4 flex flex-col justify-center gap-4 shadow-lg">
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-background p-2 rounded-lg text-center">
                    <Users className="w-5 h-5 mx-auto text-primary mb-1"/>
                    <p className="text-xs text-muted-foreground">Occupancy</p>
                    <p className="text-sm font-bold">28 / 32</p>
                </div>
                 <div className="bg-background p-2 rounded-lg text-center">
                    <IndianRupee className="w-5 h-5 mx-auto text-green-500 mb-1"/>
                    <p className="text-xs text-muted-foreground">Revenue</p>
                    <p className="text-sm font-bold">₹1.8L</p>
                </div>
                 <div className="bg-background p-2 rounded-lg text-center">
                    <IndianRupee className="w-5 h-5 mx-auto text-red-500 mb-1"/>
                    <p className="text-xs text-muted-foreground">Dues</p>
                    <p className="text-sm font-bold">₹24k</p>
                </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
                <div className="aspect-square bg-green-100 dark:bg-green-900/40 rounded flex flex-col items-center justify-center p-1 text-center border border-green-300 dark:border-green-800">
                    <CheckCircle className="w-4 h-4 text-green-600 mb-1"/>
                    <p className="text-[10px] font-bold text-green-800 dark:text-green-300">Paid</p>
                </div>
                 <div className="aspect-square bg-red-100 dark:bg-red-900/40 rounded flex flex-col items-center justify-center p-1 text-center border border-red-300 dark:border-red-800">
                    <Clock className="w-4 h-4 text-red-600 mb-1"/>
                    <p className="text-[10px] font-bold text-red-800 dark:text-red-300">Due</p>
                </div>
                 <div className="aspect-square bg-yellow-100 dark:bg-yellow-900/40 rounded flex flex-col items-center justify-center p-1 text-center border border-yellow-300 dark:border-yellow-800 animate-pulse">
                    <BedDouble className="w-4 h-4 text-yellow-600 mb-1"/>
                    <p className="text-[10px] font-bold text-yellow-800 dark:text-yellow-300">Available</p>
                </div>
                 <div className="aspect-square bg-green-100 dark:bg-green-900/40 rounded flex flex-col items-center justify-center p-1 text-center border border-green-300 dark:border-green-800">
                     <CheckCircle className="w-4 h-4 text-green-600 mb-1"/>
                    <p className="text-[10px] font-bold text-green-800 dark:text-green-300">Paid</p>
                </div>
            </div>
        </div>
      )
    },
    {
      title: t('landing_primary_2_title'),
      description: t('landing_primary_2_desc'),
      visual: (
        <div className="w-full aspect-video bg-card border rounded-lg p-4 flex flex-col justify-center gap-3 shadow-lg">
            <div className="bg-background p-3 rounded-lg border">
                <div className="flex justify-between items-center">
                    <p className="text-sm font-medium">Rent Received</p>
                    <p className="text-sm font-bold text-green-600">+ ₹12,000</p>
                </div>
                <p className="text-xs text-muted-foreground">From Priya Sharma for Room 101</p>
            </div>
             <div className="bg-background p-3 rounded-lg border">
                <div className="flex justify-between items-center">
                    <p className="text-sm font-medium">Expense Logged</p>
                    <p className="text-sm font-bold text-red-600">- ₹2,500</p>
                </div>
                <p className="text-xs text-muted-foreground">Groceries for the week</p>
            </div>
            <div className="bg-primary/10 text-primary p-3 rounded-lg border border-primary/20 mt-2 text-center">
                <p className="text-sm font-bold">Net Profit Updated</p>
            </div>
        </div>
      )
    },
    {
      title: t('landing_primary_3_title'),
      description: t('landing_primary_3_desc'),
      visual: (
        <div className="w-full aspect-video bg-card border rounded-lg p-4 flex flex-col justify-center gap-3 shadow-lg">
            <div className="bg-background p-3 rounded-lg border transition-all hover:scale-105">
                <div className="flex justify-between items-center mb-1">
                    <p className="font-semibold text-sm">New Complaint</p>
                    <Badge variant="destructive">Open</Badge>
                </div>
                <p className="text-xs text-muted-foreground">"Wi-fi is not working in Room 204." - Akash</p>
            </div>
             <div className="bg-background p-3 rounded-lg border transition-all hover:scale-105">
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
      title: t('landing_primary_4_title'),
      description: t('landing_primary_4_desc'),
      visual: (
        <div className="w-full aspect-video bg-card border rounded-lg p-4 flex items-center justify-center shadow-lg relative overflow-hidden">
            <div className="absolute inset-0 bg-grid-pattern opacity-10" style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32' fill='none' stroke='hsl(var(--border))'%3e%3cpath d='M0 .5 L31 .5 M.5 0 L.5 31'/%3e%3c/svg%3e\")" }}></div>
            <div className="grid grid-cols-3 gap-4 items-center text-center relative">
                <div className="flex flex-col items-center gap-2">
                    <div className="p-3 bg-muted rounded-full border"><Building2 className="w-6 h-6 text-muted-foreground" /></div>
                    <p className="text-xs font-semibold">{t('supercharge_enterprise_other_pgs')}</p>
                </div>
                 <ArrowLeftRight className="w-8 h-8 text-muted-foreground/30 shrink-0"/>
                 <div className="flex flex-col items-center gap-2 border-2 border-primary p-4 rounded-lg bg-primary/10 shadow-lg">
                    <div className="p-3 bg-background rounded-full"><Lock className="w-6 h-6 text-primary" /></div>
                    <p className="text-xs font-bold text-primary">{t('supercharge_enterprise_private_cloud')}</p>
                </div>
           </div>
        </div>
      )
    }
  ];

   const secondaryFeatures = [
        { icon: LayoutList, title: t('landing_features_property_title'), description: t('landing_features_property_desc') },
        { icon: UserPlus, title: t('landing_features_onboarding_title'), description: t('landing_features_onboarding_desc') },
        { icon: BookUser, title: t('landing_features_passbook_title'), description: t('landing_features_passbook_desc') },
        { icon: Wallet, title: t('landing_features_expenses_title'), description: t('landing_features_expenses_desc') },
        { icon: MessageSquare, title: t('landing_features_complaints_title'), description: t('landing_features_complaints_desc') },
        { icon: UtensilsCrossed, title: t('landing_features_food_title'), description: t('landing_features_food_desc') },
        { icon: Contact, title: t('landing_features_staff_title'), description: t('landing_features_staff_desc') },
        { icon: UserCheck, title: t('landing_features_kyc_title'), description: t('landing_features_kyc_desc') },
        { icon: History, title: t('landing_features_history_title'), description: t('landing_features_history_desc') },
        { icon: BarChart3, title: t('landing_features_analytics_title'), description: t('landing_features_analytics_desc') },
        { icon: Globe, title: t('landing_features_website_title'), description: t('landing_features_website_desc') },
        { icon: BrainCircuit, title: t('landing_features_ai_title'), description: t('landing_features_ai_desc') },
        { icon: GitBranch, title: t('landing_features_marketplace_title'), description: t('landing_features_marketplace_desc') },
    ];


  return (
    <>
      <WalletPlanDialog open={isSubDialogOpen} onOpenChange={setIsSubDialogOpen} />
      <div className="min-h-screen bg-background">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-20 lg:py-32">
            <div className="absolute inset-0 bg-gradient-hero blur-3xl opacity-20 animate-pulse-slow"></div>
            <div className="container mx-auto px-4 text-center relative z-10">
                <Badge className="bg-primary/10 text-primary border-primary/20 px-4 py-2 text-base shadow-lg">
                    {t('hero_badge')}
                </Badge>
                <h1 className="text-4xl lg:text-6xl font-bold leading-tight mt-6 max-w-4xl mx-auto">
                    {t('hero_title_1')}
                    <br />
                    <span className="bg-gradient-saffron bg-clip-text text-transparent">
                        {t('hero_title_2')}
                    </span>
                </h1>
                <p className="text-xl text-muted-foreground leading-relaxed mt-8 max-w-2xl mx-auto">
                    {t('hero_subtitle')}
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
                    <Button size="lg" variant="hero" className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-shadow" asChild>
                        <Link href="/login">
                            <Smartphone className="mr-2 h-5 w-5" />
                            {t('hero_cta')}
                        </Link>
                    </Button>
                    <InstallPWA />
                </div>
                 <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm text-muted-foreground mt-8">
                    <div className="flex items-center"><Check className="w-4 h-4 text-green-500 mr-2" />{t('hero_check_1')}</div>
                    <div className="flex items-center"><Check className="w-4 h-4 text-green-500 mr-2" />{t('hero_check_2')}</div>
                    <div className="flex items-center"><Check className="w-4 h-4 text-green-500 mr-2" />{t('hero_check_3')}</div>
                </div>
            </div>
        </section>

        {/* Primary Features */}
        <section className="py-20 bg-background">
            <div className="container mx-auto px-4">
                <div className="space-y-16">
                {primaryFeatures.map((feature, index) => (
                    <div key={feature.title} className="grid md:grid-cols-2 gap-12 items-center">
                        <div className={cn("space-y-4", index % 2 === 1 && "md:order-2")}>
                            <h3 className="text-3xl font-bold">{feature.title}</h3>
                            <p className="text-lg text-muted-foreground">{feature.description}</p>
                        </div>
                        <div className={cn(index % 2 === 1 && "md:order-1")}>
                            {feature.visual}
                        </div>
                    </div>
                ))}
                </div>
            </div>
        </section>
        
        {/* All Features Section */}
         <section id="features" className="py-20 bg-muted/40">
             <div className="container mx-auto px-4">
                <div className="text-center space-y-4 mb-12">
                    <h2 className="text-4xl lg:text-5xl font-bold">
                       {t('all_features_title')}
                    </h2>
                    <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                        {t('all_features_subtitle')}
                    </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {secondaryFeatures.map((feature) => (
                    <div key={feature.title} className="flex items-start gap-4 p-4 rounded-lg hover:bg-muted transition-colors">
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
        
        {/* Supercharge Section */}
        <section className="py-20 bg-background">
            <div className="container mx-auto px-4">
                <div className="text-center space-y-4 mb-16">
                    <h2 className="text-4xl lg:text-5xl font-bold">
                        {t('supercharge_title_1')} <span className="bg-gradient-saffron bg-clip-text text-transparent">{t('supercharge_title_2')}</span>
                    </h2>
                    <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                        {t('supercharge_subtitle')}
                    </p>
                </div>
                <div className="space-y-24">
                   <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div className="space-y-4">
                            <Badge variant="default" className="bg-green-500 hover:bg-green-600">{t('supercharge_whatsapp_badge')}</Badge>
                            <h3 className="text-3xl font-bold">{t('supercharge_whatsapp_title')}</h3>
                            <p className="text-lg text-muted-foreground">{t('supercharge_whatsapp_desc')}</p>
                        </div>
                         <div className="bg-card p-6 rounded-lg border shadow-md flex items-center justify-center min-h-[250px]">
                            <div className="flex flex-col md:flex-row items-center gap-4 text-center">
                                <div className="flex flex-col items-center gap-2">
                                    <div className="p-3 bg-muted rounded-full animate-pulse"><Calendar className="w-6 h-6 text-primary" /></div>
                                    <p className="text-xs font-semibold">{t('supercharge_whatsapp_flow_due')}</p>
                                </div>
                                <ArrowRight className="w-8 h-8 text-muted-foreground shrink-0 hidden md:block animate-pulse-slow"/>
                                <div className="flex flex-col items-center gap-2">
                                    <div className="p-3 bg-muted rounded-full animate-pulse"><Bot className="w-6 h-6 text-primary" /></div>
                                    <p className="text-xs font-semibold">{t('supercharge_whatsapp_flow_reminder')}</p>
                                </div>
                                <ArrowRight className="w-8 h-8 text-muted-foreground shrink-0 hidden md:block animate-pulse-slow"/>
                                <div className="flex flex-col items-center gap-2">
                                    <div className="p-3 bg-muted rounded-full animate-pulse"><UserIcon className="w-6 h-6 text-primary" /></div>
                                    <p className="text-xs font-semibold">{t('supercharge_whatsapp_flow_pay')}</p>
                                </div>
                                 <ArrowRight className="w-8 h-8 text-muted-foreground shrink-0 hidden md:block animate-pulse-slow"/>
                                <div className="flex flex-col items-center gap-2">
                                    <div className="p-3 bg-muted rounded-full animate-pulse"><Wallet className="w-6 h-6 text-primary" /></div>
                                    <p className="text-xs font-semibold">{t('supercharge_whatsapp_flow_receive')}</p>
                                </div>
                           </div>
                        </div>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-12 items-center">
                         <div className="space-y-4 md:order-2">
                            <Badge variant="default" className="bg-blue-500 hover:bg-blue-600">{t('supercharge_website_badge')}</Badge>
                            <h3 className="text-3xl font-bold">{t('supercharge_website_title')}</h3>
                            <p className="text-lg text-muted-foreground">{t('supercharge_website_desc')}</p>
                        </div>
                        <div className="md:order-1 grid grid-cols-2 gap-4">
                            <div className="bg-card p-4 rounded-lg border shadow-md">
                                <Paintbrush className="w-6 h-6 text-primary mb-2"/>
                                <h4 className="font-bold">{t('supercharge_website_editor')}</h4>
                                <div className="mt-2 space-y-2">
                                    <div className="flex items-center justify-between"><span className="text-sm">{t('supercharge_website_hero')}</span> <Button size="sm" variant="outline" className="h-6 px-2 text-xs">Change</Button></div>
                                    <div className="flex items-center justify-between"><span className="text-sm">{t('supercharge_website_title_text')}</span> <Button size="sm" variant="outline" className="h-6 px-2 text-xs">Edit</Button></div>
                                </div>
                            </div>
                             <div className="bg-card p-4 rounded-lg border shadow-md">
                                <Target className="w-6 h-6 text-primary mb-2"/>
                                <h4 className="font-bold">{t('supercharge_website_lead_manager')}</h4>
                                <div className="mt-2 space-y-2">
                                    <div className="bg-muted p-2 rounded text-sm font-medium">{t('supercharge_website_lead_1')}</div>
                                    <div className="bg-muted p-2 rounded text-sm font-medium">{t('supercharge_website_lead_2')}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                   
                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div className="space-y-4">
                            <Badge variant="default" className="bg-purple-500 hover:bg-purple-600">{t('supercharge_payouts_badge')}</Badge>
                            <h3 className="text-3xl font-bold">{t('supercharge_payouts_title')}</h3>
                            <p className="text-lg text-muted-foreground">{t('supercharge_payouts_desc')}</p>
                        </div>
                        <div className="bg-card p-6 rounded-lg border shadow-md space-y-3">
                            <div className="flex items-center gap-3"><Users className="w-8 h-8 text-primary"/><p className="font-semibold">{t('supercharge_payouts_flow_pay')}</p></div>
                            <div className="h-8 w-px bg-border mx-auto ml-4"></div>
                            <div className="flex items-center gap-3"><Share2 className="w-8 h-8 text-primary"/><p className="font-semibold">{t('supercharge_payouts_flow_gateway')}</p></div>
                            <div className="h-8 w-px bg-border mx-auto ml-4"></div>
                            <div className="flex items-center gap-3"><GitBranch className="w-8 h-8 text-primary"/><p className="font-semibold">{t('supercharge_payouts_flow_fee')}</p></div>
                             <div className="h-8 w-px bg-border mx-auto ml-4"></div>
                            <div className="flex items-center gap-3"><Banknote className="w-8 h-8 text-primary"/><p className="font-semibold">{t('supercharge_payouts_flow_bank')}</p></div>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-12 items-center">
                         <div className="space-y-4 md:order-2">
                            <Badge variant="default" className="bg-indigo-500 hover:bg-indigo-600">{t('supercharge_enterprise_badge')}</Badge>
                            <h3 className="text-3xl font-bold">{t('supercharge_enterprise_title')}</h3>
                            <p className="text-lg text-muted-foreground">{t('supercharge_enterprise_desc')}</p>
                             <Button asChild variant="link" className="px-0">
                                <Link href="/dashboard/enterprise">{t('supercharge_enterprise_learn_more')} <ArrowRight className="ml-2 w-4 h-4"/></Link>
                            </Button>
                        </div>
                        <div className="md:order-1 bg-card p-6 rounded-lg border shadow-md flex items-center justify-center min-h-[250px] relative">
                            <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
                            <div className="grid grid-cols-3 gap-4 items-center text-center relative">
                                <div className="flex flex-col items-center gap-2">
                                    <div className="p-3 bg-muted rounded-full border"><Building2 className="w-6 h-6 text-muted-foreground" /></div>
                                    <p className="text-xs font-semibold">{t('supercharge_enterprise_other_pgs')}</p>
                                </div>
                                 <ArrowLeftRight className="w-8 h-8 text-muted-foreground/30 shrink-0"/>
                                 <div className="flex flex-col items-center gap-2 border-2 border-primary p-4 rounded-lg bg-primary/10 shadow-lg">
                                    <div className="p-3 bg-background rounded-full"><Lock className="w-6 h-6 text-primary" /></div>
                                    <p className="text-xs font-bold text-primary">{t('supercharge_enterprise_private_cloud')}</p>
                                </div>
                           </div>
                        </div>
                    </div>

                </div>
            </div>
        </section>

        {/* Why RentSutra Section */}
        <section className="py-20 bg-muted/40">
            <div className="container mx-auto px-4">
                <div className="text-center space-y-4 mb-12">
                    <h2 className="text-4xl lg:text-5xl font-bold">{t('why_title')}</h2>
                    <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                        {t('why_subtitle')}
                    </p>
                </div>
                <div className="grid md:grid-cols-2 gap-8 items-center max-w-5xl mx-auto">
                    {/* The Old Way */}
                    <div className="bg-card p-8 rounded-xl border border-dashed border-red-500/50">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                               <X className="w-6 h-6 text-red-500" />
                            </div>
                            <h3 className="text-2xl font-bold">{t('old_way_title')}</h3>
                        </div>
                        <ul className="space-y-3 text-muted-foreground">
                            <li className="flex items-start gap-3"><span className="font-bold text-red-500 mt-1">&bull;</span><span>{t('old_way_1')}</span></li>
                            <li className="flex items-start gap-3"><span className="font-bold text-red-500 mt-1">&bull;</span><span>{t('old_way_2')}</span></li>
                            <li className="flex items-start gap-3"><span className="font-bold text-red-500 mt-1">&bull;</span><span>{t('old_way_3')}</span></li>
                            <li className="flex items-start gap-3"><span className="font-bold text-red-500 mt-1">&bull;</span><span>{t('old_way_4')}</span></li>
                        </ul>
                    </div>
                     {/* The RentSutra Way */}
                    <div className="bg-card p-8 rounded-xl border border-dashed border-green-500/50">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                               <Check className="w-6 h-6 text-green-500" />
                            </div>
                            <h3 className="text-2xl font-bold">{t('new_way_title')}</h3>
                        </div>
                        <ul className="space-y-3 text-muted-foreground">
                            <li className="flex items-start gap-3"><span className="font-bold text-green-500 mt-1">&bull;</span><span>{t('new_way_1')}</span></li>
                            <li className="flex items-start gap-3"><span className="font-bold text-green-500 mt-1">&bull;</span><span>{t('new_way_2')}</span></li>
                            <li className="flex items-start gap-3"><span className="font-bold text-green-500 mt-1">&bull;</span><span>{t('new_way_3')}</span></li>
                            <li className="flex items-start gap-3"><span className="font-bold text-green-500 mt-1">&bull;</span><span>{t('new_way_4')}</span></li>
                        </ul>
                    </div>
                </div>
            </div>
        </section>

        {/* Savings Calculator Section */}
        <section className="py-20 bg-muted/40">
            <div className="container mx-auto">
                <SavingsCalculator />
            </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-20 bg-background">
          <div className="container mx-auto px-4">
            <div className="text-center space-y-4 mb-16">
              <h2 className="text-4xl lg:text-5xl font-bold">
                {t('pricing_title_1')} <span className="bg-gradient-saffron bg-clip-text text-transparent">{t('pricing_title_2')}</span>
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                {t('pricing_subtitle')}
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
                {/* Free Plan / Trial */}
                <Card className="flex flex-col justify-between">
                    <CardHeader>
                        <CardTitle className="text-xl">{t('plan_free_name')}</CardTitle>
                        <CardDescription>{t('plan_free_desc')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="text-4xl font-bold">{t('plan_free_price')}</div>
                        <p className="font-semibold">
                            {t('plan_free_duration_limit', { days: PRICING_CONFIG.trial.durationDays, tenants: PRICING_CONFIG.trial.maxTenants })}
                        </p>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li className="flex items-center font-bold text-primary"><Check className="w-4 h-4 mr-2" />{t('plan_free_feat1')}</li>
                            <li className="flex items-center"><Check className="w-4 h-4 text-green-500 mr-2" />{t('plan_free_feat2')}</li>
                            <li className="flex items-center"><Check className="w-4 h-4 text-green-500 mr-2" />{t('plan_free_credits_included', { amount: PRICING_CONFIG.trial.credit })}</li>
                            <li className="flex items-center"><Check className="w-4 h-4 text-green-500 mr-2" />{t('plan_free_whatsapp_credits', { count: PRICING_CONFIG.trial.includedWhatsappCredits })}</li>
                        </ul>
                    </CardContent>
                    <CardFooter>
                         <Button className="w-full" variant="outline" asChild><Link href="/login">{t('plan_cta')}</Link></Button>
                    </CardFooter>
                </Card>

                 {/* Pro Plan */}
                 <Card className="relative border-2 border-primary shadow-2xl shadow-primary/20 flex flex-col justify-between scale-105 z-10">
                    <Badge className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-saffron text-white shadow-lg px-4 py-1">{t('plan_pro_badge')}</Badge>
                     <CardHeader>
                        <CardTitle className="text-xl">{t('plan_pro_name')}</CardTitle>
                        <CardDescription>{t('plan_pro_desc')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         <div className="space-y-1">
                            <div className="text-4xl font-bold">₹{PRICING_CONFIG.yearly.perTenant}<span className="text-lg text-muted-foreground">{t('plan_pro_price_period')}*</span></div>
                            <div className="text-sm font-semibold text-primary flex items-center gap-1">
                                <Plus className="w-3 h-3" />
                                ₹{PRICING_CONFIG.baseFee} {t('base_platform_fee')}
                            </div>
                         </div>
                        
                        <div className="space-y-2 py-2 border-y text-xs">
                            <div className="flex justify-between items-center text-muted-foreground">
                                <span>{t('pricing_yearly_commitment')}</span>
                                <span className="font-bold text-foreground">₹{PRICING_CONFIG.yearly.perTenant}/{t('month')}</span>
                            </div>
                            <div className="flex justify-between items-center text-muted-foreground">
                                <span>{t('pricing_six_month_commitment')}</span>
                                <span className="font-bold text-foreground">₹{PRICING_CONFIG.sixMonth.perTenant}/{t('month')}</span>
                            </div>
                            <div className="flex justify-between items-center text-muted-foreground">
                                <span>{t('pricing_monthly_pay_as_you_go')}</span>
                                <span className="font-bold text-foreground">₹{PRICING_CONFIG.monthly.perTenant}/{t('month')}</span>
                            </div>
                        </div>

                        <ul className="space-y-2 text-sm text-muted-foreground">
                             <li className="flex items-center"><Check className="w-4 h-4 text-green-500 mr-2" />{t('plan_pro_feat1')}</li>
                             <li className="flex items-center"><Zap className="w-4 h-4 text-primary mr-2" />{t('plan_pro_feat2')}</li>
                             <li className="flex items-center"><BrainCircuit className="w-4 h-4 text-primary mr-2" />{t('plan_pro_feat3')}</li>
                             <li className="flex items-center"><IndianRupee className="w-4 h-4 text-primary mr-2" />{t('plan_pro_feat4')}</li>
                        </ul>
                        <p className="text-[10px] text-muted-foreground italic leading-tight">{t('pricing_disclaimer')}</p>
                    </CardContent>
                     <CardFooter>
                        <Button className="w-full" variant="hero" onClick={handleChoosePlan}>{t('plan_pro_cta')}</Button>
                     </CardFooter>
                </Card>

                {/* Enterprise Plan */}
                <Card className="flex flex-col justify-between">
                   <CardHeader>
                        <CardTitle className="text-xl">{t('plan_enterprise_name')}</CardTitle>
                        <CardDescription>{t('plan_enterprise_desc')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="text-4xl font-bold">{t('plan_enterprise_price')}</div>
                        <p className="font-semibold">{t('plan_enterprise_limit')}</p>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li className="flex items-center"><Check className="w-4 h-4 text-green-500 mr-2" />{t('plan_enterprise_feat1')}</li>
                            <li className="flex items-center"><IndianRupee className="w-4 h-4 text-primary mr-2" />{t('plan_enterprise_feat2')}</li>
                            <li className="flex items-center"><Globe className="w-4 h-4 text-primary mr-2" />{t('plan_enterprise_feat3')}</li>
                            <li className="flex items-center"><Users className="w-4 h-4 text-primary mr-2" />{t('plan_enterprise_feat4')}</li>
                            <li className="flex items-center"><Server className="w-4 h-4 text-primary mr-2" />{t('plan_enterprise_feat5')}</li>
                            <li className="flex items-center"><GitBranch className="w-4 h-4 text-primary mr-2" />{t('plan_enterprise_feat6')}</li>
                        </ul>
                    </CardContent>
                     <CardFooter>
                        <Button className="w-full" variant="outline" asChild><a href="mailto:hello@rentsutra.com">{t('plan_enterprise_cta')}</a></Button>
                    </CardFooter>
                </Card>
            </div>

            {/* Premium Add-ons Section */}
            <div className="mt-16 max-w-4xl mx-auto">
                <div className="text-center mb-8">
                    <h3 className="text-2xl font-bold text-muted-foreground/80 flex items-center justify-center gap-3">
                        <Sparkles className="w-6 h-6 text-indigo-500" />
                        {t('premium_addons_title')}
                    </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="bg-card/50 backdrop-blur-sm p-6 rounded-2xl border border-dashed flex items-center justify-between group hover:border-indigo-500/50 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-500/10 rounded-xl text-blue-600 group-hover:scale-110 transition-transform">
                                <Globe className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="font-bold">{t('premium_addon_website_label')}</h4>
                                <p className="text-xs text-muted-foreground">{t('supercharge_website_desc').substring(0, 40)}...</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-xl font-black text-blue-600">{t('premium_addon_website_price', { price: PRICING_CONFIG.premiumFeatures.website.monthlyCharge })}</p>
                        </div>
                    </div>
                    <div className="bg-card/50 backdrop-blur-sm p-6 rounded-2xl border border-dashed flex items-center justify-between group hover:border-green-500/50 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-green-500/10 rounded-xl text-green-600 group-hover:scale-110 transition-transform">
                                <MessageSquare className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="font-bold">{t('premium_addon_whatsapp_label')}</h4>
                                <p className="text-xs text-muted-foreground">{t('supercharge_whatsapp_desc').substring(0, 40)}...</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-xl font-black text-green-600">{t('premium_addon_whatsapp_price', { price: PRICING_CONFIG.premiumFeatures.whatsapp.perTenantCharge })}</p>
                        </div>
                    </div>
                </div>
            </div>
          </div>
        </section>


        {/* Trial Information Section */}
        <section className="py-20 bg-muted/40 border-y">
            <div className="container mx-auto px-4">
                <div className="max-w-5xl mx-auto bg-card rounded-3xl border shadow-2xl overflow-hidden">
                    <div className="grid md:grid-cols-2">
                        <div className="p-8 lg:p-12 space-y-6">
                            <Badge className="bg-primary/10 text-primary border-primary/20">{t('hero_badge')}</Badge>
                            <h2 className="text-3xl lg:text-4xl font-bold leading-tight">
                                {t('trial_info_title')}
                            </h2>
                            <p className="text-lg text-muted-foreground leading-relaxed">
                                {t('trial_info_desc')}
                            </p>
                            <div className="flex flex-col gap-4">
                                <Button size="lg" className="w-full sm:w-fit px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-all group" asChild>
                                    <Link href="/login">
                                        {t('hero_cta')}
                                        <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                    </Link>
                                </Button>
                                <p className="text-sm text-muted-foreground flex items-center gap-2">
                                    <Check className="w-4 h-4 text-green-500" />
                                    {t('trial_disclaimer')}
                                </p>
                            </div>
                        </div>
                        <div className="bg-primary/5 p-8 lg:p-12 border-l border-primary/10 flex flex-col justify-center gap-6">
                            <div className="grid gap-6">
                                {[
                                    { icon: Users, text: t('trial_feature_1') },
                                    { icon: Zap, text: t('trial_feature_2') },
                                    { icon: WalletCards, text: t('trial_feature_3') },
                                    { icon: MessageSquare, text: t('trial_feature_4') }
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-4 group">
                                        <div className="p-3 bg-card rounded-xl border shadow-sm group-hover:scale-110 transition-transform">
                                            <item.icon className="w-6 h-6 text-primary" />
                                        </div>
                                        <span className="font-semibold text-muted-foreground group-hover:text-foreground transition-colors">{item.text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        {/* FAQ Section */}
        <section className="py-24 bg-background overflow-hidden">
            <div className="container mx-auto px-4 relative">
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
                
                <div className="max-w-3xl mx-auto text-center mb-16">
                    <Badge variant="outline" className="mb-4 px-4 py-1 border-primary/20 text-primary">
                        {t('more_options')}
                    </Badge>
                    <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                        {t('faq_title')}
                    </h2>
                </div>
                <div className="max-w-3xl mx-auto">
                    <Accordion type="single" collapsible className="w-full space-y-4">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <AccordionItem key={i} value={`item-${i}`} className="border rounded-2xl px-6 bg-card/50 backdrop-blur-sm border-primary/5 hover:border-primary/20 transition-all shadow-sm">
                                <AccordionTrigger className="text-left font-semibold hover:text-primary transition-colors py-6 hover:no-underline">
                                    <span className="flex items-center gap-4">
                                        <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs shrink-0">
                                            0{i}
                                        </span>
                                        {t(`faq_q${i}` as any)}
                                    </span>
                                </AccordionTrigger>
                                <AccordionContent className="text-muted-foreground pb-6 pl-12">
                                    {t(`faq_a${i}` as any)}
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </div>
            </div>
        </section>

        {/* Footer */}
        <footer className="bg-card text-card-foreground py-12 border-t">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="col-span-2 md:col-span-1 space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-saffron rounded-lg flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-2xl font-bold">RentSutra</span>
                </div>
                <p className="text-muted-foreground text-sm">
                  {t('footer_tagline')}
                </p>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-lg">{t('footer_product_title')}</h4>
                <ul className="space-y-2 text-muted-foreground text-sm">
                  <li><Link href="/#features" className="hover:text-primary transition-colors">{t('footer_product_link1')}</Link></li>
                  <li><Link href="/#pricing" className="hover:text-primary transition-colors">{t('footer_product_link2')}</Link></li>
                </ul>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-lg">{t('footer_company_title')}</h4>
                <ul className="space-y-2 text-muted-foreground text-sm">
                  <li><Link href="/about" className="hover:text-primary transition-colors">{t('footer_company_link1')}</Link></li>
                  <li><Link href="/contact" className="hover:text-primary transition-colors">{t('footer_company_link2')}</Link></li>
                  <li><Link href="/blog/onboarding-guest" className="hover:text-primary transition-colors">{t('footer_company_link3')}</Link></li>
                </ul>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-semibold text-lg">{t('footer_legal_title')}</h4>
                <ul className="space-y-2 text-muted-foreground text-sm">
                  <li><Link href="/privacy-policy" className="hover:text-primary transition-colors">{t('footer_legal_link1')}</Link></li>
                  <li><Link href="/terms-of-service" className="hover:text-primary transition-colors">{t('footer_legal_link2')}</Link></li>
                  <li><Link href="/refund-policy" className="hover:text-primary transition-colors">{t('footer_legal_link3')}</Link></li>
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
