
'use client'

import { useState, useTransition } from 'react';
import { useAppSelector, useAppDispatch } from '@/lib/hooks';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Check, Loader2, Star, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { plans } from '@/lib/mock-data';
import type { Plan, PlanName } from '@/lib/types';
import { createRazorpaySubscription, verifySubscriptionPayment } from '@/lib/actions/subscriptionActions';
import { updateUserPlan } from '@/lib/slices/userSlice';
import { Badge } from '@/components/ui/badge';

const planOrder: PlanName[] = ['starter', 'pro', 'business'];

const getPlanFeatures = (plan: Plan) => [
    { text: `${plan.pgLimit === 'unlimited' ? 'Unlimited' : `Up to ${plan.pgLimit}`} Propert${plan.pgLimit !== 1 ? 'ies' : 'y'}`, included: true },
    { text: 'Staff Management', included: plan.hasStaffManagement },
    { text: 'AI Rent Reminders & SEO', included: plan.hasAiRentReminders },
    { text: 'Public Website Builder', included: plan.hasWebsiteBuilder },
    { text: 'Automated KYC Verification', included: plan.hasKycVerification },
    { text: 'Cloud Sync & Backup', included: plan.hasCloudSync },
];

interface SubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SubscriptionDialog({ open, onOpenChange }: SubscriptionDialogProps) {
  const { currentUser, currentPlan } = useAppSelector(state => state.user);
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const [isSubscribing, startSubscriptionTransition] = useTransition();

  const handlePlanChange = (planId: PlanName) => {
    if (!currentUser || !currentPlan || planId === currentPlan.id) return;
    const plan = plans[planId];
    if (!plan || typeof plan.price !== 'number' || plan.price <= 0) {
      toast({ variant: 'destructive', title: "Invalid Plan", description: "This plan cannot be subscribed to automatically." });
      return;
    }

    startSubscriptionTransition(async () => {
      const res = await createRazorpaySubscription(planId, currentUser.id);
      if (!res.success || !res.subscription) {
        toast({ variant: 'destructive', title: 'Error', description: res.error || 'Could not initiate subscription.' });
        return;
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        subscription_id: res.subscription.id,
        name: 'RentVastu Subscription',
        description: `${plan.name} Plan`,
        handler: async (response: any) => {
          const verificationResult = await verifySubscriptionPayment({ ...response, userId: currentUser.id, planId });
          if (verificationResult.success) {
            dispatch(updateUserPlan(planId));
            toast({ title: 'Success!', description: `You've successfully subscribed to the ${plan.name} plan.` });
            onOpenChange(false);
          } else {
            toast({ variant: 'destructive', title: 'Payment Failed', description: verificationResult.error || 'Payment verification failed.' });
          }
        },
        prefill: {
          name: currentUser.name,
          email: currentUser.email,
        },
        theme: { color: '#2563EB' }
      };
      
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="text-2xl font-bold text-center">Upgrade Your Plan</DialogTitle>
          <DialogDescription className="text-center max-w-lg mx-auto">
            Choose a plan that fits your business needs and unlock powerful features to grow your rental empire.
          </DialogDescription>
        </DialogHeader>
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {planOrder.map(planId => {
                const plan = plans[planId];
                const isCurrentPlan = currentPlan?.id === planId;
                const isPopular = plan.id === 'pro';
                const planFeatures = getPlanFeatures(plan);
                return (
                    <Card key={plan.id} className={cn("flex flex-col h-full", isPopular && "border-2 border-primary", isCurrentPlan && "ring-2 ring-indigo-500")}>
                        <CardHeader className="text-center">
                            {isPopular && <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Most Popular</Badge>}
                            <CardTitle className="text-xl font-bold">{plan.name}</CardTitle>
                            <CardDescription>{plan.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow">
                             <div className="mb-6 text-center">
                                <span className="text-4xl font-bold">
                                    {typeof plan.price === 'number' && plan.price > 0 ? `₹${plan.price}` : plan.price}
                                </span>
                                <span className="text-muted-foreground text-sm ml-1">{plan.pricePeriod}</span>
                            </div>
                            <ul className="space-y-3 text-sm">
                                {planFeatures.map(feature => (
                                    <li key={feature.text} className={cn("flex items-start gap-3", !feature.included && "text-muted-foreground opacity-60")}>
                                        <Check className="w-5 h-5 text-green-500 mt-0.5 shrink-0"/>
                                        <span>{feature.text}</span>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                        <div className="p-4">
                            <Button 
                                onClick={() => handlePlanChange(plan.id as PlanName)} 
                                disabled={isCurrentPlan || isSubscribing} 
                                className={cn("w-full", isPopular && !isCurrentPlan && "bg-accent text-accent-foreground hover:bg-accent/90")}
                            >
                                {isSubscribing && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                {isCurrentPlan ? 'Current Plan' : isSubscribing ? 'Processing...' : 'Choose Plan'}
                            </Button>
                        </div>
                    </Card>
                )
            })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
