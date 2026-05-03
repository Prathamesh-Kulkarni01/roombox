
'use client'

import { useState, useTransition, useMemo } from 'react';
import { useAppSelector, useAppDispatch } from '@/lib/hooks';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Check, Loader2, Star, ShieldAlert, TrendingDown, IndianRupee, Users, Sparkles, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { BillingPlanType } from '@/lib/types';
import { createRazorpaySubscription, verifySubscriptionPayment } from '@/lib/actions/subscriptionActions';
import { initializeUser } from '@/lib/slices/userSlice';
import { auth } from '@/lib/firebase';
import { PRICING_CONFIG } from '@/lib/constants';
import { useTranslation } from '@/context/language-context';

interface WalletPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function WalletPlanDialog({ open, onOpenChange }: WalletPlanDialogProps) {
  const { t } = useTranslation();
  const { currentUser } = useAppSelector(state => state.user);
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const [isSubscribing, startSubscriptionTransition] = useTransition();
  const [selectedTier, setSelectedTier] = useState<BillingPlanType>(currentUser?.billingConfig?.planType || 'monthly');

  const commitmentTiers = useMemo(() => [
    { id: 'monthly' as BillingPlanType, label: t('plan_monthly' as any) || 'Monthly', price: PRICING_CONFIG.monthly.perTenant, savings: t('standard_rate') },
    { id: 'sixMonth' as BillingPlanType, label: t('plan_six_month' as any) || '6-Month', price: PRICING_CONFIG.sixMonth.perTenant, savings: t('saving_33' as any) || '33% Savings', popular: true },
    { id: 'yearly' as BillingPlanType, label: t('plan_yearly' as any) || 'Yearly', price: PRICING_CONFIG.yearly.perTenant, savings: t('saving_66' as any) || '66% Savings' },
  ], [t]);

  const tenantCount = currentUser?.wallet?.activeTenantCount || 0;
  const standardPrice = PRICING_CONFIG.monthly.perTenant;
  const selectedPrice = PRICING_CONFIG[selectedTier === 'trial' ? 'monthly' : selectedTier].perTenant;
  
  const monthlySavings = (standardPrice - selectedPrice) * tenantCount;
  const totalMonthlyCost = (selectedPrice * tenantCount) + PRICING_CONFIG.baseFee;

