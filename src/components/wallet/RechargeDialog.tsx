'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Wallet, 
  CheckCircle, 
  Sparkles, 
  IndianRupee, 
  Zap, 
  ArrowRight, 
  Loader2,
  Info,
  ShieldCheck,
  CreditCard,
  ArrowDownToLine,
  Minus,
  Plus,
  CalendarDays,
  ChevronRight,
  Users,
  AlertTriangle
} from 'lucide-react'
import { PRICING_CONFIG } from '@/lib/constants'
import { verifyAndProcessWalletRecharge } from '@/lib/actions/walletActions'
import { useAppSelector } from '@/lib/hooks'
import { useToast } from '@/hooks/use-toast'
import { motion, AnimatePresence } from 'framer-motion'
import Confetti from 'react-confetti'
import { useWindowSize } from 'react-use'
import { auth } from '@/lib/firebase'

interface RechargeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (newBalance: number) => void
  maxBedCount?: number
  baseFee?: number
}

export default function RechargeDialog({ 
  open, 
  onOpenChange, 
  onSuccess,
  maxBedCount = 0,
  baseFee = PRICING_CONFIG.baseFee
}: RechargeDialogProps) {
  const { currentUser } = useAppSelector((state) => state.user)
  const { toast } = useToast()
  
  // -- State --
  const [bedCount, setBedCount] = useState(maxBedCount)
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'sixMonth' | 'yearly'>('monthly')
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [newBalance, setNewBalance] = useState(0)
  const [paymentError, setPaymentError] = useState<string | null>(null)

  // Sync bed count when dialog opens or maxBedCount changes
  useEffect(() => {
    if (open) {
      setBedCount(maxBedCount || 0)
      setPaymentError(null)
    }
  }, [open, maxBedCount])

  // Get current plan config
  const planConfig = PRICING_CONFIG[selectedPlan] as { perTenant: number }
  const monthsCount = selectedPlan === 'monthly' ? 1 : selectedPlan === 'sixMonth' ? 6 : 12
  const perTenantFee = planConfig.perTenant

  // Calculate Effective Fees including Premium Features
  let effectiveBaseFee = baseFee
  let effectivePerTenantFee = perTenantFee
  const activeFeatures = currentUser?.subscription?.premiumFeatures || {}
  
  Object.entries(PRICING_CONFIG.premiumFeatures).forEach(([key, feature]: [string, any]) => {
    if (activeFeatures[key as keyof typeof activeFeatures]?.enabled) {
      if (feature.billingType === 'monthly') {
        effectiveBaseFee += (feature.monthlyCharge || 0)
      } else if (feature.billingType === 'per_tenant') {
        effectivePerTenantFee += (feature.perTenantCharge || 0)
      }
    }
  })

  const monthlyCost = (bedCount * effectivePerTenantFee + effectiveBaseFee)
  const calculatedTotal = monthlyCost * monthsCount
  const effectiveAmount = selectedAmount || calculatedTotal

  const handleRecharge = async () => {
    const amount = effectiveAmount
    if (!amount || amount <= 0 || !currentUser?.id) {
      toast({ variant: 'destructive', title: 'Invalid amount', description: 'Please enter a valid amount.' })
      return
    }

    setIsProcessing(true)
    setPaymentError(null)

    try {
      // 1. Get Firebase auth token
      const token = await auth?.currentUser?.getIdToken()
      if (!token) {
        toast({ variant: 'destructive', title: 'Authentication Error', description: 'Please log in again and retry.' })
        setIsProcessing(false)
        return
      }

      // 2. Create Razorpay order via API
      const res = await fetch('/api/razorpay/create-wallet-recharge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          amount, 
          description: `Wallet recharge: ${bedCount} beds (${selectedPlan} plan)` 
        }),
      })
      const { success, order, error } = await res.json()
      if (!success || !order) throw new Error(error || 'Failed to create payment order.')

      // 3. Open Razorpay Checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: 'RoomBox Wallet Recharge',
        description: `Add ₹${amount} to your billing wallet`,
        order_id: order.id,
        handler: async (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
          // 4. Verify payment server-side and credit wallet
          try {
            setIsProcessing(true)
            const freshToken = await auth?.currentUser?.getIdToken(true)
            const result = await verifyAndProcessWalletRecharge({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              amount,
              description: `Wallet recharge: ${bedCount} beds (${selectedPlan} plan)`,
            }, freshToken || undefined)

            if (result.success && result.newBalance !== undefined) {
              setNewBalance(result.newBalance)
              setShowSuccess(true)
              onSuccess?.(result.newBalance)
            } else {
              setPaymentError(result.error || 'Verification failed. If money was deducted, it will be credited automatically via webhook.')
              toast({ variant: 'destructive', title: 'Verification Issue', description: result.error || 'Your payment will be credited automatically.' })
            }
          } catch (verifyErr: any) {
            setPaymentError('Payment received but verification failed. Your wallet will be credited automatically within a few minutes.')
            toast({ variant: 'destructive', title: 'Verification Error', description: 'Don\'t worry — your payment will be credited automatically.' })
          } finally {
            setIsProcessing(false)
          }
        },
        prefill: {
          name: currentUser.name || '',
          email: currentUser.email || '',
          contact: currentUser.phone || '',
        },
        theme: { color: '#6366f1' },
        modal: {
          ondismiss: () => {
            setIsProcessing(false)
            toast({ title: 'Payment Cancelled', description: 'You closed the payment window. No amount was charged.' })
          },
        },
      }

      const rzp = new (window as any).Razorpay(options)
      rzp.on('payment.failed', (response: any) => {
        setIsProcessing(false)
        const errorDesc = response?.error?.description || 'Payment could not be completed.'
        setPaymentError(errorDesc)
        toast({ variant: 'destructive', title: 'Payment Failed', description: errorDesc })
      })
      rzp.open()

    } catch (err: any) {
      setIsProcessing(false)
      setPaymentError(err.message || 'Could not initiate payment.')
      toast({ variant: 'destructive', title: 'Error', description: err.message || 'Could not initiate payment.' })
    }
  }

  const handleClose = () => {
    if (isProcessing) return
    setShowSuccess(false)
    setSelectedAmount(null)
    setBedCount(maxBedCount)
    setSelectedPlan('monthly')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md w-[95vw] max-h-[90vh] rounded-[2rem] sm:rounded-[2.5rem] border-none shadow-2xl p-0 flex flex-col bg-background/90 backdrop-blur-2xl overflow-hidden">
        <div className="flex-1 overflow-y-auto scrollbar-hide">
        <AnimatePresence mode="wait">
          {showSuccess ? (
            /* ─── Success State ──────────────────────── */
            <motion.div 
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="p-6 sm:p-10 text-center space-y-6 sm:space-y-8 relative overflow-hidden"
            >
              <Confetti
                width={400}
                height={400}
                numberOfPieces={200}
                recycle={false}
                colors={['#10b981', '#3b82f6', '#f59e0b']}
                className="absolute inset-0 pointer-events-none"
              />
              
              <div className="relative mx-auto w-24 h-24">
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.2 }}
                  className="relative z-10 flex items-center justify-center w-24 h-24 rounded-[2rem] bg-emerald-500 shadow-xl shadow-emerald-500/40"
                >
                  <CheckCircle className="w-12 h-12 text-white" />
                </motion.div>
                <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
              </div>

              <div className="space-y-2">
                <h3 className="text-3xl font-black tracking-tighter">Recharge Success!</h3>
                <p className="text-muted-foreground font-semibold px-4 leading-snug">
                  ₹{effectiveAmount.toLocaleString('en-IN')} has been added to your wallet.
                </p>
              </div>

              <div className="p-6 rounded-3xl bg-emerald-500/5 border-2 border-emerald-500/20 shadow-inner">
                <p className="text-[0.65rem] font-black text-emerald-600/60 dark:text-emerald-400/60 uppercase tracking-[0.2em] mb-2">Updated Balance</p>
                <p className="text-4xl font-black text-emerald-600 dark:text-emerald-400 tracking-tighter">
                  ₹{newBalance.toLocaleString('en-IN')}
                </p>
              </div>

              <Button 
                onClick={handleClose} 
                className="w-full rounded-2xl py-6 sm:py-8 font-black text-lg bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-600/20"
              >
                Awesome
              </Button>
            </motion.div>
          ) : (
            /* ─── Recharge Form ──────────────────────── */
            <motion.div
              key="form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col"
            >
              <DialogHeader className="p-4 sm:p-8 pb-2">
                <div className="flex items-center gap-4 mb-2">
                  <div className="p-3 bg-primary/10 rounded-[1.2rem] ring-4 ring-primary/5">
                    <Wallet className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <DialogTitle className="text-2xl font-black tracking-tight">Wallet Recharge</DialogTitle>
                    <DialogDescription className="text-[0.6rem] sm:text-xs font-bold text-muted-foreground/60 uppercase tracking-wider flex items-center gap-1.5 mt-0.5">
                      Current: <span className="text-foreground">₹{(currentUser?.wallet?.balance ?? 0).toLocaleString('en-IN')}</span>
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="px-5 sm:px-8 pb-6 space-y-3 sm:space-y-6">
                {/* ─── Hero Headline ─────────────────────────── */}
                <div className="text-center space-y-0.5 py-1">
                  <h2 className="text-xl font-black tracking-tight leading-tight">
                    Recharge for <span className="text-primary">{bedCount} Beds</span>
                  </h2>
                  <p className="text-[0.65rem] font-bold text-muted-foreground uppercase tracking-widest">
                    Coverage for {monthsCount} Month{monthsCount > 1 ? 's' : ''}
                  </p>
                </div>

                {/* ─── Prominent Bed Counter ──────────────── */}
                <div className="relative overflow-hidden p-4 sm:p-6 rounded-[1.8rem] sm:rounded-[2.5rem] bg-gradient-to-br from-primary/[0.08] to-primary/[0.02] border border-primary/20 shadow-xl shadow-primary/5 group transition-all hover:shadow-primary/10">
                  <div className="absolute top-2 right-4 opacity-10 group-hover:opacity-20 transition-opacity hidden sm:block">
                    <Users className="w-16 h-16 text-primary" />
                  </div>
                  
                  <p className="text-[0.6rem] font-black text-primary/60 uppercase tracking-[0.2em] mb-3 text-center">Beds to cover</p>
                  
                  <div className="flex items-center justify-between gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-background shadow-lg hover:bg-red-500/10 hover:text-red-500 transition-all border border-border/40 active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed"
                      onClick={() => setBedCount(Math.max(0, bedCount - 1))}
                      disabled={bedCount <= 0}
                    >
                      <Minus className="w-6 h-6" />
                    </Button>
                    
                    <div className="flex flex-col items-center min-w-[4rem]">
                      <span className="text-4xl sm:text-5xl font-black tracking-tighter text-primary">{bedCount}</span>
                      <span className="text-[0.6rem] font-black text-muted-foreground uppercase tracking-widest mt-1">Total Beds</span>
                    </div>

                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-background shadow-lg hover:bg-primary/10 hover:text-primary transition-all border border-border/40 active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed"
                      onClick={() => setBedCount(Math.min(maxBedCount, bedCount + 1))}
                      disabled={bedCount >= maxBedCount}
                    >
                      <Plus className="w-6 h-6" />
                    </Button>
                  </div>
                </div>

                {/* ─── Plan Selector ────────────────────────── */}
                <div className="space-y-2">
                  <p className="text-[0.65rem] font-black text-muted-foreground uppercase tracking-[0.2em] ml-2">Choose Billing Plan</p>
                  <div className="grid grid-cols-3 gap-1.5 p-1.5 rounded-[1.8rem] sm:rounded-[2rem] bg-muted/40 border border-border/40 shadow-inner">
                    {(['monthly', 'sixMonth', 'yearly'] as const).map((plan) => {
                      const isActive = selectedPlan === plan;
                      const planPrice = PRICING_CONFIG[plan].perTenant;
                      const planLabel = plan === 'monthly' ? 'Monthly' : plan === 'sixMonth' ? '6 Months' : 'Yearly';
                      
                      return (
                        <button
                          key={plan}
                          onClick={() => {
                            setSelectedPlan(plan);
                            setSelectedAmount(null);
                          }}
                          className={`
                            relative flex flex-col items-center justify-center py-4 rounded-[1.5rem] transition-all duration-300
                            ${isActive 
                              ? 'bg-background shadow-lg text-primary scale-100 ring-1 ring-primary/10' 
                              : 'text-muted-foreground/60 hover:text-muted-foreground hover:bg-background/50 scale-95 opacity-80'
                            }
                          `}
                        >
                          <span className="text-[0.6rem] font-black uppercase tracking-wider mb-1">{planLabel}</span>
                          <span className="text-lg font-black tracking-tighter">₹{planPrice}</span>
                          <span className="text-[0.5rem] font-bold opacity-60 uppercase tracking-tighter">/bed/mo</span>
                          {plan === 'sixMonth' && (
                            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-primary rounded-full shadow-lg z-20">
                              <span className="text-[0.45rem] font-black text-white uppercase tracking-tighter whitespace-nowrap">Best Value</span>
                            </div>
                          )}
                          {isActive && (
                            <motion.div 
                              layoutId="activePlan"
                              className="absolute -top-1 -right-1"
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                            >
                              <div className="p-1 bg-primary rounded-full shadow-lg">
                                <Sparkles className="w-2.5 h-2.5 text-white" />
                              </div>
                            </motion.div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ─── Transparency Breakdown ───────────────── */}
                <div className="space-y-2 sm:space-y-4 p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] bg-primary/5 border border-primary/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[0.65rem] font-black text-muted-foreground uppercase tracking-widest">Monthly Cost</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-base sm:text-lg font-black text-foreground">₹{monthlyCost.toLocaleString('en-IN')}</span>
                        <span className="text-[0.55rem] font-bold text-muted-foreground uppercase tracking-tighter">/ month</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[0.65rem] font-black text-primary uppercase tracking-widest">Total Payable</p>
                      <p className="text-2xl sm:text-3xl font-black tracking-tighter text-primary">₹{calculatedTotal.toLocaleString('en-IN')}</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-primary/10 flex flex-col gap-1">
                    <div className="flex items-center justify-between text-[0.6rem] sm:text-[0.65rem] font-bold">
                      <span className="text-muted-foreground italic capitalize">Base Fee</span>
                      <span className="text-foreground">₹{effectiveBaseFee}/mo</span>
                    </div>
                    <div className="flex items-center justify-between text-[0.6rem] sm:text-[0.65rem] font-bold">
                      <span className="text-muted-foreground italic">{bedCount} Beds @ ₹{effectivePerTenantFee}</span>
                      <span className="text-foreground">₹{bedCount * effectivePerTenantFee}/mo</span>
                    </div>
                    <div className="flex items-center justify-between text-[0.6rem] sm:text-[0.65rem] font-bold mt-0.5">
                      <span className="text-muted-foreground italic">Billing Cycle</span>
                      <span className="text-primary font-black uppercase tracking-tighter">× {monthsCount} Months</span>
                    </div>
                  </div>
                </div>

                {/* Custom Top-up (Minimalist) */}
                <div className="text-center">
                  <button 
                    onClick={() => {
                      const amount = prompt("Enter amount to add to wallet (₹)", "500");
                      if (amount && !isNaN(parseInt(amount))) {
                        setSelectedAmount(parseInt(amount));
                      }
                    }}
                    className="text-[0.65rem] font-black text-muted-foreground/40 hover:text-primary uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 mx-auto"
                  >
                    <div className="h-[1px] w-8 bg-muted-foreground/10" />
                    <span>Custom Top-up</span>
                    <div className="h-[1px] w-8 bg-muted-foreground/10" />
                  </button>
                  {selectedAmount && (
                    <motion.div 
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-3 flex items-center justify-between p-3 px-4 rounded-2xl bg-background border border-primary/20 shadow-sm"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">Custom</Badge>
                        <span className="text-sm font-black tracking-tight">₹{selectedAmount.toLocaleString('en-IN')}</span>
                      </div>
                      <button onClick={() => setSelectedAmount(null)} className="p-1.5 rounded-xl hover:bg-red-500/10 text-red-500 transition-colors">
                        <Minus className="w-4 h-4" />
                      </button>
                    </motion.div>
                  )}
                </div>

                {/* Payment Error Alert */}
                {paymentError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start gap-3"
                  >
                    <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-red-600 dark:text-red-400">Payment Issue</p>
                      <p className="text-xs text-red-500/80 mt-1">{paymentError}</p>
                      <button 
                        onClick={() => setPaymentError(null)}
                        className="text-xs font-bold text-red-500 hover:text-red-600 mt-2 underline"
                      >
                        Dismiss
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Recharge Button */}
                <div className="space-y-4">
                  <Button
                    onClick={handleRecharge}
                    disabled={effectiveAmount <= 0 || isProcessing}
                    className="w-full py-5 sm:py-9 rounded-[1.5rem] sm:rounded-[2rem] font-black text-lg sm:text-xl shadow-2xl shadow-primary/20 transform transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50 relative overflow-hidden group"
                  >
                    {isProcessing ? (
                      <span className="flex items-center gap-3">
                        <Loader2 className="w-6 h-6 animate-spin" /> Processing...
                      </span>
                    ) : (
                      <span className="flex items-center gap-3">
                        {effectiveAmount > 0 ? `Pay ₹${effectiveAmount.toLocaleString('en-IN')}` : 'Select Amount'}
                        <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                      </span>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
                  </Button>

                  <div className="flex items-center justify-center gap-4 text-[0.55rem] font-black text-muted-foreground/30 uppercase tracking-[0.2em]">
                    <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3 text-primary" /> Secure</span>
                    <span className="w-1 h-1 rounded-full bg-muted-foreground/10" />
                    <span className="flex items-center gap-1"><CreditCard className="w-3 h-3" /> Razorpay</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  )
}
