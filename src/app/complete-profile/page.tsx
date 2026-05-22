
'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { 
    Loader2, 
    Building2, 
    MapPin, 
    Building, 
    Bed, 
    Users, 
    ChevronRight, 
    ChevronLeft, 
    CheckCircle2, 
    Sparkles,
    Info,
    Home,
    LayoutGrid,
    Check,
    Trophy,
    Rocket,
    Globe,
    Phone,
    UserCircle,
    HelpCircle,
    Zap,
    Layout,
    Plus,
    Minus,
    Camera
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAppDispatch, useAppSelector } from '@/lib/hooks'
import { finalizeUserRole, completeOnboarding, updateUserProfile } from '@/lib/slices/userSlice'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectValue, SelectTrigger } from '@/components/ui/select'
import { useCreatePropertyMutation } from '@/lib/api/apiSlice'
import { useConfetti } from '@/context/confetti-provider'
import { Progress } from "@/components/ui/progress"
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from "@/lib/utils"
import { StepIndicator } from './components/StepIndicator'
import { BuildingPreview } from './components/BuildingPreview'
import { NavigationFooter } from './components/NavigationFooter'
import { WhatsAppSupport } from './components/WhatsAppSupport'

const stepVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
  transition: { duration: 0.3 }
}


const pgSchema = z.object({
  // Owner Profile
  ownerName: z.string().min(2, "Name is required."),
  ownerPhone: z.string().length(10, "Valid 10-digit phone number is required."),
  
  // Property Basics
  name: z.string().min(3, "Property name must be at least 3 characters."),
  location: z.string().min(3, "Location is required."),
  city: z.string().min(2, "City is required."),
  gender: z.enum(['male', 'female', 'co-ed']),
  autoSetup: z.boolean().default(true),
  floorCount: z.coerce.number().min(1).max(10).default(1),
  roomsPerFloor: z.coerce.number().min(1).max(20).default(3),
  bedsPerRoom: z.coerce.number().min(1).max(10).default(3),
  amenities: z.array(z.string()).default([]),
  images: z.array(z.string()).default([]),
  upiId: z.string().min(3, "UPI ID is required for digital payments").optional().or(z.literal('')),
  payeeName: z.string().min(2, "Payee name is required").optional().or(z.literal('')),
  direct_upi_enabled: z.boolean().default(true),
})

type PgFormValues = z.infer<typeof pgSchema>

type OnboardingStep = 'ROLE_SELECTION' | 'OWNER_DETAILS' | 'PG_DETAILS' | 'ROOMS_CONFIG' | 'PAYMENT_SETUP' | 'FINAL_CHECK'

