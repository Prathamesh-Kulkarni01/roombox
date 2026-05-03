'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Wallet, 
  Users, 
  Receipt, 
  Crown, 
  AlertTriangle, 
  TrendingDown, 
  ArrowRight, 
  Sparkles,
  ChevronDown,
  ChevronUp,
  Info,
  Calendar,
  Zap
} from 'lucide-react'
import { useAppSelector } from '@/lib/hooks'
import { PRICING_CONFIG } from '@/lib/constants'
import { estimateBalanceRunway } from '@/lib/actions/walletActions'
import { calculateLowBalanceStage } from '@/lib/utils'
import { getBillingDetails } from '@/lib/actions/billingActions'
import type { BillingDetails, LowBalanceStage, BillingPlanType, BillingCycleDetails } from '@/lib/types'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

interface BillingWidgetData {
  walletBalance: number
  currentMonthBill: number
  activeTenants: number
  planType: BillingPlanType
  daysLeft: number
  lowBalanceStage: LowBalanceStage
  isTrialing: boolean
  trialDaysLeft: number
  trialTenantLimit: number
  totalBeds: number
  currentCycleDetails?: BillingCycleDetails
}

export default function BillingWidget() {
  const { currentUser } = useAppSelector((state) => state.user)
  const [data, setData] = useState<BillingWidgetData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showBreakdown, setShowBreakdown] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser?.id) return
      setIsLoading(true)

      try {
        const [billingResult, runwayResult] = await Promise.all([
          getBillingDetails(currentUser.id),
          estimateBalanceRunway(currentUser.id),
        ])

        const balance = currentUser.wallet?.balance ?? 0
        const subscription = currentUser.subscription
        const isTrialing = subscription?.status === 'trialing'

        // Calculate trial days left
        let trialDaysLeft = 0
        if (isTrialing && subscription?.trialEndDate) {
          const endDate = new Date(subscription.trialEndDate)
          const now = new Date()
          trialDaysLeft = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
        }

        setData({
          walletBalance: balance,
          currentMonthBill: billingResult.data?.currentCycle.totalAmount ?? 0,
          activeTenants: billingResult.data?.details.billableTenantCount ?? 0,
          planType: currentUser.billingConfig?.planType ?? (isTrialing ? 'trial' : 'monthly'),
          daysLeft: runwayResult.daysLeft ?? 999,
          lowBalanceStage: calculateLowBalanceStage(balance),
          isTrialing,
          trialDaysLeft,
          trialTenantLimit: subscription?.trialTenantLimit ?? PRICING_CONFIG.trial.maxTenants,
          totalBeds: billingResult.data?.details.totalBeds ?? 0,
          currentCycleDetails: billingResult.data?.currentCycle
        })
      } catch (error) {
        console.error('Error loading billing widget:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [currentUser?.id, currentUser?.wallet?.balance, currentUser?.subscription?.status, currentUser?.billingConfig?.planType])

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-[120px] rounded-2xl bg-muted/30 animate-pulse" />
        ))}
      </div>
    )
  }

  if (!data) return null

  const planLabels: Record<BillingPlanType, string> = {
    monthly: 'Monthly',
    sixMonth: '6 Months',
    yearly: 'Yearly',
    trial: 'Trial',
  }

  const perTenantFee = data.currentCycleDetails?.perTenantFee ?? PRICING_CONFIG.monthly.perTenant
  const trialProgress = (data.activeTenants / data.trialTenantLimit) * 100

  return (
    <div className="space-y-4">
      {/* Low Balance Warning */}
      {data.lowBalanceStage !== 'normal' && !data.isTrialing && (
        <LowBalanceAlert stage={data.lowBalanceStage} daysLeft={data.daysLeft} balance={data.walletBalance} />
      )}

      {/* Trial Banner & Progress */}
      {data.isTrialing && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-50/80 via-white to-orange-50/80 dark:from-amber-500/10 dark:via-background dark:to-orange-500/10 p-5 backdrop-blur-xl shadow-xl shadow-amber-500/5"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-amber-500/20 rounded-2xl ring-4 ring-amber-500/5">
                <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black tracking-tight text-amber-900 dark:text-amber-200">
                  Trial Active: {data.trialDaysLeft} days left
                </h3>
                <p className="text-sm text-amber-700/70 dark:text-amber-400/60 font-medium">
                  Enjoy all premium features for free up to {data.trialTenantLimit} tenants.
                </p>
              </div>
            </div>
            <Link href="/dashboard/subscription">
              <Button size="lg" className="w-full sm:w-auto rounded-2xl font-black text-sm bg-amber-500 hover:bg-amber-600 text-white shadow-xl shadow-amber-500/20 group">
                Go Premium <Zap className="w-4 h-4 ml-2 group-hover:fill-current transition-all" />
              </Button>
            </Link>
          </div>

          <div className="mt-6 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-amber-700/60 dark:text-amber-400/40 px-1">
              <span>Trial Usage: {data.activeTenants} / {data.trialTenantLimit} Tenants</span>
              <span>{Math.round(trialProgress)}%</span>
            </div>
            <Progress value={trialProgress} className="h-3 rounded-full bg-amber-500/10 ring-1 ring-amber-500/20" 
            />
          </div>
          
          {/* Decorative shapes */}
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-orange-500/5 rounded-full blur-2xl" />
        </motion.div>
      )}

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Wallet Balance */}
        <Link href="/dashboard/subscription" className="group">
          <Card className={`relative overflow-hidden backdrop-blur-md border-border/40 rounded-3xl transition-all duration-500 hover:shadow-2xl hover:shadow-emerald-500/10 hover:border-emerald-500/30 group-hover:-translate-y-1 h-full bg-background/40 ${
            data.lowBalanceStage === 'restricted' ? 'border-red-500/30 bg-red-50/30 dark:bg-red-500/5' : ''
          }`}>
            <CardContent className="p-5 flex flex-col justify-between h-full relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 bg-emerald-500/10 rounded-2xl ring-4 ring-emerald-500/5 group-hover:bg-emerald-500/20 transition-all">
                  <Wallet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <Badge variant="secondary" className="text-[0.65rem] font-black uppercase tracking-widest rounded-xl px-2.5 py-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-none">
                  Wallet
                </Badge>
              </div>
              <div className="space-y-1">
                <p className={`text-3xl font-black tracking-tighter ${
                  data.walletBalance <= 0 ? 'text-red-600 dark:text-red-400' : 
                  data.walletBalance <= PRICING_CONFIG.lowBalance.riskThreshold ? 'text-amber-600 dark:text-amber-400' :
                  'text-emerald-600 dark:text-emerald-400'
                }`}>
                  ₹{data.walletBalance.toLocaleString('en-IN')}
                </p>
                <div className="flex items-center gap-1.5 text-[0.7rem] font-bold text-muted-foreground/80">
                  {data.isTrialing ? (
                    <span className="flex items-center gap-1"><Info className="w-3 h-3" /> No charges in trial</span>
                  ) : (
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> ~{data.daysLeft} days left</span>
                  )}
                </div>
              </div>
            </CardContent>
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-500/5 to-transparent rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-150 duration-700" />
          </Card>
        </Link>

        {/* Current Month Bill */}
        <div 
          onClick={() => setShowBreakdown(!showBreakdown)}
          className="group cursor-pointer"
        >
          <Card className="relative overflow-hidden backdrop-blur-md border-border/40 rounded-3xl transition-all duration-500 hover:shadow-2xl hover:shadow-blue-500/10 hover:border-blue-500/30 group-hover:-translate-y-1 h-full bg-background/40">
            <CardContent className="p-5 flex flex-col justify-between h-full relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 bg-blue-500/10 rounded-2xl ring-4 ring-blue-500/5 group-hover:bg-blue-500/20 transition-all">
                  <Receipt className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex items-center gap-1 px-2 py-1 rounded-xl bg-blue-500/10 text-blue-700 dark:text-blue-400 text-[0.65rem] font-black uppercase tracking-widest">
                  Live Bill
                  {showBreakdown ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-black tracking-tighter text-blue-600 dark:text-blue-400">
                  ₹{data.currentMonthBill.toLocaleString('en-IN')}
                </p>
                <p className="text-[0.7rem] font-bold text-muted-foreground/80 uppercase tracking-wider">Current Cycle</p>
              </div>
            </CardContent>
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-500/5 to-transparent rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-150 duration-700" />
          </Card>
        </div>

        {/* Active Tenants / Beds */}
        <Link href="/dashboard/tenants" className="group">
          <Card className="relative overflow-hidden backdrop-blur-md border-border/40 rounded-3xl transition-all duration-500 hover:shadow-2xl hover:shadow-violet-500/10 hover:border-violet-500/30 group-hover:-translate-y-1 h-full bg-background/40">
            <CardContent className="p-5 flex flex-col justify-between h-full relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 bg-violet-500/10 rounded-2xl ring-4 ring-violet-500/5 group-hover:bg-violet-500/20 transition-all">
                  <Users className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                </div>
                <Badge variant="secondary" className="text-[0.65rem] font-black uppercase tracking-widest rounded-xl px-2.5 py-1 bg-violet-500/10 text-violet-700 dark:text-violet-400 border-none">
                  Beds
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-black tracking-tighter text-violet-600 dark:text-violet-400">
                  {data.activeTenants}
                  <span className="text-sm font-bold text-muted-foreground/50 ml-1">/ {data.totalBeds}</span>
                </p>
                <p className="text-[0.7rem] font-bold text-muted-foreground/80">
                  Billable vs Total Beds
                </p>
              </div>
            </CardContent>
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-violet-500/5 to-transparent rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-150 duration-700" />
          </Card>
        </Link>

        {/* Plan */}
        <Link href="/dashboard/subscription" className="group">
          <Card className="relative overflow-hidden backdrop-blur-md border-border/40 rounded-3xl transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10 hover:border-primary/30 group-hover:-translate-y-1 h-full bg-background/40">
            <CardContent className="p-5 flex flex-col justify-between h-full relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 bg-primary/10 rounded-2xl ring-4 ring-primary/5 group-hover:bg-primary/20 transition-all">
                  <Crown className="w-5 h-5 text-primary" />
                </div>
                <div className="p-1.5 bg-primary/5 rounded-full group-hover:bg-primary group-hover:text-white transition-all">
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xl font-black tracking-tight text-primary uppercase">{planLabels[data.planType]}</p>
                <p className="text-[0.7rem] font-bold text-muted-foreground/80">
                  ₹{perTenantFee}/tenant plan
                </p>
              </div>
            </CardContent>
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-primary/5 to-transparent rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-150 duration-700" />
          </Card>
        </Link>
      </div>

      {/* Animated Breakdown Details */}
      <AnimatePresence>
        {showBreakdown && data.currentCycleDetails && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card className="border-border/40 bg-muted/20 rounded-3xl p-5 mt-2 backdrop-blur-sm border-dashed">
              <h4 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground mb-4 flex items-center gap-2 px-1">
                <Info className="w-3 h-3" /> Detailed Bill Breakdown
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm font-medium p-3 bg-background/40 rounded-2xl">
                  <div className="flex flex-col">
                    <span className="font-bold">Base Platform Fee</span>
                    <span className="text-[0.65rem] text-muted-foreground">Standard monthly charge</span>
                  </div>
                  <span className="font-black text-foreground">₹{(data.currentCycleDetails.propertyCharge ?? 200).toLocaleString('en-IN')}</span>
                </div>
                
                <div className="flex items-center justify-between text-sm font-medium p-3 bg-background/40 rounded-2xl border-l-4 border-l-blue-500">
                  <div className="flex flex-col">
                    <span className="font-bold">Tenant Usage Charge</span>
                    <span className="text-[0.65rem] text-muted-foreground">
                      {data.currentCycleDetails.tenantCount ?? data.activeTenants} tenants × ₹{perTenantFee}
                    </span>
                  </div>
                  <span className="font-black text-blue-600 dark:text-blue-400">
                    ₹{((data.currentCycleDetails.tenantCount ?? data.activeTenants) * perTenantFee).toLocaleString('en-IN')}
                  </span>
                </div>

                {(data.currentCycleDetails.discountAmount ?? 0) > 0 && (
                  <div className="flex items-center justify-between text-sm font-medium p-3 bg-emerald-500/5 rounded-2xl border border-emerald-500/20 border-dashed">
                    <div className="flex flex-col">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">Discounts / Credits</span>
                      <span className="text-[0.65rem] text-emerald-600/70">Promotional offer applied</span>
                    </div>
                    <span className="font-black text-emerald-600 dark:text-emerald-400">
                      -₹{(data.currentCycleDetails.discountAmount ?? 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                )}

                <div className="pt-2 flex items-center justify-between px-1">
                  <span className="text-sm font-black text-foreground">Total Live Amount</span>
                  <span className="text-xl font-black text-primary">₹{data.currentMonthBill.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Low Balance Alert Component ─────────────────────────────────────────────

function LowBalanceAlert({ stage, daysLeft, balance }: { stage: LowBalanceStage; daysLeft: number; balance: number }) {
  const configs = {
    warning: {
      icon: AlertTriangle,
      bgClass: 'border-amber-500/20 bg-gradient-to-r from-amber-50 to-amber-50/50 dark:from-amber-500/10 dark:to-amber-500/5',
      iconBgClass: 'bg-amber-500/20',
      iconClass: 'text-amber-600 dark:text-amber-400',
      textClass: 'text-amber-800 dark:text-amber-300',
      subTextClass: 'text-amber-600/80 dark:text-amber-400/60',
      message: `Balance may run out in ${daysLeft} days`,
      sub: 'Recharge soon to avoid service interruption',
    },
    risk: {
      icon: TrendingDown,
      bgClass: 'border-red-500/20 bg-gradient-to-r from-red-50 to-red-50/50 dark:from-red-500/10 dark:to-red-500/5',
      iconBgClass: 'bg-red-500/20',
      iconClass: 'text-red-600 dark:text-red-400',
      textClass: 'text-red-800 dark:text-red-300',
      subTextClass: 'text-red-600/80 dark:text-red-400/60',
      message: `⚠️ Account at risk — Only ₹${balance} left`,
      sub: 'Your account may be restricted in 3 days',
    },
    restricted: {
      icon: AlertTriangle,
      bgClass: 'border-red-500/30 bg-gradient-to-r from-red-100 to-red-50 dark:from-red-500/20 dark:to-red-500/10',
      iconBgClass: 'bg-red-500/30',
      iconClass: 'text-red-700 dark:text-red-300',
      textClass: 'text-red-900 dark:text-red-200',
      subTextClass: 'text-red-700/80 dark:text-red-300/60',
      message: '🚫 Account Restricted — Recharge Required',
      sub: 'You cannot add tenants or export data until you recharge',
    },
  }

  const config = configs[stage as keyof typeof configs]
  if (!config) return null
  const Icon = config.icon

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`relative overflow-hidden rounded-3xl border p-4 backdrop-blur-md ${config.bgClass}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-2xl ${config.iconBgClass} ring-4 ring-white/10`}>
            <Icon className={`w-5 h-5 ${config.iconClass}`} />
          </div>
          <div>
            <p className={`text-sm font-black tracking-tight ${config.textClass}`}>{config.message}</p>
            <p className={`text-xs font-medium ${config.subTextClass}`}>{config.sub}</p>
          </div>
        </div>
        <Link href="/dashboard/subscription">
          <Button size="sm" variant={stage === 'restricted' ? 'default' : 'outline'} className={`rounded-2xl font-black text-xs px-4 h-9 ${
            stage === 'restricted' ? 'bg-red-600 hover:bg-red-700 text-white shadow-xl shadow-red-500/30 border-none' : 'border-current'
          }`}>
            Recharge
          </Button>
        </Link>
      </div>
    </motion.div>
  )
}

