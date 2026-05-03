'use client';

import React, { useState, useMemo } from 'react';
import { useTranslation } from '@/context/language-context';
import { PRICING_CONFIG } from '@/lib/constants';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { IndianRupee, Globe, MessageSquare, TrendingDown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SavingsCalculator = () => {
    const { t } = useTranslation();
    const [tenants, setTenants] = useState([20]);
    const [includeWebsite, setIncludeWebsite] = useState(false);
    const [includeWhatsapp, setIncludeWhatsapp] = useState(false);

    const tenantCount = tenants[0];

    const calculations = useMemo(() => {
        const baseFee = PRICING_CONFIG.baseFee;
        const websiteFee = includeWebsite ? PRICING_CONFIG.premiumFeatures.website.monthlyCharge : 0;
        const whatsappFee = includeWhatsapp ? PRICING_CONFIG.premiumFeatures.whatsapp.perTenantCharge * tenantCount : 0;
        const addonTotal = websiteFee + whatsappFee;

        const monthlyCost = baseFee + (PRICING_CONFIG.monthly.perTenant * tenantCount) + addonTotal;
        const sixMonthCost = baseFee + (PRICING_CONFIG.sixMonth.perTenant * tenantCount) + addonTotal;
        const yearlyCost = baseFee + (PRICING_CONFIG.yearly.perTenant * tenantCount) + addonTotal;

        const monthlySavings = monthlyCost - yearlyCost;
        const savingsPercentage = Math.round((monthlySavings / monthlyCost) * 100);

        return {
            monthly: monthlyCost,
            sixMonth: sixMonthCost,
            yearly: yearlyCost,
            savings: monthlySavings,
            percentage: savingsPercentage
        };
    }, [tenantCount, includeWebsite, includeWhatsapp]);

    return (
        <div className="w-full max-w-4xl mx-auto py-12 px-4">
            <div className="text-center space-y-4 mb-10">
                <h2 className="text-3xl font-bold">{t('calculator_title')}</h2>
                <p className="text-muted-foreground">{t('calculator_subtitle')}</p>
            </div>

            <div className="grid lg:grid-cols-5 gap-8">
                {/* Inputs */}
                <Card className="lg:col-span-3">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <TrendingDown className="w-5 h-5 text-primary" />
                            {t('tenants_label')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-8">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-2xl font-bold text-primary">{tenantCount}</span>
                                <span className="text-sm text-muted-foreground">{t('calculator_tenants_unit')}</span>
                            </div>
                            <div className="flex flex-wrap gap-2 mb-4">
                                {[10, 25, 50, 100, 150].map((count) => (
                                    <Button 
                                        key={count} 
                                        variant="outline" 
                                        size="sm" 
                                        className={cn(
                                            "rounded-full transition-all",
                                            tenantCount === count ? "bg-primary text-primary-foreground border-primary" : "hover:border-primary/50"
                                        )}
                                        onClick={() => setTenants([count])}
                                    >
                                        {count}
                                    </Button>
                                ))}
                            </div>
                            <Slider 
                                value={tenants} 
                                onValueChange={setTenants} 
                                max={200} 
                                min={1} 
                                step={1}
                                className="py-4"
                            />
                        </div>

                        <div className="space-y-4 pt-4 border-t">
                            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">{t('premium_addons_title')}</h4>
                            
                            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-dashed transition-colors hover:bg-muted/50">
                                <div className="flex items-center gap-3">
                                    <Globe className="w-5 h-5 text-blue-500" />
                                    <div>
                                        <p className="font-medium text-sm">{t('premium_addon_website_label')}</p>
                                        <p className="text-xs text-muted-foreground">{t('premium_addon_website_price', { price: PRICING_CONFIG.premiumFeatures.website.monthlyCharge })}</p>
                                    </div>
                                </div>
                                <Switch checked={includeWebsite} onCheckedChange={setIncludeWebsite} />
                            </div>

                            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-dashed transition-colors hover:bg-muted/50">
                                <div className="flex items-center gap-3">
                                    <MessageSquare className="w-5 h-5 text-green-500" />
                                    <div>
                                        <p className="font-medium text-sm">{t('premium_addon_whatsapp_label')}</p>
                                        <p className="text-xs text-muted-foreground">{t('premium_addon_whatsapp_price', { price: PRICING_CONFIG.premiumFeatures.whatsapp.perTenantCharge })}</p>
                                    </div>
                                </div>
                                <Switch checked={includeWhatsapp} onCheckedChange={setIncludeWhatsapp} />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Results */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-saffron to-orange-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                        <Card className="relative bg-card border-2 border-primary/20 overflow-hidden">
                            <div className="absolute top-0 right-0 p-2">
                                <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                            </div>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">{t('total_monthly_cost')}</CardTitle>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl font-black text-primary">₹{calculations.yearly}</span>
                                    <span className="text-muted-foreground font-medium text-sm">{t('per_month')}</span>
                                </div>
                                <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 mt-1 border-green-200">
                                    {t('save_percentage', { percentage: calculations.percentage })}
                                </Badge>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-4 border-t border-primary/10">
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-muted-foreground">{t('pricing_yearly_commitment')}</span>
                                        <span className="font-bold">₹{calculations.yearly}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm opacity-60">
                                        <span>{t('pricing_six_month_commitment')}</span>
                                        <span>₹{calculations.sixMonth}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm opacity-60">
                                        <span>{t('pricing_monthly_pay_as_you_go')}</span>
                                        <span>₹{calculations.monthly}</span>
                                    </div>
                                </div>
                                
                                <div className="pt-4 mt-4 border-t border-dashed">
                                    <p className="text-xs font-bold text-green-600 dark:text-green-400 flex items-center gap-2">
                                        <TrendingDown className="w-3 h-3" />
                                        {t('calculator_yearly_savings_banner', { amount: calculations.savings * 12 })}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                        <p className="text-xs text-muted-foreground italic leading-relaxed">
                            {t('calculator_base_fee_disclaimer', { baseFee: PRICING_CONFIG.baseFee })}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SavingsCalculator;