export default function CompleteProfilePage() {
    const router = useRouter()
    const dispatch = useAppDispatch()
    const { toast } = useToast()
    const { showConfetti } = useConfetti();
    const { currentUser } = useAppSelector(state => state.user)
    const [createProperty, { isLoading: isCreating }] = useCreatePropertyMutation();
    const [uploadingImage, setUploadingImage] = useState(false);
    
    const [loadingRole, setLoadingRole] = useState<'owner' | null>(null)
    const [activeStep, setActiveStep] = useState<OnboardingStep>(
        currentUser?.role === 'unassigned' ? 'ROLE_SELECTION' : 'OWNER_DETAILS'
    )

    const form = useForm<PgFormValues>({
        resolver: zodResolver(pgSchema),
        defaultValues: {
            ownerName: currentUser?.name || '',
            ownerPhone: currentUser?.phone || '',
            name: '',
            location: '',
            city: '',
            gender: 'co-ed',
            autoSetup: true,
            floorCount: 1,
            roomsPerFloor: 3,
            bedsPerRoom: 3,
            amenities: [],
            images: [],
            upiId: '',
            payeeName: currentUser?.name || '',
            direct_upi_enabled: true,
        },
    })

    const currentValues = form.watch();

    // Sync state once user is loaded
    useEffect(() => {
        if (currentUser) {
            if (currentUser.role === 'unassigned' && activeStep === 'OWNER_DETAILS') {
                setActiveStep('ROLE_SELECTION');
            }
            form.reset({
                ...form.getValues(),
                ownerName: form.getValues().ownerName || currentUser.name || '',
                ownerPhone: form.getValues().ownerPhone || currentUser.phone || '',
            });
        }
    }, [currentUser]);

    const progressValue = useMemo(() => {
        switch(activeStep) {
            case 'ROLE_SELECTION': return 10;
            case 'OWNER_DETAILS': return 30;
            case 'PG_DETAILS': return 50;
            case 'ROOMS_CONFIG': return 70;
            case 'PAYMENT_SETUP': return 85;
            case 'FINAL_CHECK': return 100;
            default: return 0;
        }
    }, [activeStep]);

    const handleOwnerSetup = async () => {
        if (!currentUser) {
            toast({ variant: 'destructive', title: 'Error', description: 'User session not found. Please log in again.'})
            router.push('/login');
            return;
        }

        setLoadingRole('owner')
        try {
            await dispatch(finalizeUserRole('owner')).unwrap();
            setActiveStep('OWNER_DETAILS')
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Setup Failed', description: error.message || 'Could not set up your account.' });
        } finally {
            setLoadingRole(null);
        }
    }

    const validateProfile = async () => {
        const result = await form.trigger(['ownerName', 'ownerPhone']);
        if (result) {
            try {
                await dispatch(updateUserProfile({ 
                    name: currentValues.ownerName, 
                    phone: currentValues.ownerPhone 
                })).unwrap();
                if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
                setActiveStep('PG_DETAILS');
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Profile Update Failed', description: error.message });
            }
        }
    }

    const validateBasics = async () => {
        const result = await form.trigger(['name', 'city', 'location', 'gender']);
        if (result) {
            if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
            setActiveStep('ROOMS_CONFIG');
        }
    }

    const applyPreset = (floors: number, rooms: number, beds: number) => {
        form.setValue('floorCount', floors);
        form.setValue('roomsPerFloor', rooms);
        form.setValue('bedsPerRoom', beds);
        toast({ title: 'Added!', description: `${floors} floors configured.` });
    }

    const validateLayout = async () => {
        const result = await form.trigger(['floorCount', 'roomsPerFloor', 'bedsPerRoom']);
        if (result) {
            if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
            setActiveStep('PAYMENT_SETUP');
        }
    }

    const validateUPI = async () => {
        const result = await form.trigger(['upiId', 'payeeName']);
        if (result) {
            if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
            setActiveStep('FINAL_CHECK');
        }
    }

    const onPropertySubmit = async (data: PgFormValues) => {
        if (!currentUser) return;

        try {
            const result = await createProperty({
                ownerId: currentUser.id,
                name: data.name,
                location: data.location,
                city: data.city,
                gender: data.gender === 'co-ed' ? 'co-ed' : data.gender as any,
                autoSetup: data.autoSetup,
                floorCount: data.floorCount,
                roomsPerFloor: data.roomsPerFloor,
                bedsPerRoom: data.bedsPerRoom,
                amenities: data.amenities,
                images: data.images,
                upiId: data.upiId?.trim() || '',
                payeeName: data.payeeName?.trim() || '',
                direct_upi_enabled: !!data.upiId?.trim(),
                paymentMode: data.upiId?.trim() ? 'DIRECT_UPI' : 'CASH_ONLY'
            }).unwrap();

            if (result.success) {
                showConfetti({ particleCount: 400, spread: 120, duration: 8000 });
                await dispatch(completeOnboarding()).unwrap();
                // Increase delay to allow state propagation before redirect (prevents race conditions in E2E)
                await new Promise(resolve => setTimeout(resolve, 800));
                router.push('/dashboard');
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to create property' });
        }
    }



    
    return (
        <div className="min-h-screen bg-background selection:bg-primary/10 flex flex-col pb-safe overscroll-none">
            <div className="sticky top-0 left-0 right-0 z-50 bg-background/60 backdrop-blur-2xl border-b border-primary/5">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20 rotate-3">
                            <Rocket className="w-6 h-6 text-primary-foreground -rotate-3" />
                        </div>
                        <div>
                            <span className="font-bold text-xl tracking-tighter block leading-none">RentSutra</span>
                            <span className="text-base font-semibold text-primary leading-none mt-1 hidden sm:block">Simple PG App</span>
                        </div>
                    </div>
                    
                    {activeStep !== 'ROLE_SELECTION' && (
                        <div className="hidden md:flex items-center gap-6">
                            <StepIndicator active={activeStep === 'OWNER_DETAILS'} completed={['PG_DETAILS', 'ROOMS_CONFIG', 'PAYMENT_SETUP', 'FINAL_CHECK'].includes(activeStep)} label="Me" index={1} />
                            <div className="w-4 h-[2px] bg-muted/20" />
                            <StepIndicator active={activeStep === 'PG_DETAILS'} completed={['ROOMS_CONFIG', 'PAYMENT_SETUP', 'FINAL_CHECK'].includes(activeStep)} label="PG" index={2} />
                            <div className="w-4 h-[2px] bg-muted/20" />
                            <StepIndicator active={activeStep === 'ROOMS_CONFIG'} completed={['PAYMENT_SETUP', 'FINAL_CHECK'].includes(activeStep)} label="Rooms" index={3} />
                            <div className="w-4 h-[2px] bg-muted/20" />
                            <StepIndicator active={activeStep === 'PAYMENT_SETUP'} completed={activeStep === 'FINAL_CHECK'} label="Rent" index={4} />
                            <div className="w-4 h-[2px] bg-muted/20" />
                            <StepIndicator active={activeStep === 'FINAL_CHECK'} completed={false} label="Finish" index={5} />
                        </div>
                    )}

                    <div className="flex items-center gap-3">
                        <WhatsAppSupport />
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden md:hidden">
                            <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progressValue}%` }} />
                        </div>
                    </div>
                </div>
            </div>

            <main className="flex-1 max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-12 w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16">
                {/* Desktop Sidebar */}
                <div className="hidden lg:flex lg:col-span-3 flex-col gap-10 sticky top-24 h-fit pr-10 border-r border-primary/5">
                    <div className="space-y-10">
                        <StepIndicator index={1} label="About You" active={activeStep === 'OWNER_DETAILS'} completed={['PG_DETAILS', 'ROOMS_CONFIG', 'PAYMENT_SETUP', 'FINAL_CHECK'].includes(activeStep)} />
                        <StepIndicator index={2} label="PG Name & City" active={activeStep === 'PG_DETAILS'} completed={['ROOMS_CONFIG', 'PAYMENT_SETUP', 'FINAL_CHECK'].includes(activeStep)} />
                        <StepIndicator index={3} label="Rooms & Floors" active={activeStep === 'ROOMS_CONFIG'} completed={['PAYMENT_SETUP', 'FINAL_CHECK'].includes(activeStep)} />
                        <StepIndicator index={4} label="Collect Rent" active={activeStep === 'PAYMENT_SETUP'} completed={['FINAL_CHECK'].includes(activeStep)} />
                        <StepIndicator index={5} label="Finish Setup" active={activeStep === 'FINAL_CHECK'} completed={false} />
                    </div>

                    <div className="mt-auto pt-10 space-y-8">
                        <div className="p-6 rounded-[2.5rem] bg-primary/5 border border-primary/10 space-y-4">
                            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                                <HelpCircle className="w-5 h-5 text-primary" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-bold tracking-tight">Need Help?</p>
                                <p className="text-sm text-muted-foreground font-medium leading-relaxed">Call support anytime.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-9">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onPropertySubmit)} className="w-full">
                            <AnimatePresence mode="wait">

                            {/* STEP 0: ROLE SELECTION */}
                            {activeStep === 'ROLE_SELECTION' && (
                                <motion.div
                                    key="role-selection"
                                    variants={stepVariants}
                                    initial="initial"
                                    animate="animate"
                                    exit="exit"
                                    className="w-full max-w-lg mx-auto px-4 text-center space-y-6 relative z-10"
                                >
                                    <div className="space-y-4">
                                        <motion.div 
                                            initial={{ scale: 0.5, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary-container/20 to-transparent flex items-center justify-center border border-primary/10 shadow-[0_0_30px_rgba(255,179,180,0.15)] mx-auto rotate-12"
                                        >
                                            <Sparkles className="w-7 h-7 text-primary rotate-[-12deg]" />
                                        </motion.div>
                                        <div className="space-y-2">
                                            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">Namaste</h2>
                                            <p className="text-muted-foreground text-sm font-semibold leading-relaxed">
                                                Select how you want to use RentSutra
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-4 max-w-lg mx-auto w-full text-left">
                                        {/* PG Owner Card */}
                                        <button 
                                            type="button"
                                            onClick={handleOwnerSetup}
                                            disabled={loadingRole === 'owner'}
                                            className={cn(
                                                "w-full text-left bg-gradient-to-br from-secondary/10 to-surface-container/30 backdrop-blur-[24px] border rounded-[24px] p-6 relative overflow-hidden group hover:opacity-95 active:scale-[0.98] transition-all duration-300 flex items-center justify-between shadow-xl",
                                                loadingRole === 'owner' ? "border-primary ring-1 ring-primary/20 shadow-[0_0_30px_rgba(255,179,180,0.25)]" : "border-primary/10 shadow-[0_0_30px_rgba(255,179,180,0.05)] hover:border-primary/30"
                                            )}
                                        >
                                            {/* Subtle Glow Overlay */}
                                            <div className="absolute inset-0 bg-gradient-to-br from-secondary/20 to-transparent pointer-events-none opacity-50" />
                                            <div className="flex items-center gap-4 relative z-10">
                                                <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-[0_0_20px_rgba(255,179,180,0.3)] shrink-0 transition-transform duration-300 group-hover:scale-105">
                                                    {loadingRole === 'owner' ? (
                                                        <Loader2 className="w-6 h-6 text-primary-foreground animate-spin" />
                                                    ) : (
                                                        <Building2 className="w-6 h-6 text-primary-foreground" />
                                                    )}
                                                </div>
                                                <div className="flex flex-col">
                                                    <h3 className="text-base font-bold text-primary group-hover:text-primary/95 transition-colors">PG Owner</h3>
                                                    <p className="text-xs text-muted-foreground mt-0.5 font-medium">Manage your PG easily.</p>
                                                </div>
                                            </div>
                                            <div className="relative z-10 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/10">
                                                <ChevronRight className="w-4 h-4 text-primary" />
                                            </div>
                                        </button>

                                        {/* Guest Card (Soon) */}
                                        <div className="w-full text-left bg-surface-container-low/30 backdrop-blur-[10px] border border-dashed border-primary/10 rounded-[24px] p-6 relative overflow-hidden opacity-60 flex items-center justify-between">
                                            <div className="flex items-center gap-4 relative z-10">
                                                <div className="w-12 h-12 rounded-2xl bg-surface-container/50 flex items-center justify-center shrink-0 border border-white/5">
                                                    <Users className="w-6 h-6 text-muted-foreground" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <h3 className="text-base font-bold text-foreground">I am Guest</h3>
                                                    <p className="text-xs text-muted-foreground mt-0.5 font-medium">Pay rent and see bills.</p>
                                                </div>
                                            </div>
                                            <div className="relative z-10 bg-secondary/20 text-primary border border-primary/20 px-3 py-1 rounded-full flex items-center justify-center">
                                                <span className="text-[10px] font-black uppercase tracking-wider">Soon</span>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* STEP 1: OWNER DETAILS (previously STEP 2) */}
                            {activeStep === 'OWNER_DETAILS' && (
                                <motion.div 
                                    key="owner"
                                    variants={stepVariants}
                                    initial="initial"
                                    animate="animate"
                                    exit="exit"
                                    className="w-full max-w-lg mx-auto pb-24 px-4 space-y-6"
                                >
                                    <div className="space-y-2 text-center">
                                        <h2 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">About You</h2>
                                        <p className="text-muted-foreground text-sm font-semibold leading-relaxed">
                                            Let's start with your profile details
                                        </p>
                                    </div>

                                    <div className="bg-gradient-to-br from-secondary/15 to-[#201f1f]/40 backdrop-blur-[24px] border border-primary/10 rounded-[24px] p-6 md:p-8 space-y-6 shadow-2xl relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
                                        
                                        <FormField
                                            control={form.control}
                                            name="ownerName"
                                            render={({ field }) => (
                                                <FormItem className="space-y-2 text-left">
                                                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                                        <UserCircle className="w-4 h-4 text-primary" /> Full Name
                                                    </FormLabel>
                                                    <FormControl>
                                                        <div className="relative">
                                                            <Input 
                                                                placeholder="e.g. Rahul Kumar" 
                                                                autoCapitalize="words"
                                                                className="h-12 px-4 text-base font-semibold bg-black/40 border border-primary/10 hover:border-primary/20 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 rounded-[14px] transition-all placeholder:text-muted-foreground/30 text-foreground" 
                                                                {...field} 
                                                            />
                                                        </div>
                                                    </FormControl>
                                                    <FormMessage className="text-xs font-semibold text-destructive/80 mt-1" />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="ownerPhone"
                                            render={({ field }) => (
                                                <FormItem className="space-y-2 text-left">
                                                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                                        <Phone className="w-4 h-4 text-primary" /> WhatsApp No.
                                                    </FormLabel>
                                                    <FormControl>
                                                        <div className="relative flex items-center">
                                                            <div className="absolute left-4 text-base font-black text-muted-foreground">+91</div>
                                                            <Input 
                                                                placeholder="98765 43210" 
                                                                type="tel"
                                                                inputMode="numeric"
                                                                className="h-12 pl-14 pr-4 text-base font-semibold bg-black/40 border border-primary/10 hover:border-primary/20 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 rounded-[14px] transition-all placeholder:text-muted-foreground/30 text-foreground tracking-widest" 
                                                                maxLength={10}
                                                                {...field}
                                                                onChange={(e) => {
                                                                    const val = e.target.value.replace(/\D/g, '');
                                                                    field.onChange(val);
                                                                }}
                                                            />
                                                        </div>
                                                    </FormControl>
                                                    <FormMessage className="text-xs font-semibold text-destructive/80 mt-1" />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </motion.div>
                            )}

                            {/* STEP 3: PG DETAILS */}
                            {activeStep === 'PG_DETAILS' && (
                                <motion.div 
                                    key="pg"
                                    variants={stepVariants}
                                    initial="initial"
                                    animate="animate"
                                    exit="exit"
                                    className="w-full max-w-2xl mx-auto pb-24 px-4 space-y-6"
                                >
                                    <div className="space-y-2 text-center">
                                        <h2 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">PG Details</h2>
                                        <p className="text-muted-foreground text-sm font-semibold leading-relaxed">
                                            Tell us about your property and facilities
                                        </p>
                                    </div>

                                    <div className="bg-gradient-to-br from-secondary/15 to-[#201f1f]/40 backdrop-blur-[24px] border border-primary/10 rounded-[24px] p-6 md:p-8 space-y-6 shadow-2xl relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

                                        <FormField
                                            control={form.control}
                                            name="name"
                                            render={({ field }) => (
                                                <FormItem className="space-y-2 text-left">
                                                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                                        <Building className="w-4 h-4 text-primary" /> PG Name
                                                    </FormLabel>
                                                    <FormControl>
                                                        <div className="relative">
                                                            <Input 
                                                                placeholder="e.g. Sai PG" 
                                                                autoCapitalize="words" 
                                                                className="h-12 px-4 text-base font-semibold bg-black/40 border border-primary/10 hover:border-primary/20 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 rounded-[14px] transition-all placeholder:text-muted-foreground/30 text-foreground" 
                                                                {...field} 
                                                            />
                                                        </div>
                                                    </FormControl>
                                                    <FormMessage className="text-xs font-semibold text-destructive/80 mt-1" />
                                                </FormItem>
                                            )}
                                        />

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <FormField
                                                control={form.control}
                                                name="city"
                                                render={({ field }) => (
                                                    <FormItem className="space-y-2 text-left">
                                                        <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                                            <Globe className="w-4 h-4 text-primary" /> City
                                                        </FormLabel>
                                                        <FormControl>
                                                            <div className="relative">
                                                                <Input 
                                                                    placeholder="e.g. Pune" 
                                                                    autoCapitalize="words" 
                                                                    className="h-12 px-4 text-base font-semibold bg-black/40 border border-primary/10 hover:border-primary/20 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 rounded-[14px] transition-all placeholder:text-muted-foreground/30 text-foreground" 
                                                                    {...field} 
                                                                />
                                                            </div>
                                                        </FormControl>
                                                        <FormMessage className="text-xs font-semibold text-destructive/80 mt-1" />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="gender"
                                                render={({ field }) => (
                                                    <FormItem className="space-y-2 text-left">
                                                        <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                                            <Users className="w-4 h-4 text-primary" /> Who stays here?
                                                        </FormLabel>
                                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                            <FormControl>
                                                                <SelectTrigger className="h-12 font-semibold bg-black/40 border border-primary/10 hover:border-primary/20 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 rounded-[14px] px-4 text-foreground text-sm">
                                                                    <SelectValue placeholder="Select type" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent className="rounded-lg border border-primary/10 bg-[#1c1b1b] text-foreground">
                                                                <SelectItem value="co-ed" className="font-semibold py-2 text-sm focus:bg-primary/10 focus:text-primary">Boys & Girls</SelectItem>
                                                                <SelectItem value="male" className="font-semibold py-2 text-sm focus:bg-primary/10 focus:text-primary">Boys Only</SelectItem>
                                                                <SelectItem value="female" className="font-semibold py-2 text-sm focus:bg-primary/10 focus:text-primary">Girls Only</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage className="text-xs font-semibold text-destructive/80 mt-1" />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>

                                        <FormField
                                            control={form.control}
                                            name="location"
                                            render={({ field }) => (
                                                <FormItem className="space-y-2 text-left">
                                                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                                        <MapPin className="w-4 h-4 text-primary" /> Full Address
                                                    </FormLabel>
                                                    <FormControl>
                                                        <div className="relative">
                                                            <Input 
                                                                placeholder="e.g. Viman Nagar, near Phoenix Mall" 
                                                                autoCapitalize="words" 
                                                                className="h-12 px-4 text-base font-semibold bg-black/40 border border-primary/10 hover:border-primary/20 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 rounded-[14px] transition-all placeholder:text-muted-foreground/30 text-foreground" 
                                                                {...field} 
                                                            />
                                                        </div>
                                                    </FormControl>
                                                    <FormMessage className="text-xs font-semibold text-destructive/80 mt-1" />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="amenities"
                                            render={({ field }) => (
                                                <FormItem className="space-y-3 text-left">
                                                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                                        <Sparkles className="w-4 h-4 text-primary" /> Facilities (What do you provide?)
                                                    </FormLabel>
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                                        {[
                                                            { id: 'wifi', icon: Globe, label: 'WiFi' },
                                                            { id: 'ac', icon: Zap, label: 'AC' },
                                                            { id: 'food', icon: Users, label: 'Food' },
                                                            { id: 'laundry', icon: Sparkles, label: 'Washing' },
                                                            { id: 'parking', icon: Building, label: 'Parking' },
                                                            { id: 'power-backup', icon: Zap, label: 'Lift' },
                                                        ].map((item) => (
                                                            <motion.div 
                                                                key={item.id}
                                                                role="button"
                                                                tabIndex={0}
                                                                whileTap={{ scale: 0.95 }}
                                                                onClick={() => {
                                                                    const current = field.value || [];
                                                                    if (current.includes(item.id)) {
                                                                        field.onChange(current.filter(i => i !== item.id));
                                                                    } else {
                                                                        field.onChange([...current, item.id]);
                                                                    }
                                                                }}
                                                                className={cn(
                                                                    "flex items-center gap-2 px-3 py-3 rounded-[14px] border transition-all cursor-pointer select-none",
                                                                    field.value?.includes(item.id) 
                                                                        ? "bg-primary/20 border-primary text-primary shadow-[0_0_20px_rgba(230,30,67,0.15)] font-bold" 
                                                                        : "bg-black/40 border-primary/5 hover:border-primary/20 text-muted-foreground font-semibold"
                                                                )}
                                                            >
                                                                <item.icon className="w-4 h-4 shrink-0" />
                                                                <span className="text-[11px] uppercase tracking-wider">{item.label}</span>
                                                            </motion.div>
                                                        ))}
                                                    </div>
                                                    <FormMessage className="text-xs font-semibold text-destructive/80 mt-1" />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="images"
                                            render={({ field }) => (
                                                <FormItem className="space-y-3 mt-4 text-left">
                                                    <div className="flex items-center justify-between">
                                                        <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                                            <Camera className="w-4 h-4 text-primary" /> Building Photo (Optional)
                                                        </FormLabel>
                                                        {field.value.length > 0 ? (
                                                            <Button 
                                                                type="button" 
                                                                variant="ghost" 
                                                                size="sm" 
                                                                onClick={() => field.onChange([])}
                                                                className="text-xs font-bold uppercase text-destructive/80 hover:bg-destructive/5"
                                                            >
                                                                Remove
                                                            </Button>
                                                        ) : (
                                                            <div className="text-[10px] font-bold uppercase tracking-wider bg-secondary-container/30 px-2.5 py-0.5 rounded-full text-muted-foreground">Optional</div>
                                                        )}
                                                    </div>
                                                    <div 
                                                        className={cn(
                                                            "relative h-48 rounded-[20px] border-2 border-dashed transition-all flex flex-col items-center justify-center overflow-hidden",
                                                            field.value.length > 0 
                                                                ? "border-primary/30 bg-primary/5 shadow-inner" 
                                                                : "border-primary/10 bg-black/40 hover:bg-[#201f1f]/40 hover:border-primary/20 group cursor-pointer"
                                                        )}
                                                    >
                                                        {field.value.length > 0 ? (
                                                            <>
                                                                <img src={field.value[0]} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-80" />
                                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                                                                <div className="relative z-10 flex flex-col items-center gap-2 bg-black/90 backdrop-blur-md px-6 py-3 rounded-2xl border border-primary/25 shadow-2xl">
                                                                    <CheckCircle2 className="w-5 h-5 text-primary" />
                                                                    <span className="text-xs font-black uppercase tracking-widest text-primary">Image Loaded</span>
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <div className="flex flex-col items-center gap-4 text-muted-foreground">
                                                                <div className="w-14 h-14 rounded-2xl bg-secondary-container/20 flex items-center justify-center border border-primary/10 shadow-lg group-hover:scale-105 transition-all duration-300">
                                                                    {uploadingImage ? <Loader2 className="w-7 h-7 animate-spin text-primary" /> : <Camera className="w-7 h-7 text-primary" />}
                                                                </div>
                                                                <div className="text-center px-4">
                                                                    <p className="text-sm font-bold text-foreground">Add Front Photo</p>
                                                                    <p className="text-xs font-medium text-muted-foreground mt-0.5">Guests love visual profiles.</p>
                                                                </div>
                                                                <Input 
                                                                    type="file" 
                                                                    accept="image/jpeg, image/png, image/webp, image/heic" 
                                                                    className="absolute inset-0 opacity-0 cursor-pointer" 
                                                                    onChange={async (e) => {
                                                                        const file = e.target.files?.[0];
                                                                        if (file) {
                                                                            setUploadingImage(true);
                                                                            const reader = new FileReader();
                                                                            reader.onloadend = () => {
                                                                                field.onChange([reader.result as string]);
                                                                                setUploadingImage(false);
                                                                            };
                                                                            reader.readAsDataURL(file);
                                                                        }
                                                                    }}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <FormMessage className="text-xs font-semibold text-destructive/80 mt-1" />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </motion.div>
                            )}

                            {/* STEP 4: SMART LAYOUT */}
                            {activeStep === 'ROOMS_CONFIG' && (
                                <motion.div 
                                    key="layout"
                                    variants={stepVariants}
                                    initial="initial"
                                    animate="animate"
                                    exit="exit"
                                    className="w-full pb-24 px-4"
                                >
                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start max-w-6xl mx-auto">
                                        <div className="lg:col-span-5 space-y-6">
                                            <div className="space-y-2 text-center lg:text-left">
                                                <h2 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">Floors & Rooms</h2>
                                                <p className="text-muted-foreground text-sm font-semibold">
                                                    Configure the building's floor and room capacity
                                                </p>
                                            </div>

                                            <div className="bg-gradient-to-br from-secondary/15 to-[#201f1f]/40 backdrop-blur-[24px] border border-primary/10 rounded-[24px] p-6 space-y-6 shadow-2xl relative overflow-hidden">
                                                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
                                                
                                                <div className="space-y-3">
                                                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Quick Presets</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        <Button 
                                                            type="button" 
                                                            variant="outline" 
                                                            size="sm" 
                                                            onClick={() => applyPreset(1, 5, 3)} 
                                                            className="h-10 rounded-[12px] bg-black/40 border border-primary/10 hover:border-primary/30 text-foreground font-semibold text-xs gap-2 px-4 transition-all duration-300"
                                                        >
                                                            <Building className="w-4 h-4 text-primary" /> Small PG
                                                        </Button>
                                                        <Button 
                                                            type="button" 
                                                            variant="outline" 
                                                            size="sm" 
                                                            onClick={() => applyPreset(3, 6, 3)} 
                                                            className="h-10 rounded-[12px] bg-black/40 border border-primary/10 hover:border-primary/30 text-foreground font-semibold text-xs gap-2 px-4 transition-all duration-300"
                                                        >
                                                            <Layout className="w-4 h-4 text-primary" /> Medium PG
                                                        </Button>
                                                        <Button 
                                                            type="button" 
                                                            variant="outline" 
                                                            size="sm" 
                                                            onClick={() => applyPreset(5, 10, 3)} 
                                                            className="h-10 rounded-[12px] bg-black/40 border border-primary/10 hover:border-primary/30 text-foreground font-semibold text-xs gap-2 px-4 transition-all duration-300"
                                                        >
                                                            <Home className="w-4 h-4 text-primary" /> Large PG
                                                        </Button>
                                                    </div>
                                                </div>

                                                <div className="space-y-4">
                                                    <FormField
                                                        control={form.control}
                                                        name="floorCount"
                                                        render={({ field }) => (
                                                            <FormItem className="flex items-center justify-between gap-4 p-4 bg-black/40 rounded-[16px] border border-primary/5 hover:border-primary/10 transition-all duration-300">
                                                                <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground m-0 flex items-center gap-2">
                                                                    <Building2 className="w-4 h-4 text-primary" /> Floors
                                                                </FormLabel>
                                                                <FormControl>
                                                                    <div className="flex items-center gap-3">
                                                                        <Button 
                                                                            type="button" 
                                                                            variant="outline" 
                                                                            size="icon" 
                                                                            className="h-9 w-9 rounded-[10px] shrink-0 border-primary/10 hover:border-primary/30 hover:bg-primary/5 hover:text-primary transition-all duration-200 shadow-sm" 
                                                                            onClick={() => field.onChange(Math.max(1, field.value - 1))}
                                                                        >
                                                                            <Minus className="w-4 h-4" />
                                                                        </Button>
                                                                        <div className="w-10 text-center text-xl font-black text-primary">{field.value}</div>
                                                                        <Button 
                                                                            type="button" 
                                                                            variant="outline" 
                                                                            size="icon" 
                                                                            className="h-9 w-9 rounded-[10px] shrink-0 border-primary/10 hover:border-primary/30 hover:bg-primary/5 hover:text-primary transition-all duration-200 shadow-sm" 
                                                                            onClick={() => field.onChange(Math.min(10, field.value + 1))}
                                                                        >
                                                                            <Plus className="w-4 h-4" />
                                                                        </Button>
                                                                    </div>
                                                                </FormControl>
                                                            </FormItem>
                                                        )}
                                                    />

                                                    <FormField
                                                        control={form.control}
                                                        name="roomsPerFloor"
                                                        render={({ field }) => (
                                                            <FormItem className="flex items-center justify-between gap-4 p-4 bg-black/40 rounded-[16px] border border-primary/5 hover:border-primary/10 transition-all duration-300">
                                                                <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground m-0 flex items-center gap-2">
                                                                    <Layout className="w-4 h-4 text-primary" /> Rooms / Floor
                                                                </FormLabel>
                                                                <FormControl>
                                                                    <div className="flex items-center gap-3">
                                                                        <Button 
                                                                            type="button" 
                                                                            variant="outline" 
                                                                            size="icon" 
                                                                            className="h-9 w-9 rounded-[10px] shrink-0 border-primary/10 hover:border-primary/30 hover:bg-primary/5 hover:text-primary transition-all duration-200 shadow-sm" 
                                                                            onClick={() => field.onChange(Math.max(1, field.value - 1))}
                                                                        >
                                                                            <Minus className="w-4 h-4" />
                                                                        </Button>
                                                                        <div className="w-10 text-center text-xl font-black text-primary">{field.value}</div>
                                                                        <Button 
                                                                            type="button" 
                                                                            variant="outline" 
                                                                            size="icon" 
                                                                            className="h-9 w-9 rounded-[10px] shrink-0 border-primary/10 hover:border-primary/30 hover:bg-primary/5 hover:text-primary transition-all duration-200 shadow-sm" 
                                                                            onClick={() => field.onChange(Math.min(20, field.value + 1))}
                                                                        >
                                                                            <Plus className="w-4 h-4" />
                                                                        </Button>
                                                                    </div>
                                                                </FormControl>
                                                            </FormItem>
                                                        )}
                                                    />

                                                    <FormField
                                                        control={form.control}
                                                        name="bedsPerRoom"
                                                        render={({ field }) => (
                                                            <FormItem className="flex items-center justify-between gap-4 p-4 bg-black/40 rounded-[16px] border border-primary/5 hover:border-primary/10 transition-all duration-300">
                                                                <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground m-0 flex items-center gap-2">
                                                                    <Users className="w-4 h-4 text-primary" /> Beds / Room
                                                                </FormLabel>
                                                                <FormControl>
                                                                    <div className="flex items-center gap-3">
                                                                        <Button 
                                                                            type="button" 
                                                                            variant="outline" 
                                                                            size="icon" 
                                                                            className="h-9 w-9 rounded-[10px] shrink-0 border-primary/10 hover:border-primary/30 hover:bg-primary/5 hover:text-primary transition-all duration-200 shadow-sm" 
                                                                            onClick={() => field.onChange(Math.max(1, field.value - 1))}
                                                                        >
                                                                            <Minus className="w-4 h-4" />
                                                                        </Button>
                                                                        <div className="w-10 text-center text-xl font-black text-primary">{field.value}</div>
                                                                        <Button 
                                                                            type="button" 
                                                                            variant="outline" 
                                                                            size="icon" 
                                                                            className="h-9 w-9 rounded-[10px] shrink-0 border-primary/10 hover:border-primary/30 hover:bg-primary/5 hover:text-primary transition-all duration-200 shadow-sm" 
                                                                            onClick={() => field.onChange(Math.min(10, field.value + 1))}
                                                                        >
                                                                            <Plus className="w-4 h-4" />
                                                                        </Button>
                                                                    </div>
                                                                </FormControl>
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="lg:col-span-7">
                                            <div className="sticky top-24 space-y-6">
                                                <motion.div 
                                                    initial={{ opacity: 0, scale: 0.95 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    transition={{ duration: 0.5 }}
                                                >
                                                    <BuildingPreview 
                                                        floorCount={currentValues.floorCount}
                                                        roomsPerFloor={currentValues.roomsPerFloor}
                                                        bedsPerRoom={currentValues.bedsPerRoom}
                                                    />
                                                </motion.div>
                                                
                                                <div className="p-6 rounded-[24px] bg-gradient-to-br from-secondary/15 to-[#201f1f]/40 backdrop-blur-[24px] border border-primary/10 flex gap-4 md:gap-6 shadow-2xl relative overflow-hidden">
                                                    <div className="w-12 h-12 rounded-[16px] bg-primary/20 flex items-center justify-center shrink-0 border border-primary/15 shadow-[0_0_20px_rgba(230,30,67,0.15)]">
                                                        <Sparkles className="w-6 h-6 text-primary animate-pulse" />
                                                    </div>
                                                    <div className="space-y-1.5 text-left">
                                                        <h4 className="text-base font-bold text-foreground">Auto-Generation Setup</h4>
                                                        <p className="text-xs text-muted-foreground leading-relaxed font-semibold">
                                                            RentSutra will automatically pre-generate all {currentValues.floorCount * currentValues.roomsPerFloor} room structures and their respective beds for your PG. You can custom-configure individual rooms later in your dashboard.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                            
                            {/* STEP 4: UPI SETUP */}
                            {activeStep === 'PAYMENT_SETUP' && (
                                <motion.div key="upi" {...stepVariants} className="w-full max-w-4xl mx-auto pb-24 px-4">
                                    <div className="text-center md:text-left space-y-2 mb-6">
                                        <h2 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">Rent Collection</h2>
                                        <p className="text-muted-foreground text-sm font-semibold">
                                            Choose how your guests will pay their monthly rent
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mb-8">
                                        <button 
                                            type="button"
                                            onClick={() => {
                                                form.setValue('direct_upi_enabled', true, { shouldValidate: true, shouldDirty: true });
                                            }}
                                            className={cn(
                                                "relative group cursor-pointer border transition-all duration-300 rounded-[24px] p-4 text-center flex flex-col items-center justify-center h-32 overflow-hidden bg-gradient-to-br backdrop-blur-[24px] select-none",
                                                currentValues.direct_upi_enabled 
                                                    ? "from-primary/20 to-secondary/10 border-primary shadow-[0_0_25px_rgba(230,30,67,0.2)]" 
                                                    : "from-black/40 to-[#201f1f]/40 border-primary/5 hover:border-primary/20 text-muted-foreground"
                                            )}
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 to-transparent pointer-events-none opacity-50" />
                                            <div className={cn(
                                                "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-lg transition-transform duration-300 group-hover:scale-105",
                                                currentValues.direct_upi_enabled ? "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(230,30,67,0.3)]" : "bg-black/40 border border-white/5 text-muted-foreground"
                                            )}>
                                                <Zap className="w-5 h-5" />
                                            </div>
                                            <div className="mt-3">
                                                <h3 className="text-sm font-bold text-foreground">Online (UPI)</h3>
                                                <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">Direct to bank</p>
                                            </div>
                                        </button>

                                        <button 
                                            type="button"
                                            onClick={() => {
                                                form.setValue('direct_upi_enabled', false, { shouldValidate: true, shouldDirty: true });
                                                form.setValue('upiId', '');
                                                form.setValue('payeeName', '');
                                            }}
                                            className={cn(
                                                "relative group cursor-pointer border transition-all duration-300 rounded-[24px] p-4 text-center flex flex-col items-center justify-center h-32 overflow-hidden bg-gradient-to-br backdrop-blur-[24px] select-none",
                                                !currentValues.direct_upi_enabled 
                                                    ? "from-primary/20 to-secondary/10 border-primary shadow-[0_0_25px_rgba(230,30,67,0.2)]" 
                                                    : "from-black/40 to-[#201f1f]/40 border-primary/5 hover:border-primary/20 text-muted-foreground"
                                            )}
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 to-transparent pointer-events-none opacity-50" />
                                            <div className={cn(
                                                "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-lg transition-transform duration-300 group-hover:scale-105",
                                                !currentValues.direct_upi_enabled ? "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(230,30,67,0.3)]" : "bg-black/40 border border-white/5 text-muted-foreground"
                                            )}>
                                                <Users className="w-5 h-5" />
                                            </div>
                                            <div className="mt-3">
                                                <h3 className="text-sm font-bold text-foreground">Cash Only</h3>
                                                <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">Collect manually</p>
                                            </div>
                                        </button>
                                    </div>

                                    <AnimatePresence mode="wait">
                                        {currentValues.direct_upi_enabled && (
                                            <motion.div 
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 10 }}
                                                className="grid lg:grid-cols-12 gap-6 lg:gap-8 items-start"
                                            >
                                                <div className="lg:col-span-5 space-y-4">
                                                    <div className="space-y-4">
                                                        <div className="space-y-4 p-6 rounded-[24px] bg-gradient-to-br from-secondary/15 to-[#201f1f]/40 backdrop-blur-[24px] border border-primary/10 shadow-2xl relative overflow-hidden">
                                                            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
                                                            <FormField
                                                                control={form.control}
                                                                name="upiId"
                                                                render={({ field }) => (
                                                                    <FormItem className="space-y-2 text-left">
                                                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                                                            <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                                                                <Zap className="w-4 h-4 text-primary" /> Your UPI ID
                                                                            </FormLabel>
                                                                            {currentValues.ownerPhone && (
                                                                                <button 
                                                                                    type="button"
                                                                                    onClick={() => field.onChange(`${currentValues.ownerPhone}@ybl`)}
                                                                                    className="text-xs font-bold uppercase tracking-wider text-primary hover:underline"
                                                                                >
                                                                                    Use My Phone Number
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                        <FormControl>
                                                                            <div className="relative">
                                                                                <Input 
                                                                                    {...field} 
                                                                                    type="email"
                                                                                    inputMode="email"
                                                                                    autoCapitalize="none"
                                                                                    autoCorrect="off"
                                                                                    placeholder="9876543210@ybl" 
                                                                                    className="h-12 px-4 text-base font-semibold bg-black/40 border border-primary/10 hover:border-primary/20 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 rounded-[14px] transition-all placeholder:text-muted-foreground/30 text-foreground"
                                                                                />
                                                                            </div>
                                                                        </FormControl>
                                                                        <FormMessage className="text-xs font-semibold text-destructive/80 mt-1" />
                                                                    </FormItem>
                                                                )}
                                                            />

                                                            <FormField
                                                                control={form.control}
                                                                name="payeeName"
                                                                render={({ field }) => (
                                                                    <FormItem className="space-y-2 text-left">
                                                                        <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                                                            <UserCircle className="w-4 h-4 text-primary" /> Account Holder Name
                                                                        </FormLabel>
                                                                        <FormControl>
                                                                            <div className="relative">
                                                                                <Input 
                                                                                    {...field} 
                                                                                    autoCapitalize="words"
                                                                                    placeholder="Account Holder Name" 
                                                                                    className="h-12 px-4 text-base font-semibold bg-black/40 border border-primary/10 hover:border-primary/20 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 rounded-[14px] transition-all placeholder:text-muted-foreground/30 text-foreground"
                                                                                />
                                                                            </div>
                                                                        </FormControl>
                                                                        <FormMessage className="text-xs font-semibold text-destructive/80 mt-1" />
                                                                    </FormItem>
                                                                )}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="lg:col-span-7">
                                                    <div className="p-6 md:p-8 rounded-[24px] bg-gradient-to-br from-secondary/15 to-[#201f1f]/40 backdrop-blur-[24px] border border-primary/10 relative overflow-hidden group shadow-2xl">
                                                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
                                                        <div className="relative space-y-6 text-left">
                                                            <div className="w-12 h-12 rounded-[16px] bg-primary/20 flex items-center justify-center border border-primary/15 shadow-[0_0_20px_rgba(230,30,67,0.15)]">
                                                                <Zap className="w-6 h-6 text-primary animate-pulse" />
                                                            </div>
                                                            
                                                            <div className="space-y-4">
                                                                <h4 className="text-base font-bold text-foreground">Why Online Rent Collection?</h4>
                                                                <div className="space-y-3">
                                                                    {[
                                                                        { text: "Money direct in bank", desc: "Payments bypass third parties and go straight to your account." },
                                                                        { text: "Auto-marked as paid", desc: "Our system automatically tracks and updates payment ledgers." },
                                                                        { text: "Very easy and safe", desc: "No manual cash matching required, reducing errors by 99%." },
                                                                    ].map((perk, i) => (
                                                                        <div key={i} className="flex gap-3">
                                                                            <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 shrink-0 mt-0.5">
                                                                                <Check className="w-3 h-3 text-emerald-400" />
                                                                            </div>
                                                                            <div>
                                                                                <p className="text-xs font-bold text-foreground uppercase tracking-widest">{perk.text}</p>
                                                                                <p className="text-xs text-muted-foreground mt-0.5 font-medium leading-relaxed">{perk.desc}</p>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            )}

                            {/* STEP 5: REVIEW & LAUNCH */}
                            {activeStep === 'FINAL_CHECK' && (
                                <motion.div key="review" {...stepVariants} className="w-full max-w-4xl mx-auto pb-40 px-4">
                                    <div className="text-center space-y-2 mb-6">
                                        <h2 className="text-2xl md:text-4xl font-black tracking-tighter text-foreground bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/70">
                                            Ready to Launch!
                                        </h2>
                                        <p className="text-muted-foreground text-sm font-semibold">
                                            Review your details before completing setup
                                        </p>
                                    </div>

                                    <div className="grid gap-8">
                                        {/* Main Config Sheet */}
                                        <div className="rounded-[32px] bg-gradient-to-br from-secondary/15 to-[#201f1f]/40 backdrop-blur-[24px] border border-primary/10 overflow-hidden shadow-2xl relative">
                                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50" />
                                            <div className="p-6 md:p-10 space-y-8 md:space-y-10">
                                                {/* Header Info */}
                                                <div className="grid md:grid-cols-2 gap-8 md:gap-12 border-b border-primary/10 pb-8 md:pb-12">
                                                    <div className="space-y-4 md:space-y-6 text-left">
                                                        <div className="space-y-2">
                                                            <p className="text-xs font-bold text-primary uppercase tracking-widest">PG Info</p>
                                                            <h3 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">{currentValues.name}</h3>
                                                            <div className="flex items-center gap-2 text-muted-foreground font-semibold text-xs">
                                                                <MapPin className="w-3.5 h-3.5 text-primary" />
                                                                <span>{currentValues.location}, {currentValues.city}</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            <div className="px-3 py-1 rounded-[10px] bg-[#1c1b1b] text-muted-foreground text-xs font-bold uppercase tracking-wider border border-primary/5">
                                                                {currentValues.gender}
                                                            </div>
                                                            <div className="px-3 py-1 rounded-[10px] bg-primary/20 text-primary text-xs font-bold uppercase tracking-wider border border-primary/10 shadow-[0_0_15px_rgba(230,30,67,0.1)]">
                                                                Ready
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-4 md:border-l md:border-primary/10 md:pl-12 text-left flex flex-col justify-center">
                                                        <p className="text-xs font-bold text-primary uppercase tracking-widest">PG OWNER</p>
                                                        <div className="flex items-center gap-4 p-4 rounded-[20px] bg-black/40 border border-primary/10">
                                                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10 shrink-0">
                                                                <UserCircle className="w-7 h-7 text-primary" />
                                                            </div>
                                                            <div>
                                                                <p className="text-base font-bold text-foreground leading-none mb-1.5">{currentValues.ownerName}</p>
                                                                <div className="flex items-center gap-2 text-muted-foreground font-semibold text-xs">
                                                                    <Phone className="w-3 h-3 text-primary" />
                                                                    <span>+91 {currentValues.ownerPhone}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Infrastructure Stats */}
                                                <div className="space-y-4 md:space-y-6 text-left">
                                                    <p className="text-xs font-bold text-primary uppercase tracking-widest">Quick View</p>
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                                                        {[
                                                            { label: 'Floors', value: currentValues.floorCount, icon: Building2 },
                                                            { label: 'Rooms', value: currentValues.roomsPerFloor, icon: Home },
                                                            { label: 'Beds', value: currentValues.bedsPerRoom, icon: Bed },
                                                            { label: 'Total Beds', value: Number(currentValues.floorCount) * Number(currentValues.roomsPerFloor) * Number(currentValues.bedsPerRoom), icon: Users, highlight: true }
                                                        ].map((stat, i) => (
                                                            <div key={i} className={cn(
                                                                "p-4 md:p-6 rounded-[20px] border transition-all duration-300 group flex flex-col justify-between h-28 sm:h-32",
                                                                stat.highlight 
                                                                    ? "bg-gradient-to-br from-[#e61e43] to-[#5b3f44] text-white border-primary shadow-[0_0_20px_rgba(230,30,67,0.3)]" 
                                                                    : "bg-black/40 border-primary/10 hover:border-primary/20 text-foreground"
                                                            )}>
                                                                <stat.icon className={cn("w-5 h-5 shrink-0 opacity-60", stat.highlight && "opacity-100")} />
                                                                <div>
                                                                    <p className="text-xl md:text-3xl font-black tracking-tight leading-none mb-1">{stat.value}</p>
                                                                    <p className={cn("text-[10px] font-bold uppercase tracking-wider opacity-60 leading-none", stat.highlight && "opacity-80")}>{stat.label}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Payment Config */}
                                                <div className="space-y-4 pt-6 border-t border-primary/10 text-left">
                                                    <p className="text-xs font-bold text-primary uppercase tracking-widest">Rent Settings</p>
                                                    <div className="p-4 rounded-[20px] bg-black/40 border border-primary/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/15 shrink-0">
                                                                <Zap className="w-6 h-6 text-primary" />
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold uppercase tracking-wider text-foreground">{currentValues.payeeName || 'Cash Only'}</p>
                                                                <p className="text-xs text-muted-foreground font-semibold mt-0.5">{currentValues.upiId || 'No UPI ID provided'}</p>
                                                            </div>
                                                        </div>
                                                        <div className={cn(
                                                            "px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider border self-start sm:self-auto",
                                                            currentValues.upiId 
                                                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                                                                : "bg-orange-500/10 text-orange-400 border-orange-500/20"
                                                        )}>
                                                            {currentValues.upiId ? "Direct to Bank" : "Cash Only"}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action Card */}
                                        <div className="p-6 md:p-8 rounded-[28px] bg-gradient-to-br from-[#e61e43]/20 to-[#5b3f44]/25 backdrop-blur-[24px] border border-primary/20 text-white shadow-xl shadow-primary/5 relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-700 pointer-events-none" />
                                            <div className="relative flex flex-col sm:flex-row items-center justify-between gap-6">
                                                <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                                                    <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-[0_0_20px_rgba(230,30,67,0.3)] shrink-0">
                                                        <Trophy className="w-7 h-7 text-white" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-xl font-bold text-foreground">You are all set!</h4>
                                                        <p className="text-xs text-muted-foreground mt-0.5 font-medium leading-relaxed font-semibold">Click finish below to launch your digital PG setup.</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-12 text-center text-muted-foreground/30 font-bold text-xs uppercase tracking-widest pb-12">
                                        Simple PG App • RentSutra
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* PERSISTENT BOTTOM NAVIGATION */}
                        <NavigationFooter 
                            onNext={
                                activeStep === 'ROLE_SELECTION' ? undefined :
                                activeStep === 'OWNER_DETAILS' ? validateProfile :
                                activeStep === 'PG_DETAILS' ? validateBasics :
                                activeStep === 'ROOMS_CONFIG' ? validateLayout :
                                activeStep === 'PAYMENT_SETUP' ? validateUPI :
                                form.handleSubmit(onPropertySubmit)
                            }
                            onBack={
                                activeStep === 'PG_DETAILS' ? () => setActiveStep('OWNER_DETAILS') :
                                activeStep === 'ROOMS_CONFIG' ? () => setActiveStep('PG_DETAILS') :
                                activeStep === 'PAYMENT_SETUP' ? () => setActiveStep('ROOMS_CONFIG') :
                                activeStep === 'FINAL_CHECK' ? () => setActiveStep('PAYMENT_SETUP') :
                                undefined
                            }
                            showBack={activeStep !== 'OWNER_DETAILS' && activeStep !== 'ROLE_SELECTION'}
                            showNext={activeStep !== 'ROLE_SELECTION'}
                            nextLabel={
                                activeStep === 'OWNER_DETAILS' ? "Next" :
                                activeStep === 'PG_DETAILS' ? "Next" :
                                activeStep === 'ROOMS_CONFIG' ? "Next" :
                                activeStep === 'PAYMENT_SETUP' ? "Check" :
                                "Finish"
                            }
                            isFinal={activeStep === 'FINAL_CHECK'}
                            isLoading={isCreating}
                        />
                    </form>
                </Form>
                </div>
            </main>
        </div>
    )
}