  const handleUpdateTier = () => {
    if (!currentUser) return;
    
    startSubscriptionTransition(async () => {
      const { updateCommitmentTier } = await import('@/lib/actions/billingActions');
      const res = await updateCommitmentTier(currentUser.id, selectedTier);
      
      if (res.success) {
        if (auth && auth.currentUser) {
            dispatch(initializeUser(auth.currentUser));
        }
        toast({ 
            title: 'Commitment Updated', 
            description: `You are now on the ${selectedTier === 'sixMonth' ? '6-Month' : selectedTier} commitment tier.` 
        });
        onOpenChange(false);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: res.error || 'Could not update commitment tier.' });
      }
    });
  };

  const handleSubscribe = () => {
    if (!currentUser || !auth) return;
    
    startSubscriptionTransition(async () => {
      const token = await auth?.currentUser?.getIdToken();
      const res = await createRazorpaySubscription(token);
      if (!res.success || !res.subscription) {
        toast({ variant: 'destructive', title: 'Error', description: res.error || 'Could not initiate subscription.' });
        return;
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        subscription_id: res.subscription.id,
        name: 'RentSutra Subscription',
        description: `Commitment: ${selectedTier}`,
        handler: async (response: any) => {
          if (!auth?.currentUser) return;
          const token = await auth.currentUser.getIdToken();
          const verificationResult = await verifySubscriptionPayment(response, token);
          if (verificationResult.success) {
            const { updateCommitmentTier } = await import('@/lib/actions/billingActions');
            await updateCommitmentTier(currentUser.id, selectedTier);
            
            dispatch(initializeUser(auth.currentUser));
            toast({ title: 'Success!', description: `Plan activated with ${selectedTier} commitment!` });
            onOpenChange(false);
          } else {
            toast({ variant: 'destructive', title: 'Payment Failed', description: verificationResult.error || 'Payment verification failed.' });
          }
        },
        prefill: {
          name: currentUser.name,
          email: currentUser.email,
        },
        theme: { color: '#6366f1' }
      };
      
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    });
  };

  const isTrialing = currentUser?.subscription?.status === 'trialing';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 flex flex-col max-h-[95dvh] overflow-hidden rounded-[2.5rem] border-none shadow-2xl">
        <DialogHeader className="p-8 pb-10 text-left bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 text-white relative">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <TrendingDown className="w-32 h-32 rotate-12" />
          </div>
          <div className="flex items-center gap-3 mb-3 relative z-10">
            <div className="p-2.5 bg-white/20 rounded-2xl backdrop-blur-md ring-1 ring-white/30">
                <Star className="w-6 h-6 fill-white text-white" />
            </div>
            <DialogTitle className="text-3xl font-black tracking-tight">{t('pricing_efficiency_title')}</DialogTitle>
          </div>
          <DialogDescription className="text-indigo-100 font-medium text-lg max-w-md relative z-10 leading-snug">
            {t('pricing_efficiency_desc')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-zinc-50 dark:bg-zinc-950">
          {isTrialing && (
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 rounded-[1.5rem] p-5 flex gap-4 items-start shadow-sm">
              <ShieldAlert className="w-6 h-6 shrink-0 mt-0.5" />
              <div>
                <p className="font-black uppercase tracking-widest text-[10px] mb-1">{t('trial_active_title')}</p>
                <p className="text-sm font-semibold leading-relaxed">
                  You have <strong className="text-amber-700 font-black">₹{PRICING_CONFIG.trial.credit}</strong> trial credit. {t('trial_active_desc')}
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {commitmentTiers.map((tier) => (
              <Card 
                key={tier.id}
                onClick={() => setSelectedTier(tier.id)}
                className={cn(
                  "relative cursor-pointer transition-all duration-500 border-2 rounded-[2rem] overflow-hidden group py-2",
                  selectedTier === tier.id 
                    ? "border-indigo-600 bg-white dark:bg-zinc-900 shadow-2xl shadow-indigo-500/20 scale-[1.02]" 
                    : "border-transparent bg-white/50 dark:bg-zinc-900/50 hover:border-indigo-200 hover:bg-white dark:hover:bg-zinc-900"
                )}
              >
                {tier.popular && (
                  <div className="absolute top-0 right-0">
                    <div className="bg-indigo-600 text-white text-[10px] font-black px-4 py-1.5 rounded-bl-[1.2rem] uppercase tracking-tighter shadow-lg">
                      {t('best_value')}
                    </div>
                  </div>
                )}
                <CardHeader className="pb-3 pt-6">
                  <CardTitle className="text-xl font-black">{tier.label}</CardTitle>
                  <CardDescription className={cn(
                    "text-[10px] font-black uppercase tracking-[0.15em]",
                    selectedTier === tier.id ? "text-indigo-600" : "text-muted-foreground/60"
                  )}>
                    {tier.savings}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-6">
                    <span className="text-4xl font-black tracking-tighter">₹{tier.price}</span>
                    <span className="text-xs text-muted-foreground font-bold opacity-60"> / {t('per_tenant')}</span>
                  </div>
                  <ul className="space-y-2.5">
                    <li className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-muted-foreground/70">
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{t('unlimited_features')}</span>
                    </li>
                    <li className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-muted-foreground/70">
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{t('base_fee_label', { amount: PRICING_CONFIG.baseFee })}</span>
                    </li>
                  </ul>
                </CardContent>
                <div className={cn(
                  "h-2 w-full bg-indigo-600 transition-all duration-500",
                  selectedTier === tier.id ? "opacity-100" : "opacity-0"
                )} />
              </Card>
            ))}
          </div>

          {/* Efficiency Calculator */}
          <div className="bg-indigo-600/[0.03] border border-indigo-600/10 rounded-[2rem] p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-600/10 rounded-xl text-indigo-600">
                        <Users className="w-5 h-5" />
                    </div>
                    <div>
                        <h4 className="font-black text-xs uppercase tracking-[0.2em] text-indigo-600/80">{t('efficiency_calculator_title')}</h4>
                        <p className="text-sm font-bold text-muted-foreground">{t('efficiency_calculator_desc', { count: tenantCount })}</p>
                    </div>
                </div>
                {monthlySavings > 0 && (
                    <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center gap-2 animate-bounce-subtle">
                        <Sparkles className="w-3 h-3 text-emerald-600" />
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{t('saving_per_mo', { amount: monthlySavings })}</span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 gap-8 relative">
                <div className="space-y-1">
                    <p className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-widest">{t('standard_monthly')}</p>
                    <p className="text-2xl font-black text-muted-foreground/40 italic line-through decoration-red-500/30 decoration-4">
                        ₹{((standardPrice * tenantCount) + PRICING_CONFIG.baseFee).toLocaleString('en-IN')}
                    </p>
                </div>
                <div className="space-y-1 text-right">
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{t('optimized_rate')}</p>
                    <p className="text-4xl font-black text-indigo-600 tracking-tighter">
                        ₹{totalMonthlyCost.toLocaleString('en-IN')}
                        <span className="text-sm font-bold text-muted-foreground ml-1">/{t('month')}</span>
                    </p>
                </div>
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20">
                    <ArrowRight className="w-8 h-8 text-indigo-600" />
                </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 px-2">
                <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-white dark:bg-zinc-900 flex items-center justify-center text-indigo-600 shadow-sm shrink-0 border border-indigo-100">
                        <Check className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                        <p className="text-xs font-black uppercase tracking-widest">{t('scale_profitably_title')}</p>
                        <p className="text-[11px] font-medium text-muted-foreground leading-relaxed">
                            {t('scale_profitably_desc')}
                        </p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-white dark:bg-zinc-900 flex items-center justify-center text-indigo-600 shadow-sm shrink-0 border border-indigo-100">
                        <Check className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                        <p className="text-xs font-black uppercase tracking-widest">{t('zero_caps_title')}</p>
                        <p className="text-[11px] font-medium text-muted-foreground leading-relaxed">
                            {t('zero_caps_desc')}
                        </p>
                    </div>
                </div>
          </div>
        </div>

        <div className="p-8 bg-white dark:bg-zinc-900 border-t flex flex-col sm:flex-row gap-6 items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/5 flex items-center justify-center text-indigo-600 border border-indigo-100">
                <IndianRupee className="w-6 h-6" />
            </div>
            <div className="text-left">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">{t('base_platform_fee')}</p>
                <p className="text-2xl font-black tracking-tight">₹{PRICING_CONFIG.baseFee} <span className="text-sm font-bold text-muted-foreground opacity-40">/ {t('month')}</span></p>
            </div>
          </div>
          <Button 
              size="lg"
              onClick={isTrialing ? handleSubscribe : handleUpdateTier} 
              disabled={isSubscribing} 
              className="w-full sm:w-auto px-16 py-8 rounded-[1.5rem] text-xl font-black shadow-2xl shadow-indigo-600/20 bg-indigo-600 hover:bg-indigo-700 transition-all transform active:scale-[0.98] group"
          >
              {isSubscribing ? (
                <Loader2 className="mr-2 h-6 w-6 animate-spin"/>
              ) : (
                <>
                    {isTrialing ? t('activate_commitment') : t('update_tier')}
                    <ArrowRight className="w-6 h-6 ml-3 group-hover:translate-x-1 transition-transform" />
                </>
              )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
