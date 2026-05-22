
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
                setActiveStep('PG_DETAILS');
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Profile Update Failed', description: error.message });
            }
        }
    }

    const validateBasics = async () => {
        const result = await form.trigger(['name', 'city', 'location', 'gender']);
        if (result) setActiveStep('ROOMS_CONFIG');
    }

    const applyPreset = (floors: number, rooms: number, beds: number) => {
        form.setValue('floorCount', floors);
        form.setValue('roomsPerFloor', rooms);
        form.setValue('bedsPerRoom', beds);
        toast({ title: 'Added!', description: `${floors} floors configured.` });
    }

    const validateLayout = async () => {
        const result = await form.trigger(['floorCount', 'roomsPerFloor', 'bedsPerRoom']);
        if (result) setActiveStep('PAYMENT_SETUP');
    }

    const validateUPI = async () => {
        const result = await form.trigger(['upiId', 'payeeName']);
        if (result) setActiveStep('FINAL_CHECK');
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
        <div className="min-h-screen bg-background selection:bg-primary/10 flex flex-col pb-safe">
            <div className="sticky top-0 left-0 right-0 z-50 bg-background/60 backdrop-blur-2xl border-b border-primary/5">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20 rotate-3">
                            <Rocket className="w-6 h-6 text-primary-foreground -rotate-3" />
                        </div>
                        <div>
                            <span className="font-bold text-xl tracking-tighter block leading-none">RentSutra</span>
                            <span className="text-base font-semibold text-primary leading-none mt-1 block">Simple PG App</span>
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
                                    className="w-full max-w-lg mx-auto px-4 text-center space-y-6"
                                >
                                    <div className="space-y-3">
                                        <motion.div 
                                            initial={{ scale: 0.5, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/30 mx-auto rotate-3"
                                        >
                                            <Sparkles className="w-7 h-7 text-primary-foreground -rotate-3" />
                                        </motion.div>
                                        <div className="space-y-1">
                                            <h2 className="text-xl md:text-3xl font-bold tracking-tight">Namaste</h2>
                                            <p className="text-muted-foreground text-sm font-medium">
                                                Select how you want to use RentSutra
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid gap-3 sm:grid-cols-2 max-w-lg mx-auto w-full text-left">
                                        <Card 
                                            onClick={handleOwnerSetup}
                                            className={cn(
                                                "relative group cursor-pointer border transition-all duration-200 rounded-xl overflow-hidden",
                                                loadingRole === 'owner' ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border hover:border-primary/50 hover:bg-muted/30"
                                            )}
                                        >
                                            <CardContent className="p-4 flex flex-col gap-3">
                                                <div className="flex items-center justify-between">
                                                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                                        {loadingRole === 'owner' ? (
                                                            <Loader2 className="w-5 h-5 text-primary animate-spin" />
                                                        ) : (
                                                            <Building2 className="w-5 h-5 text-primary" />
                                                        )}
                                                    </div>
                                                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-bold text-foreground">PG Owner</h3>
                                                    <p className="text-xs text-muted-foreground mt-0.5">
                                                        Manage your PG easily.
                                                    </p>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <Card className="relative opacity-60 border-dashed border border-border rounded-xl bg-muted/10">
                                            <CardContent className="p-4 flex flex-col gap-3">
                                                <div className="flex items-center justify-between">
                                                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                                                        <Users className="w-5 h-5 text-muted-foreground" />
                                                    </div>
                                                    <span className="text-[10px] font-bold bg-muted px-2 py-0.5 rounded-full text-muted-foreground uppercase tracking-wider">Soon</span>
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-bold text-muted-foreground">I am Guest</h3>
                                                    <p className="text-xs text-muted-foreground mt-0.5">
                                                        Pay rent and see bills.
                                                    </p>
                                                </div>
                                            </CardContent>
                                        </Card>
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
                                    className="w-full max-w-2xl mx-auto pb-24 px-4"
                                >
                                    <div className="space-y-2 mb-4 text-center md:text-left">
                                        <h2 className="text-xl md:text-2xl font-bold">About You</h2>
                                    </div>

                                    <Card className="border-primary/10 shadow-sm rounded-2xl overflow-hidden bg-card/50 backdrop-blur-md">
                                        <CardContent className="pt-5 md:pt-6 px-4 md:px-6 pb-5 md:pb-6 space-y-5">
                                            <FormField
                                                control={form.control}
                                                name="ownerName"
                                                render={({ field }) => (
                                                    <FormItem className="space-y-1.5">
                                                        <FormLabel className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                                                            <UserCircle className="w-4 h-4" /> Full Name
                                                        </FormLabel>
                                                        <FormControl>
                                                            <div className="relative group">
                                                                <Input 
                                                                    placeholder="e.g. Rahul Kumar" 
                                                                    className="h-10 px-4 text-sm font-semibold bg-muted/30 border border-primary/5 rounded-lg focus-visible:ring-1 focus-visible:ring-primary transition-all placeholder:text-muted-foreground/40" 
                                                                    {...field} 
                                                                />
                                                            </div>
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={form.control}
                                                name="ownerPhone"
                                                render={({ field }) => (
                                                    <FormItem className="space-y-1.5">
                                                        <FormLabel className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                                                            <Phone className="w-4 h-4" /> WhatsApp No.
                                                        </FormLabel>
                                                        <FormControl>
                                                            <div className="relative group">
                                                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground group-focus-within:text-primary transition-colors">+91</div>
                                                                <Input 
                                                                    placeholder="98765 43210" 
                                                                    type="tel"
                                                                    inputMode="numeric"
                                                                    className="h-10 pl-10 pr-4 text-sm font-semibold bg-muted/30 border border-primary/5 focus:border-primary/30 rounded-lg focus-visible:ring-1 transition-all placeholder:text-muted-foreground/30 tracking-wider" 
                                                                    maxLength={10}
                                                                    {...field}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value.replace(/\D/g, '');
                                                                        field.onChange(val);
                                                                    }}
                                                                />
                                                            </div>
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </CardContent>
                                    </Card>
                                    
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
                                    className="w-full max-w-3xl mx-auto pb-24 px-4"
                                >
                                    <div className="space-y-2 mb-4 text-center md:text-left">
                                        <h2 className="text-xl md:text-2xl font-bold">PG Name</h2>
                                    </div>

                                    <Card className="border-primary/10 shadow-sm rounded-2xl overflow-hidden bg-card/50 backdrop-blur-md">
                                        <CardContent className="pt-5 md:pt-6 px-4 md:px-6 pb-5 md:pb-6 space-y-5">
                                            <FormField
                                                control={form.control}
                                                name="name"
                                                render={({ field }) => (
                                                    <FormItem className="space-y-1.5">
                                                        <FormLabel className="text-sm font-semibold text-muted-foreground">PG Name</FormLabel>
                                                        <FormControl>
                                                            <div className="relative group">
                                                                <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                                                <Input placeholder="e.g. Sai PG" className="h-10 pl-9 pr-3 text-sm font-semibold bg-muted/20 border-none rounded-lg" {...field} />
                                                            </div>
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <FormField
                                                    control={form.control}
                                                    name="city"
                                                    render={({ field }) => (
                                                        <FormItem className="space-y-1.5">
                                                            <FormLabel className="text-sm font-semibold text-muted-foreground">City</FormLabel>
                                                            <FormControl>
                                                                <div className="relative group">
                                                                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary" />
                                                                    <Input placeholder="e.g. Pune" className="h-10 pl-9 pr-3 text-sm font-semibold bg-muted/20 border-none rounded-lg" {...field} />
                                                                </div>
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name="gender"
                                                    render={({ field }) => (
                                                        <FormItem className="space-y-1.5">
                                                            <FormLabel className="text-sm font-semibold text-muted-foreground">Who stays here?</FormLabel>
                                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                                <FormControl>
                                                                    <SelectTrigger className="h-10 font-semibold bg-muted/20 border-none rounded-lg px-3 text-sm">
                                                                        <SelectValue placeholder="Select type" />
                                                                    </SelectTrigger>
                                                                </FormControl>
                                                                <SelectContent className="rounded-lg border-primary/10">
                                                                    <SelectItem value="co-ed" className="font-semibold py-2 text-sm">Boys & Girls</SelectItem>
                                                                    <SelectItem value="male" className="font-semibold py-2 text-sm">Boys Only</SelectItem>
                                                                    <SelectItem value="female" className="font-semibold py-2 text-sm">Girls Only</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>

                                            <FormField
                                                control={form.control}
                                                name="location"
                                                render={({ field }) => (
                                                    <FormItem className="space-y-1.5">
                                                        <FormLabel className="text-sm font-semibold text-muted-foreground">Full Address</FormLabel>
                                                        <FormControl>
                                                            <div className="relative group">
                                                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary" />
                                                                <Input placeholder="e.g. Viman Nagar, near Phoenix Mall" className="h-10 pl-9 pr-3 text-sm font-semibold bg-muted/20 border-none rounded-lg" {...field} />
                                                            </div>
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={form.control}
                                                name="amenities"
                                                render={({ field }) => (
                                                    <FormItem className="space-y-2">
                                                        <FormLabel className="text-sm font-semibold text-muted-foreground">Facilities (What do you provide?)</FormLabel>
                                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
                                                                        "flex items-center gap-2 px-3 py-3 rounded-xl border transition-all cursor-pointer select-none",
                                                                        field.value?.includes(item.id) 
                                                                            ? "bg-primary border-primary text-primary-foreground shadow-sm shadow-primary/20" 
                                                                            : "bg-muted/20 border-transparent text-muted-foreground hover:bg-muted/30"
                                                                    )}
                                                                >
                                                                    <item.icon className="w-4 h-4 shrink-0" />
                                                                    <span className="text-xs font-bold uppercase tracking-wider">{item.label}</span>
                                                                </motion.div>
                                                            ))}
                                                        </div>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={form.control}
                                                name="images"
                                                render={({ field }) => (
                                                    <FormItem className="space-y-3 mt-4">
                                                        <div className="flex items-center justify-between">
                                                            <FormLabel className="text-sm font-semibold text-muted-foreground">Building Photo (Optional)</FormLabel>
                                                            {field.value.length > 0 ? (
                                                                <Button 
                                                                    type="button" 
                                                                    variant="ghost" 
                                                                    size="sm" 
                                                                    onClick={() => field.onChange([])}
                                                                    className="text-sm font-bold uppercase text-destructive hover:bg-destructive/5"
                                                                >
                                                                    Remove
                                                                </Button>
                                                            ) : (
                                                                <div className="text-sm font-bold uppercase text-primary/60">Optional</div>
                                                            )}
                                                        </div>
                                                        <div 
                                                            className={cn(
                                                                "relative h-48 rounded-3xl border-2 border-dashed transition-all flex flex-col items-center justify-center overflow-hidden",
                                                                field.value.length > 0 
                                                                    ? "border-primary/20 bg-primary/5 shadow-inner" 
                                                                    : "border-muted-foreground/20 bg-muted/20 hover:bg-muted/30 group"
                                                            )}
                                                        >
                                                            {field.value.length > 0 ? (
                                                                <>
                                                                    <img src={field.value[0]} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-80" />
                                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                                                    <div className="relative z-10 flex flex-col items-center gap-2 bg-background/90 backdrop-blur-md px-6 py-3 rounded-2xl border border-primary/20 shadow-xl">
                                                                        <CheckCircle2 className="w-5 h-5 text-primary" />
                                                                        <span className="text-sm font-bold uppercase tracking-wider">Image Ready</span>
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <div className="flex flex-col items-center gap-4 text-muted-foreground">
                                                                    <div className="w-16 h-16 rounded-2xl bg-background flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                                                        {uploadingImage ? <Loader2 className="w-8 h-8 animate-spin text-primary" /> : <Camera className="w-8 h-8" />}
                                                                    </div>
                                                                    <div className="text-center">
                                                                        <p className="text-sm font-bold text-foreground">Add Photo</p>
                                                                        <p className="text-sm font-medium opacity-60 mt-1">Guests like to see the building.</p>
                                                                    </div>
                                                                    <Input 
                                                                        type="file" 
                                                                        accept="image/*" 
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
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </CardContent>
                                    </Card>

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
                                            <div className="space-y-2 mb-4 text-center md:text-left">
                                                <h2 className="text-xl md:text-2xl font-bold tracking-tight">Floors & Rooms</h2>
                                            </div>

                                            <div className="space-y-3">
                                                <p className="text-sm font-semibold text-muted-foreground">Quick Setup</p>
                                                <div className="flex flex-wrap gap-2">
                                                    <Button type="button" variant="outline" size="sm" onClick={() => applyPreset(1, 5, 3)} className="h-10 rounded-lg font-semibold text-sm gap-2 px-4 hover:bg-primary/5 hover:border-primary/20 transition-all">
                                                        <Building className="w-4 h-4" /> Small PG
                                                    </Button>
                                                    <Button type="button" variant="outline" size="sm" onClick={() => applyPreset(3, 6, 3)} className="h-10 rounded-lg font-semibold text-sm gap-2 px-4 hover:bg-primary/5 hover:border-primary/20 transition-all">
                                                        <Layout className="w-4 h-4" /> Medium PG
                                                    </Button>
                                                    <Button type="button" variant="outline" size="sm" onClick={() => applyPreset(5, 10, 3)} className="h-10 rounded-lg font-semibold text-sm gap-2 px-4 hover:bg-primary/5 hover:border-primary/20 transition-all">
                                                        <Home className="w-4 h-4" /> Large PG
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="space-y-6">
                                                <div className="space-y-5 p-5 md:p-6 rounded-2xl bg-card/50 backdrop-blur-md border border-primary/10 shadow-sm shadow-primary/5">
                                                    <FormField
                                                        control={form.control}
                                                        name="floorCount"
                                                        render={({ field }) => (
                                                            <FormItem className="flex items-center justify-between gap-4 p-3 bg-muted/10 rounded-xl border border-primary/5">
                                                                <FormLabel className="text-sm font-semibold text-foreground m-0">Floors</FormLabel>
                                                                <FormControl>
                                                                    <div className="flex items-center gap-3">
                                                                        <Button type="button" variant="outline" size="icon" className="h-8 w-8 rounded-md shrink-0 shadow-sm" onClick={() => field.onChange(Math.max(1, field.value - 1))}>
                                                                            <Minus className="w-4 h-4" />
                                                                        </Button>
                                                                        <div className="w-8 text-center text-xl font-bold text-primary">{field.value}</div>
                                                                        <Button type="button" variant="outline" size="icon" className="h-8 w-8 rounded-md shrink-0 shadow-sm" onClick={() => field.onChange(Math.min(10, field.value + 1))}>
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
                                                            <FormItem className="flex items-center justify-between gap-4 p-3 bg-muted/10 rounded-xl border border-primary/5">
                                                                <FormLabel className="text-sm font-semibold text-foreground m-0">Rooms / Floor</FormLabel>
                                                                <FormControl>
                                                                    <div className="flex items-center gap-3">
                                                                        <Button type="button" variant="outline" size="icon" className="h-8 w-8 rounded-md shrink-0 shadow-sm" onClick={() => field.onChange(Math.max(1, field.value - 1))}>
                                                                            <Minus className="w-4 h-4" />
                                                                        </Button>
                                                                        <div className="w-8 text-center text-xl font-bold text-primary">{field.value}</div>
                                                                        <Button type="button" variant="outline" size="icon" className="h-8 w-8 rounded-md shrink-0 shadow-sm" onClick={() => field.onChange(Math.min(20, field.value + 1))}>
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
                                                            <FormItem className="flex items-center justify-between gap-4 p-3 bg-muted/10 rounded-xl border border-primary/5">
                                                                <FormLabel className="text-sm font-semibold text-foreground m-0">Beds / Room</FormLabel>
                                                                <FormControl>
                                                                    <div className="flex items-center gap-3">
                                                                        <Button type="button" variant="outline" size="icon" className="h-8 w-8 rounded-md shrink-0 shadow-sm" onClick={() => field.onChange(Math.max(1, field.value - 1))}>
                                                                            <Minus className="w-4 h-4" />
                                                                        </Button>
                                                                        <div className="w-8 text-center text-xl font-bold text-primary">{field.value}</div>
                                                                        <Button type="button" variant="outline" size="icon" className="h-8 w-8 rounded-md shrink-0 shadow-sm" onClick={() => field.onChange(Math.min(10, field.value + 1))}>
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
                                            <div className="sticky top-24 space-y-8">
                                                <motion.div 
                                                    initial={{ opacity: 0, scale: 0.9 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    transition={{ duration: 0.5 }}
                                                >
                                                    <BuildingPreview 
                                                        floorCount={currentValues.floorCount}
                                                        roomsPerFloor={currentValues.roomsPerFloor}
                                                        bedsPerRoom={currentValues.bedsPerRoom}
                                                    />
                                                </motion.div>
                                                
                                                <div className="p-6 md:p-8 rounded-3xl bg-card/50 backdrop-blur-md border border-primary/10 flex gap-4 md:gap-6 shadow-xl shadow-primary/5">
                                                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                                                        <Sparkles className="w-7 h-7 text-primary" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <h4 className="text-base font-semibold text-foreground">Auto Setup</h4>
                                                        <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                                                            We will create all rooms for you.
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
                                    <div className="text-center md:text-left space-y-2 mb-4">
                                        <h2 className="text-xl md:text-2xl font-bold">Rent Collection</h2>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 mb-6">
                                        <Card 
                                            onClick={() => {
                                                form.setValue('direct_upi_enabled', true, { shouldValidate: true, shouldDirty: true });
                                            }}
                                            className={cn(
                                                "relative group cursor-pointer border transition-all duration-200 rounded-xl overflow-hidden text-center flex items-center justify-center h-28",
                                                currentValues.direct_upi_enabled ? "border-primary bg-primary/5 ring-1 ring-primary/20 shadow-sm" : "border-border hover:border-primary/50 bg-card hover:bg-muted/30"
                                            )}
                                        >
                                            <CardContent className="p-3 flex flex-col items-center justify-center gap-2">
                                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                                    <Zap className="w-4 h-4 text-primary" />
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-bold">Online (UPI)</h3>
                                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                                        Direct to bank
                                                    </p>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <Card 
                                            onClick={() => {
                                                form.setValue('direct_upi_enabled', false, { shouldValidate: true, shouldDirty: true });
                                                form.setValue('upiId', '');
                                                form.setValue('payeeName', '');
                                            }}
                                            className={cn(
                                                "relative group cursor-pointer border transition-all duration-200 rounded-xl overflow-hidden text-center flex items-center justify-center h-28",
                                                !currentValues.direct_upi_enabled ? "border-primary bg-primary/5 ring-1 ring-primary/20 shadow-sm" : "border-border hover:border-primary/50 bg-card hover:bg-muted/30"
                                            )}
                                        >
                                            <CardContent className="p-3 flex flex-col items-center justify-center gap-2">
                                                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                                                    <Users className="w-4 h-4 text-muted-foreground" />
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-bold">Cash Only</h3>
                                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                                        Collect manually
                                                    </p>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>

                                    <AnimatePresence>
                                        {currentValues.direct_upi_enabled && (
                                            <motion.div 
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 10 }}
                                                className="grid lg:grid-cols-12 gap-6 lg:gap-8 items-start"
                                            >
                                                <div className="lg:col-span-5 space-y-4">
                                                    <div className="space-y-4">
                                                        <div className="space-y-4 p-4 md:p-6 rounded-2xl bg-card/50 backdrop-blur-md border border-primary/10 shadow-sm shadow-primary/5">
                                                            <FormField
                                                                control={form.control}
                                                                name="upiId"
                                                                render={({ field }) => (
                                                                    <FormItem className="space-y-1.5">
                                                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-1">
                                                                            <FormLabel className="text-sm font-semibold text-muted-foreground">
                                                                                Your UPI ID
                                                                            </FormLabel>
                                                                            {currentValues.ownerPhone && (
                                                                                <button 
                                                                                    type="button"
                                                                                    onClick={() => field.onChange(`${currentValues.ownerPhone}@ybl`)}
                                                                                    className="text-xs font-semibold text-primary hover:underline"
                                                                                >
                                                                                    Use My Phone Number
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                        <FormControl>
                                                                            <div className="relative group">
                                                                                <Input 
                                                                                    {...field} 
                                                                                    type="email"
                                                                                    inputMode="email"
                                                                                    placeholder="9876543210@ybl" 
                                                                                    className="h-12 pl-4 rounded-xl bg-background border-primary/10 group-focus-within:border-primary/30 group-focus-within:ring-primary/20 transition-all font-semibold text-base"
                                                                                />
                                                                            </div>
                                                                        </FormControl>
                                                                        <FormMessage className="text-xs font-bold uppercase tracking-wider" />
                                                                    </FormItem>
                                                                )}
                                                            />

                                                            <FormField
                                                                control={form.control}
                                                                name="payeeName"
                                                                render={({ field }) => (
                                                                    <FormItem className="space-y-1.5">
                                                                        <FormLabel className="text-sm font-semibold text-muted-foreground">Account Holder Name</FormLabel>
                                                                        <FormControl>
                                                                            <div className="relative group">
                                                                                <Input 
                                                                                    {...field} 
                                                                                    placeholder="Account Holder Name" 
                                                                                    className="h-12 pl-4 rounded-xl bg-background border-primary/10 group-focus-within:border-primary/30 group-focus-within:ring-primary/20 transition-all font-semibold text-base"
                                                                                />
                                                                            </div>
                                                                        </FormControl>
                                                                        <FormMessage className="text-xs font-bold uppercase tracking-wider" />
                                                                    </FormItem>
                                                                )}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="lg:col-span-7">
                                                    <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/10 relative overflow-hidden group">
                                                        <div className="relative space-y-8">
                                                            <div className="w-16 h-16 rounded-2xl bg-background shadow-xl flex items-center justify-center border border-primary/5">
                                                                <Zap className="w-8 h-8 text-primary" />
                                                            </div>
                                                            
                                                            <div className="space-y-4">
                                                                <h4 className="text-2xl font-bold tracking-tight">Why Online?</h4>
                                                                <div className="space-y-4">
                                                                    {[
                                                                        "Money direct in bank",
                                                                        "Auto-marked as paid",
                                                                        "Very easy and safe",
                                                                    ].map((perk, i) => (
                                                                        <div key={i} className="flex items-center gap-3">
                                                                            <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                                                                                <Check className="w-3 h-3 text-emerald-600" />
                                                                            </div>
                                                                            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">{perk}</p>
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
                                <motion.div key="review" {...stepVariants} className="w-full max-w-4xl mx-auto pb-40">
                                    <div className="text-center space-y-2 mb-6">
                                        <h2 className="text-xl md:text-4xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/50">
                                            Ready to Launch!
                                        </h2>
                                    </div>

                                    <div className="grid gap-8">
                                        {/* Main Config Sheet */}
                                        <Card className="border-none shadow-[0_40px_100px_-20px_rgba(0,0,0,0.1)] rounded-3xl bg-card/50 backdrop-blur-3xl overflow-hidden border border-primary/5">
                                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50" />
                                            <CardContent className="p-5 md:p-10 space-y-8 md:space-y-10">
                                                {/* Header Info */}
                                                <div className="grid md:grid-cols-2 gap-8 md:gap-12 border-b border-primary/5 pb-8 md:pb-12">
                                                    <div className="space-y-4 md:space-y-6">
                                                        <div className="space-y-2">
                                                            <p className="text-sm font-bold text-primary uppercase tracking-widest">PG Info</p>
                                                            <h3 className="text-3xl md:text-4xl font-bold tracking-tight">{currentValues.name}</h3>
                                                            <div className="flex items-center gap-2 text-muted-foreground font-bold text-sm">
                                                                <MapPin className="w-3.5 h-3.5" />
                                                                <span>{currentValues.location}, {currentValues.city}</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            <div className="px-3 py-1 rounded-lg bg-muted/50 text-sm font-semibold border border-primary/5">
                                                                {currentValues.gender}
                                                            </div>
                                                            <div className="px-3 py-1 rounded-lg bg-primary/10 text-primary text-sm font-semibold border border-primary/10">
                                                                Ready
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-6 md:border-l md:border-primary/5 md:pl-12">
                                                        <p className="text-sm font-bold text-primary uppercase tracking-widest">Step 01 / 04</p>
                                                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-muted/30 border border-primary/5">
                                                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10">
                                                                <UserCircle className="w-8 h-8 text-primary" />
                                                            </div>
                                                            <div>
                                                                <p className="text-lg font-bold leading-none mb-1">{currentValues.ownerName}</p>
                                                                <div className="flex items-center gap-2 text-muted-foreground font-bold text-sm">
                                                                    <Phone className="w-3 h-3" />
                                                                    <span>+91 {currentValues.ownerPhone}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Infrastructure Stats */}
                                                <div className="space-y-4 md:space-y-6">
                                                    <p className="text-sm font-bold text-primary uppercase tracking-widest">Quick View</p>
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                                                        {[
                                                            { label: 'Floors', value: currentValues.floorCount, icon: Building2 },
                                                            { label: 'Rooms', value: currentValues.roomsPerFloor, icon: Home },
                                                            { label: 'Beds', value: currentValues.bedsPerRoom, icon: Bed },
                                                            { label: 'Total', value: Number(currentValues.floorCount) * Number(currentValues.roomsPerFloor) * Number(currentValues.bedsPerRoom), icon: Users, highlight: true }
                                                        ].map((stat, i) => (
                                                            <div key={i} className={cn(
                                                                "p-4 md:p-6 rounded-2xl border transition-all group",
                                                                stat.highlight ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20" : "bg-muted/30 border-primary/5 hover:border-primary/20"
                                                            )}>
                                                                <stat.icon className={cn("w-4 h-4 mb-3 opacity-50", stat.highlight && "opacity-100")} />
                                                                <p className="text-2xl md:text-4xl font-bold tracking-tight mb-0.5">{stat.value}</p>
                                                                <p className={cn("text-sm font-semibold opacity-60", stat.highlight && "opacity-80")}>{stat.label}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Payment Config */}
                                                <div className="space-y-6 pt-6 border-t border-primary/5">
                                                    <p className="text-sm font-bold text-primary uppercase tracking-widest">Rent Settings</p>
                                                    <div className="p-5 rounded-2xl bg-muted/30 border border-primary/5 flex items-center justify-between">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/10">
                                                                <Zap className="w-6 h-6 text-primary" />
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold uppercase tracking-wider">{currentValues.payeeName || 'Cash Only'}</p>
                                                                <p className="text-xs text-muted-foreground font-medium">{currentValues.upiId || 'No UPI ID provided'}</p>
                                                            </div>
                                                        </div>
                                                        <div className={cn(
                                                            "px-4 py-1.5 rounded-xl text-sm font-semibold border",
                                                            currentValues.upiId 
                                                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
                                                                : "bg-orange-500/10 text-orange-600 border-orange-500/20"
                                                        )}>
                                                            {currentValues.upiId ? "Direct to Bank" : "Cash Only"}
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        {/* Action Card */}
                                        <div className="p-6 md:p-10 rounded-3xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-xl shadow-emerald-500/20 relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-700" />
                                            <div className="relative flex flex-col md:flex-row items-center justify-between gap-8">
                                                <div className="space-y-4 text-center md:text-left">
                                                    <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mx-auto md:mx-0">
                                                        <Trophy className="w-8 h-8 text-white" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-2xl font-bold tracking-tight">Ready to Go!</h4>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-12 text-center text-muted-foreground/30 font-bold text-base font-medium tracking-widest pb-12">
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


