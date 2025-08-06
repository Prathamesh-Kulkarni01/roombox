
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

  const handleSubscribe = () => {
    if (!currentUser) return;
    
    startSubscriptionTransition(async () => {
      const res = await createRazorpaySubscription(currentUser.id);
      if (!res.success || !res.subscription) {
        toast({ variant: 'destructive', title: 'Error', description: res.error || 'Could not initiate subscription.' });
        return;
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        subscription_id: res.subscription.id,
        name: 'RentSutra Subscription',
        description: `Usage-based Billing`,
        handler: async (response: any) => {
          const verificationResult = await verifySubscriptionPayment({ ...response, userId: currentUser.id });
          if (verificationResult.success) {
            // Plan is now 'pro' to unlock features, billing is dynamic
            dispatch(updateUserPlan('pro')); 
            toast({ title: 'Success!', description: `You've successfully subscribed!` });
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
      <DialogContent className="max-w-md p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="text-2xl font-bold text-center">Subscription</DialogTitle>
          <DialogDescription className="text-center max-w-lg mx-auto">
            Our platform operates on a fair, usage-based billing model. Activate your subscription to unlock all features.
          </DialogDescription>
        </DialogHeader>
        <div className="p-6 pt-0">
          <Card className="border-2 border-primary shadow-lg">
             <CardHeader className="text-center">
                <CardTitle className="text-xl font-bold">Usage-Based Plan</CardTitle>
                <CardDescription>Pay only for what you use.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center mb-6">
                <p className="text-sm text-muted-foreground">Starts at</p>
                <p className="text-4xl font-bold">₹100<span className="text-base font-normal text-muted-foreground">/property/month</span></p>
                <p className="text-sm text-muted-foreground">+ small fee per tenant</p>
              </div>
              <ul className="space-y-3 text-sm">
                  {getPlanFeatures(plans.pro).map(feature => (
                      <li key={feature.text} className="flex items-start gap-3">
                          <Check className="w-5 h-5 text-green-500 mt-0.5 shrink-0"/>
                          <span>{feature.text}</span>
                      </li>
                  ))}
              </ul>
            </CardContent>
            <div className="p-4 pt-0">
              <Button 
                  onClick={handleSubscribe} 
                  disabled={currentPlan?.id !== 'free' || isSubscribing} 
                  className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
              >
                  {isSubscribing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                  {currentPlan?.id !== 'free' ? 'Already Subscribed' : 'Activate Subscription'}
              </Button>
            </div>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
