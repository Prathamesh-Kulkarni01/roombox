
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
  roomsPerFloor: z.coerce.number().min(1).max(20).default(4),
  bedsPerRoom: z.coerce.number().min(1).max(10).default(2),
  amenities: z.array(z.string()).default([]),
  images: z.array(z.string()).default([]),
  upiId: z.string().min(3, "UPI ID is required for digital payments").optional().or(z.literal('')),
  payeeName: z.string().min(2, "Payee name is required").optional().or(z.literal('')),
})

type PgFormValues = z.infer<typeof pgSchema>

type OnboardingStep = 'ROLE_SELECTION' | 'OWNER_DETAILS' | 'PG_DETAILS' | 'LAYOUT_CONFIG' | 'UPI_SETUP' | 'REVIEW_FINAL'

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
            roomsPerFloor: 4,
            bedsPerRoom: 2,
            amenities: [],
            images: [],
            upiId: '',
            payeeName: '',
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
            case 'LAYOUT_CONFIG': return 70;
            case 'UPI_SETUP': return 85;
            case 'REVIEW_FINAL': return 100;
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
        if (result) setActiveStep('LAYOUT_CONFIG');
    }

    const applyPreset = (floors: number, rooms: number, beds: number) => {
        form.setValue('floorCount', floors);
        form.setValue('roomsPerFloor', rooms);
        form.setValue('bedsPerRoom', beds);
        toast({ title: 'Added!', description: `${floors} floors configured.` });
    }

    const validateLayout = async () => {
        const result = await form.trigger(['floorCount', 'roomsPerFloor', 'bedsPerRoom']);
        if (result) setActiveStep('UPI_SETUP');
    }

    const validateUPI = async () => {
        const result = await form.trigger(['upiId', 'payeeName']);
        if (result) setActiveStep('REVIEW_FINAL');
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
                upiId: data.upiId,
                payeeName: data.payeeName,
                direct_upi_enabled: !!data.upiId,
                paymentMode: data.upiId ? 'DIRECT_UPI' : 'CASH_ONLY'
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
                            <span className="font-black text-xl tracking-tighter block leading-none">RentSutra</span>
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary leading-none mt-1 block">Simple PG App</span>
                        </div>
                    </div>
                    
                    {activeStep !== 'ROLE_SELECTION' && (
                        <div className="hidden md:flex items-center gap-10">
                            <StepIndicator active={activeStep === 'OWNER_DETAILS'} completed={['PG_DETAILS', 'LAYOUT_CONFIG', 'UPI_SETUP', 'REVIEW_FINAL'].includes(activeStep)} label="Owner" index={1} />
                            <div className="w-8 h-[2px] bg-muted/20" />
                            <StepIndicator active={activeStep === 'PG_DETAILS'} completed={['LAYOUT_CONFIG', 'UPI_SETUP', 'REVIEW_FINAL'].includes(activeStep)} label="PG Name" index={2} />
                            <div className="w-8 h-[2px] bg-muted/20" />
                            <StepIndicator active={activeStep === 'LAYOUT_CONFIG'} completed={['UPI_SETUP', 'REVIEW_FINAL'].includes(activeStep)} label="Rooms" index={3} />
                            <div className="w-8 h-[2px] bg-muted/20" />
                            <StepIndicator active={activeStep === 'UPI_SETUP'} completed={activeStep === 'REVIEW_FINAL'} label="Rent" index={4} />
                            <div className="w-8 h-[2px] bg-muted/20" />
                            <StepIndicator active={activeStep === 'REVIEW_FINAL'} completed={false} label="Finish" index={5} />
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

            <main className="flex-1 max-w-7xl mx-auto px-6 py-12 w-full grid grid-cols-1 lg:grid-cols-12 gap-16">
                {/* Desktop Sidebar */}
                <div className="hidden lg:flex lg:col-span-3 flex-col gap-12 sticky top-24 h-fit pr-12 border-r border-primary/5">
                    <div className="space-y-12">
                        <StepIndicator index={1} label="Owner Details" active={activeStep === 'OWNER_DETAILS'} completed={['PG_DETAILS', 'LAYOUT_CONFIG', 'UPI_SETUP', 'REVIEW_FINAL'].includes(activeStep)} />
                        <StepIndicator index={2} label="Building Name" active={activeStep === 'PG_DETAILS'} completed={['LAYOUT_CONFIG', 'UPI_SETUP', 'REVIEW_FINAL'].includes(activeStep)} />
                        <StepIndicator index={3} label="Rooms & Beds" active={activeStep === 'LAYOUT_CONFIG'} completed={['UPI_SETUP', 'REVIEW_FINAL'].includes(activeStep)} />
                        <StepIndicator index={4} label="Rent Money" active={activeStep === 'UPI_SETUP'} completed={['REVIEW_FINAL'].includes(activeStep)} />
                        <StepIndicator index={5} label="Check & Finish" active={activeStep === 'REVIEW_FINAL'} completed={false} />
                    </div>

                    <div className="mt-auto pt-12 space-y-8">
                        <div className="p-6 rounded-[2.5rem] bg-primary/5 border border-primary/10 space-y-4">
                            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                                <HelpCircle className="w-5 h-5 text-primary" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-black tracking-tight">Need Help?</p>
                                <p className="text-[10px] text-muted-foreground font-medium leading-relaxed">Our support team is ready to help you set up.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-9">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onPropertySubmit)} className="w-full">
                            <AnimatePresence mode="wait">
                                {/* The steps are already here */}
                            </AnimatePresence>
                            {/* NavigationFooter will be added separately or kept if possible */}
                        </form>
                    </Form>
                </div>
            </main>
                            {/* STEP 0: ROLE SELECTION */}
                            {activeStep === 'ROLE_SELECTION' && (
                                <motion.div
                                    key="role-selection"
                                    variants={stepVariants}
                                    initial="initial"
                                    animate="animate"
                                    exit="exit"
                                    className="w-full max-w-4xl mx-auto px-4 text-center space-y-12"
                                >
                                    <div className="space-y-6">
                                        <motion.div 
                                            initial={{ scale: 0.5, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            className="w-24 h-24 rounded-[2.5rem] bg-gradient-to-tr from-primary to-primary/60 flex items-center justify-center shadow-2xl shadow-primary/30 mx-auto rotate-6"
                                        >
                                            <Sparkles className="w-12 h-12 text-primary-foreground -rotate-6" />
                                        </motion.div>
                                        <div className="space-y-2">
                                            <h2 className="text-5xl md:text-6xl font-black tracking-tighter">Welcome to RentSutra</h2>
                                            <p className="text-muted-foreground text-xl font-medium max-w-xl mx-auto">
                                                Is this your PG?
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
                                        <Card 
                                            onClick={handleOwnerSetup}
                                            className={cn(
                                                "relative group cursor-pointer border-2 transition-all duration-500 rounded-[3rem] overflow-hidden",
                                                loadingRole === 'owner' ? "border-primary bg-primary/5" : "border-primary/5 hover:border-primary/20 bg-card/50 hover:bg-card hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)]"
                                            )}
                                        >
                                            <CardContent className="p-10 space-y-8">
                                                <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                                                    {loadingRole === 'owner' ? (
                                                        <Loader2 className="w-10 h-10 text-primary animate-spin" />
                                                    ) : (
                                                        <Building2 className="w-10 h-10 text-primary" />
                                                    )}
                                                </div>
                                                <div className="space-y-3 text-left">
                                                    <h3 className="text-3xl font-black tracking-tight">PG Owner</h3>
                                                    <p className="text-muted-foreground font-medium leading-relaxed">
                                                        Add rooms, collect rent, and see everything in one simple place.
                                                    </p>
                                                </div>
                                                <div className="flex items-center justify-between pt-4 border-t border-primary/5">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">Get Started</span>
                                                    <ChevronRight className="w-5 h-5 text-primary group-hover:translate-x-2 transition-transform" />
                                                </div>
                                            </CardContent>
                                            {loadingRole === 'owner' && (
                                                <div className="absolute inset-0 bg-background/20 backdrop-blur-[2px] flex items-center justify-center" />
                                            )}
                                        </Card>

                                        <Card className="relative opacity-60 border-dashed border-2 border-muted-foreground/20 rounded-[3rem] bg-muted/5">
                                            <CardContent className="p-10 space-y-8">
                                                <div className="w-20 h-20 rounded-3xl bg-muted flex items-center justify-center">
                                                    <Users className="w-10 h-10 text-muted-foreground" />
                                                </div>
                                                <div className="space-y-3 text-left">
                                                    <h3 className="text-3xl font-black tracking-tight text-muted-foreground">Guest / Tenant</h3>
                                                    <p className="text-muted-foreground font-medium leading-relaxed">
                                                        Pay rent and see your bills online.
                                                    </p>
                                                </div>
                                                <div className="flex items-center justify-between pt-4 border-t border-muted-foreground/5">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Coming Soon</span>
                                                    <Info className="w-4 h-4" />
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>

                                    <div className="pt-12 text-[10px] font-black uppercase tracking-[0.5em] text-muted-foreground/40">
                                        Safe and Simple to Use • RentSutra
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
                                    className="w-full max-w-2xl mx-auto pb-40 px-4"
                                >
                                    <div className="space-y-4 mb-12 text-center">
                                        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                                            Step 01 / 04
                                        </div>
                                        <h2 className="text-4xl md:text-5xl font-black">Your Details</h2>
                                        <p className="text-muted-foreground text-lg font-medium">Tell us who you are.</p>
                                    </div>

                                    <Card className="border-primary/10 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] rounded-[2.5rem] overflow-hidden bg-card/50 backdrop-blur-md">
                                        <CardContent className="pt-10 px-6 md:px-10 pb-8 space-y-8">
                                            <FormField
                                                control={form.control}
                                                name="ownerName"
                                                render={({ field }) => (
                                                    <FormItem className="space-y-3">
                                                        <FormLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                                                            <UserCircle className="w-3 h-3" /> Your Name
                                                        </FormLabel>
                                                        <FormControl>
                                                            <div className="relative group">
                                                                <Input 
                                                                    placeholder="e.g. Rahul Kumar" 
                                                                    className="h-16 px-6 text-xl font-black bg-muted/40 border border-primary/5 rounded-2xl focus-visible:ring-2 focus-visible:ring-primary transition-all placeholder:text-muted-foreground/30 tracking-wider" 
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
                                                    <FormItem className="space-y-3">
                                                        <FormLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                                                            <Phone className="w-3 h-3" /> WhatsApp Number
                                                        </FormLabel>
                                                        <FormControl>
                                                            <div className="relative group">
                                                                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-xl font-black text-primary/40 group-focus-within:text-primary transition-colors">+91</div>
                                                                <Input 
                                                                    placeholder="98765 43210" 
                                                                    className="h-16 pl-24 pr-6 text-xl font-black bg-muted/40 border-2 border-primary/5 focus:border-primary/20 rounded-2xl focus-visible:ring-0 transition-all placeholder:text-muted-foreground/20 tracking-widest" 
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
                                    className="w-full max-w-3xl mx-auto pb-40 px-4"
                                >
                                    <div className="space-y-4 mb-12 text-center">
                                        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                                            Step 02 / 04
                                        </div>
                                        <h2 className="text-4xl md:text-5xl font-black">Building Name</h2>
                                        <p className="text-muted-foreground text-lg font-medium">Tell us what your PG is called.</p>
                                    </div>

                                    <Card className="border-primary/10 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] rounded-[2.5rem] overflow-hidden bg-card/50 backdrop-blur-md">
                                        <CardContent className="pt-10 px-6 md:px-10 pb-8 space-y-10">
                                            <FormField
                                                control={form.control}
                                                name="name"
                                                render={({ field }) => (
                                                    <FormItem className="space-y-3">
                                                        <FormLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">PG Name</FormLabel>
                                                        <FormControl>
                                                            <div className="relative group">
                                                                <Building className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                                                <Input placeholder="e.g. Sai Residency PG" className="h-16 pl-16 pr-6 text-xl font-bold bg-muted/20 border-none rounded-2xl" {...field} />
                                                            </div>
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                                <FormField
                                                    control={form.control}
                                                    name="city"
                                                    render={({ field }) => (
                                                        <FormItem className="space-y-3">
                                                            <FormLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">City</FormLabel>
                                                            <FormControl>
                                                                <div className="relative group">
                                                                    <Globe className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary" />
                                                                    <Input placeholder="e.g. Pune" className="h-16 pl-14 pr-6 text-lg font-bold bg-muted/20 border-none rounded-2xl" {...field} />
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
                                                        <FormItem className="space-y-3">
                                                            <FormLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Who stays here?</FormLabel>
                                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                                <FormControl>
                                                                    <SelectTrigger className="h-16 font-bold bg-muted/20 border-none rounded-2xl px-6 text-lg">
                                                                        <SelectValue placeholder="Select type" />
                                                                    </SelectTrigger>
                                                                </FormControl>
                                                                <SelectContent className="rounded-2xl border-primary/10">
                                                                    <SelectItem value="co-ed" className="font-bold py-3">Boys & Girls (Both)</SelectItem>
                                                                    <SelectItem value="male" className="font-bold py-3">Boys Only</SelectItem>
                                                                    <SelectItem value="female" className="font-bold py-3">Girls Only</SelectItem>
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
                                                    <FormItem className="space-y-3">
                                                        <FormLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Full Address</FormLabel>
                                                        <FormControl>
                                                            <div className="relative group">
                                                                <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary" />
                                                                <Input placeholder="e.g. Viman Nagar, near Phoenix Mall" className="h-16 pl-14 pr-6 text-lg font-bold bg-muted/20 border-none rounded-2xl" {...field} />
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
                                                    <FormItem className="space-y-4">
                                                        <FormLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Facilities (What do you provide?)</FormLabel>
                                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
                                                                        "flex items-center gap-3 px-4 py-4 rounded-2xl border-2 transition-all cursor-pointer select-none",
                                                                        field.value?.includes(item.id) 
                                                                            ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20" 
                                                                            : "bg-muted/20 border-transparent text-muted-foreground hover:bg-muted/30"
                                                                    )}
                                                                >
                                                                    <item.icon className="w-4 h-4 shrink-0" />
                                                                    <span className="text-xs font-black uppercase tracking-wider">{item.label}</span>
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
                                                    <FormItem className="space-y-4">
                                                        <div className="flex items-center justify-between">
                                                            <FormLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Building Photo (Optional)</FormLabel>
                                                            {field.value.length > 0 ? (
                                                                <Button 
                                                                    type="button" 
                                                                    variant="ghost" 
                                                                    size="sm" 
                                                                    onClick={() => field.onChange([])}
                                                                    className="text-[10px] font-black uppercase text-destructive hover:bg-destructive/5"
                                                                >
                                                                    Remove
                                                                </Button>
                                                            ) : (
                                                                <div className="text-[10px] font-black uppercase text-primary/60">Can skip for now</div>
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
                                                                        <span className="text-[10px] font-black uppercase tracking-wider">Image Ready</span>
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <div className="flex flex-col items-center gap-4 text-muted-foreground">
                                                                    <div className="w-16 h-16 rounded-2xl bg-background flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                                                        {uploadingImage ? <Loader2 className="w-8 h-8 animate-spin text-primary" /> : <Camera className="w-8 h-8" />}
                                                                    </div>
                                                                    <div className="text-center">
                                                                        <p className="text-sm font-black text-foreground">Upload PG Photo</p>
                                                                        <p className="text-[10px] font-medium opacity-60 mt-1">A good photo helps guests find you easily.</p>
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
                            {activeStep === 'LAYOUT_CONFIG' && (
                                <motion.div 
                                    key="layout"
                                    variants={stepVariants}
                                    initial="initial"
                                    animate="animate"
                                    exit="exit"
                                    className="w-full pb-40 px-4"
                                >
                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start max-w-6xl mx-auto">
                                        <div className="lg:col-span-5 space-y-10">
                                            <div className="space-y-4">
                                                <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                                                    Step 03 / 04
                                                </div>
                                                <h2 className="text-4xl md:text-5xl font-black tracking-tight">Rooms & Beds</h2>
                                                <p className="text-muted-foreground font-medium leading-relaxed text-lg">
                                                    How many rooms and beds do you have?
                                                </p>
                                            </div>

                                            <div className="space-y-4">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Pick a size</p>
                                                <div className="flex flex-wrap gap-2">
                                                    <Button type="button" variant="outline" size="sm" onClick={() => applyPreset(2, 4, 2)} className="h-12 rounded-2xl font-black uppercase tracking-widest text-[10px] gap-2 border-2 px-6 hover:bg-primary/5 hover:border-primary/20 transition-all">
                                                        <Building className="w-4 h-4" /> Small PG
                                                    </Button>
                                                    <Button type="button" variant="outline" size="sm" onClick={() => applyPreset(4, 6, 2)} className="h-12 rounded-2xl font-black uppercase tracking-widest text-[10px] gap-2 border-2 px-6 hover:bg-primary/5 hover:border-primary/20 transition-all">
                                                        <Layout className="w-4 h-4" /> Big PG
                                                    </Button>
                                                    <Button type="button" variant="outline" size="sm" onClick={() => applyPreset(1, 4, 1)} className="h-12 rounded-2xl font-black uppercase tracking-widest text-[10px] gap-2 border-2 px-6 hover:bg-primary/5 hover:border-primary/20 transition-all">
                                                        <Home className="w-4 h-4" /> Small Flat
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="space-y-8">
                                                <div className="space-y-10 p-8 rounded-[2.5rem] bg-card/50 backdrop-blur-md border border-primary/10 shadow-xl shadow-primary/5">
                                                    <FormField
                                                        control={form.control}
                                                        name="floorCount"
                                                        render={({ field }) => (
                                                            <FormItem className="space-y-4">
                                                                <FormLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">How many floors?</FormLabel>
                                                                <FormControl>
                                                                    <div className="flex items-center justify-between gap-6 bg-muted/20 p-2 rounded-2xl border border-primary/5">
                                                                        <Button type="button" variant="ghost" size="icon" className="h-14 w-14 rounded-xl shrink-0 bg-background shadow-md hover:bg-primary/5 hover:text-primary transition-all" onClick={() => field.onChange(Math.max(1, field.value - 1))}>
                                                                            <Minus className="w-6 h-6" />
                                                                        </Button>
                                                                        <div className="flex-1 text-center text-4xl font-black text-primary">{field.value}</div>
                                                                        <Button type="button" variant="ghost" size="icon" className="h-14 w-14 rounded-xl shrink-0 bg-background shadow-md hover:bg-primary/5 hover:text-primary transition-all" onClick={() => field.onChange(Math.min(10, field.value + 1))}>
                                                                            <Plus className="w-6 h-6" />
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
                                                            <FormItem className="space-y-4">
                                                                <FormLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Rooms per floor</FormLabel>
                                                                <FormControl>
                                                                    <div className="flex items-center justify-between gap-6 bg-muted/20 p-2 rounded-2xl border border-primary/5">
                                                                        <Button type="button" variant="ghost" size="icon" className="h-14 w-14 rounded-xl shrink-0 bg-background shadow-md hover:bg-primary/5 hover:text-primary transition-all" onClick={() => field.onChange(Math.max(1, field.value - 1))}>
                                                                            <Minus className="w-6 h-6" />
                                                                        </Button>
                                                                        <div className="flex-1 text-center text-4xl font-black text-primary">{field.value}</div>
                                                                        <Button type="button" variant="ghost" size="icon" className="h-14 w-14 rounded-xl shrink-0 bg-background shadow-md hover:bg-primary/5 hover:text-primary transition-all" onClick={() => field.onChange(Math.min(20, field.value + 1))}>
                                                                            <Plus className="w-6 h-6" />
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
                                                            <FormItem className="space-y-4">
                                                                <FormLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Beds per room</FormLabel>
                                                                <FormControl>
                                                                    <div className="flex items-center justify-between gap-6 bg-muted/20 p-2 rounded-2xl border border-primary/5">
                                                                        <Button type="button" variant="ghost" size="icon" className="h-14 w-14 rounded-xl shrink-0 bg-background shadow-md hover:bg-primary/5 hover:text-primary transition-all" onClick={() => field.onChange(Math.max(1, field.value - 1))}>
                                                                            <Minus className="w-6 h-6" />
                                                                        </Button>
                                                                        <div className="flex-1 text-center text-4xl font-black text-primary">{field.value}</div>
                                                                        <Button type="button" variant="ghost" size="icon" className="h-14 w-14 rounded-xl shrink-0 bg-background shadow-md hover:bg-primary/5 hover:text-primary transition-all" onClick={() => field.onChange(Math.min(10, field.value + 1))}>
                                                                            <Plus className="w-6 h-6" />
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
                                                
                                                <div className="p-8 rounded-[2.5rem] bg-card/50 backdrop-blur-md border border-primary/10 flex gap-6 shadow-xl shadow-primary/5">
                                                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                                                        <Sparkles className="w-7 h-7 text-primary" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <h4 className="text-sm font-black uppercase tracking-widest text-foreground">Everything will be ready</h4>
                                                        <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                                                            We will create all your rooms automatically. You just need to add guests later.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                            
                            {/* STEP 4: UPI SETUP */}
                            {activeStep === 'UPI_SETUP' && (
                                <motion.div key="upi" {...stepVariants} className="w-full max-w-4xl mx-auto pb-40">
                                    <div className="text-center space-y-6 mb-12">
                                        <motion.div 
                                            initial={{ scale: 0.9, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            className="inline-flex items-center gap-3 bg-primary/10 text-primary px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-primary/20 shadow-lg shadow-primary/5"
                                        >
                                            <Zap className="w-3 h-3 fill-primary" />
                                            Step 04 / 04
                                        </motion.div>
                                        <div className="space-y-4">
                                            <h2 className="text-6xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/50">
                                                Rent Money
                                            </h2>
                                            <p className="text-muted-foreground text-lg font-medium max-w-xl mx-auto">
                                                How should your guests pay you?
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid lg:grid-cols-2 gap-8 mb-12">
                                        <Card 
                                            onClick={() => form.setValue('upiId', currentValues.upiId || ' ')}
                                            className={cn(
                                                "relative group cursor-pointer border-2 transition-all duration-500 rounded-[3rem] overflow-hidden",
                                                currentValues.upiId ? "border-primary bg-primary/5" : "border-primary/5 hover:border-primary/20 bg-card/50"
                                            )}
                                        >
                                            <CardContent className="p-8 space-y-6">
                                                <div className="flex items-center justify-between">
                                                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                                                        <Zap className="w-8 h-8 text-primary" />
                                                    </div>
                                                    {currentValues.upiId && <CheckCircle2 className="w-6 h-6 text-primary" />}
                                                </div>
                                                <div className="space-y-2">
                                                    <h3 className="text-2xl font-black tracking-tight">Online Payment</h3>
                                                    <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                                                        Money goes direct to your bank account.
                                                    </p>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <Card 
                                            onClick={() => {
                                                form.setValue('upiId', '');
                                                form.setValue('payeeName', '');
                                            }}
                                            className={cn(
                                                "relative group cursor-pointer border-2 transition-all duration-500 rounded-[3rem] overflow-hidden",
                                                !currentValues.upiId ? "border-primary bg-primary/5" : "border-primary/5 hover:border-primary/20 bg-card/50"
                                            )}
                                        >
                                            <CardContent className="p-8 space-y-6">
                                                <div className="flex items-center justify-between">
                                                    <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
                                                        <Users className="w-8 h-8 text-muted-foreground" />
                                                    </div>
                                                    {!currentValues.upiId && <CheckCircle2 className="w-6 h-6 text-primary" />}
                                                </div>
                                                <div className="space-y-2">
                                                    <h3 className="text-2xl font-black tracking-tight">Take Cash</h3>
                                                    <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                                                        Collect rent in hand from guests.
                                                    </p>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>

                                    <AnimatePresence>
                                        {currentValues.upiId !== '' && (
                                            <motion.div 
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 20 }}
                                                className="grid lg:grid-cols-12 gap-12 items-start"
                                            >
                                                <div className="lg:col-span-5 space-y-8">
                                                    <div className="space-y-6">
                                                        <div className="space-y-6 p-8 rounded-[2.5rem] bg-card/50 backdrop-blur-md border border-primary/10 shadow-xl shadow-primary/5">
                                                            <FormField
                                                                control={form.control}
                                                                name="upiId"
                                                                render={({ field }) => (
                                                                    <FormItem className="space-y-4">
                                                                        <FormLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center justify-between">
                                                                            Enter UPI ID (PhonePe/GPay ID)
                                                                        </FormLabel>
                                                                        <FormControl>
                                                                            <div className="relative group">
                                                                                <Input 
                                                                                    {...field} 
                                                                                    placeholder="9876543210@ybl" 
                                                                                    className="h-16 pl-6 rounded-2xl bg-background border-primary/10 group-focus-within:border-primary/30 group-focus-within:ring-primary/20 transition-all font-bold text-lg"
                                                                                />
                                                                            </div>
                                                                        </FormControl>
                                                                        <FormMessage className="text-[10px] font-bold uppercase tracking-wider" />
                                                                    </FormItem>
                                                                )}
                                                            />

                                                            <FormField
                                                                control={form.control}
                                                                name="payeeName"
                                                                render={({ field }) => (
                                                                    <FormItem className="space-y-4">
                                                                        <FormLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Your Name (as in Bank)</FormLabel>
                                                                        <FormControl>
                                                                            <div className="relative group">
                                                                                <Input 
                                                                                    {...field} 
                                                                                    placeholder="Account Holder Name" 
                                                                                    className="h-16 pl-6 rounded-2xl bg-background border-primary/10 group-focus-within:border-primary/30 group-focus-within:ring-primary/20 transition-all font-bold text-lg"
                                                                                />
                                                                            </div>
                                                                        </FormControl>
                                                                        <FormMessage className="text-[10px] font-bold uppercase tracking-wider" />
                                                                    </FormItem>
                                                                )}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="lg:col-span-7">
                                                    <div className="p-10 rounded-[3rem] bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/10 relative overflow-hidden group">
                                                        <div className="relative space-y-8">
                                                            <div className="w-16 h-16 rounded-2xl bg-background shadow-xl flex items-center justify-center border border-primary/5">
                                                                <Zap className="w-8 h-8 text-primary" />
                                                            </div>
                                                            
                                                            <div className="space-y-4">
                                                                <h4 className="text-2xl font-black tracking-tight">Why take rent online?</h4>
                                                                <div className="space-y-4">
                                                                    {[
                                                                        "Money goes directly to your bank",
                                                                        "Rent is marked as paid automatically",
                                                                        "Guests get receipt immediately",
                                                                        "No need to ask for cash"
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
                            {activeStep === 'REVIEW_FINAL' && (
                                <motion.div key="review" {...stepVariants} className="w-full max-w-4xl mx-auto pb-40">
                                    <div className="text-center space-y-6 mb-12">
                                        <motion.div 
                                            initial={{ rotate: -10, scale: 0.9, opacity: 0 }}
                                            animate={{ rotate: 0, scale: 1, opacity: 1 }}
                                            className="inline-flex items-center gap-3 bg-emerald-500/10 text-emerald-600 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-emerald-500/20 shadow-lg shadow-emerald-500/5"
                                        >
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                            All Done!
                                        </motion.div>
                                        <div className="space-y-4">
                                            <h2 className="text-6xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/50">
                                                Check and Finish
                                            </h2>
                                            <p className="text-muted-foreground text-lg font-medium max-w-xl mx-auto">
                                                Please check if all info is correct.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid gap-8">
                                        {/* Main Config Sheet */}
                                        <Card className="border-none shadow-[0_40px_100px_-20px_rgba(0,0,0,0.1)] rounded-[3rem] bg-card/50 backdrop-blur-3xl overflow-hidden border border-primary/5">
                                            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary/50 via-primary to-primary/50" />
                                            <CardContent className="p-8 md:p-12 space-y-12">
                                                {/* Header Info */}
                                                <div className="grid md:grid-cols-2 gap-12 border-b border-primary/5 pb-12">
                                                    <div className="space-y-6">
                                                        <div className="space-y-2">
                                                            <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">PG Information</p>
                                                            <h3 className="text-4xl font-black tracking-tight">{currentValues.name}</h3>
                                                            <div className="flex items-center gap-2 text-muted-foreground font-bold">
                                                                <MapPin className="w-4 h-4" />
                                                                <span>{currentValues.location}, {currentValues.city}</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-wrap gap-3">
                                                            <div className="px-4 py-1.5 rounded-xl bg-muted/50 text-[10px] font-black uppercase tracking-widest border border-primary/5">
                                                                {currentValues.gender} Only
                                                            </div>
                                                            <div className="px-4 py-1.5 rounded-xl bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest border border-primary/10">
                                                                Ready to use
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-6 md:border-l md:border-primary/5 md:pl-12">
                                                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Step 01 / 04</p>
                                                        <div className="flex items-center gap-4 p-4 rounded-3xl bg-muted/30 border border-primary/5">
                                                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10">
                                                                <UserCircle className="w-8 h-8 text-primary" />
                                                            </div>
                                                            <div>
                                                                <p className="text-lg font-black leading-none mb-1">{currentValues.ownerName}</p>
                                                                <div className="flex items-center gap-2 text-muted-foreground font-bold text-sm">
                                                                    <Phone className="w-3 h-3" />
                                                                    <span>+91 {currentValues.ownerPhone}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Infrastructure Stats */}
                                                <div className="space-y-6">
                                                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Building Details</p>
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                        {[
                                                            { label: 'Floors', value: currentValues.floorCount, icon: Building2 },
                                                            { label: 'Rooms', value: currentValues.roomsPerFloor, icon: Home },
                                                            { label: 'Beds', value: currentValues.bedsPerRoom, icon: Bed },
                                                            { label: 'Total Guests', value: Number(currentValues.floorCount) * Number(currentValues.roomsPerFloor) * Number(currentValues.bedsPerRoom), icon: Users, highlight: true }
                                                        ].map((stat, i) => (
                                                            <div key={i} className={cn(
                                                                "p-6 rounded-[2rem] border transition-all group",
                                                                stat.highlight ? "bg-primary text-primary-foreground border-primary shadow-xl shadow-primary/20" : "bg-muted/30 border-primary/5 hover:border-primary/20"
                                                            )}>
                                                                <stat.icon className={cn("w-5 h-5 mb-4 opacity-50", stat.highlight && "opacity-100")} />
                                                                <p className="text-4xl font-black tracking-tight mb-1">{stat.value}</p>
                                                                <p className={cn("text-[10px] font-black uppercase tracking-widest opacity-60", stat.highlight && "opacity-80")}>{stat.label === 'Total Guests' ? 'Total People' : stat.label}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Payment Config */}
                                                <div className="space-y-6 pt-6 border-t border-primary/5">
                                                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Rent Settings</p>
                                                    <div className="p-6 rounded-[2rem] bg-muted/30 border border-primary/5 flex items-center justify-between">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/10">
                                                                <Zap className="w-6 h-6 text-primary" />
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-black uppercase tracking-wider">{currentValues.payeeName || 'Cash Only'}</p>
                                                                <p className="text-xs text-muted-foreground font-medium">{currentValues.upiId || 'No UPI ID provided'}</p>
                                                            </div>
                                                        </div>
                                                        <div className={cn(
                                                            "px-4 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest border",
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
                                        <div className="p-8 md:p-12 rounded-[3rem] bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-2xl shadow-emerald-500/30 relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-700" />
                                            <div className="relative flex flex-col md:flex-row items-center justify-between gap-8">
                                                <div className="space-y-4 text-center md:text-left">
                                                    <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mx-auto md:mx-0">
                                                        <Trophy className="w-8 h-8 text-white" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-2xl font-black tracking-tight">All Set!</h4>
                                                        <p className="text-white/80 font-medium max-w-md">
                                                            Click the button below to start using your PG app.
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-[10px] font-black uppercase tracking-[0.4em] opacity-50 vertical-text hidden md:block">
                                                    RentSutra v4.0
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-12 text-center text-muted-foreground/30 font-black text-[10px] uppercase tracking-[0.6em] pb-12">
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
                                activeStep === 'LAYOUT_CONFIG' ? validateLayout :
                                activeStep === 'UPI_SETUP' ? validateUPI :
                                form.handleSubmit(onPropertySubmit)
                            }
                            onBack={
                                activeStep === 'PG_DETAILS' ? () => setActiveStep('OWNER_DETAILS') :
                                activeStep === 'LAYOUT_CONFIG' ? () => setActiveStep('PG_DETAILS') :
                                activeStep === 'UPI_SETUP' ? () => setActiveStep('LAYOUT_CONFIG') :
                                activeStep === 'REVIEW_FINAL' ? () => setActiveStep('UPI_SETUP') :
                                undefined
                            }
                            showBack={activeStep !== 'OWNER_DETAILS' && activeStep !== 'ROLE_SELECTION'}
                            showNext={activeStep !== 'ROLE_SELECTION'}
                            nextLabel={
                                activeStep === 'OWNER_DETAILS' ? "Next" :
                                activeStep === 'PG_DETAILS' ? "Next" :
                                activeStep === 'LAYOUT_CONFIG' ? "Next" :
                                activeStep === 'UPI_SETUP' ? "Go to Final Step" :
                                "Start My PG App"
                            }
                            isFinal={activeStep === 'REVIEW_FINAL'}
                            isLoading={isCreating}
                        />
                    </form>
                </Form>
            </main>
        </div>
    )
}


