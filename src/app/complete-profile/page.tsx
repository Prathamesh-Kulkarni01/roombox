
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
    Minus
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
import { cn } from "@/lib/utils"

const pgSchema = z.object({
  // Owner Profile
  ownerName: z.string().min(2, "Name is required."),
  ownerPhone: z.string().min(10, "Valid 10-digit phone number is required for WhatsApp setup."),
  
  // Property Basics
  name: z.string().min(3, "Property name must be at least 3 characters."),
  location: z.string().min(3, "Location is required."),
  city: z.string().min(2, "City is required."),
  gender: z.enum(['male', 'female', 'co-ed']),
  autoSetup: z.boolean().default(true),
  floorCount: z.coerce.number().min(1).max(10).default(1),
  roomsPerFloor: z.coerce.number().min(1).max(20).default(4),
  bedsPerRoom: z.coerce.number().min(1).max(10).default(2),
})

type PgFormValues = z.infer<typeof pgSchema>

type OnboardingStep = 'ROLE' | 'PROFILE' | 'BASICS' | 'LAYOUT' | 'REVIEW'

export default function CompleteProfilePage() {
    const router = useRouter()
    const dispatch = useAppDispatch()
    const { toast } = useToast()
    const { showConfetti } = useConfetti();
    const { currentUser } = useAppSelector(state => state.user)
    const [createProperty, { isLoading: isCreating }] = useCreatePropertyMutation();
    
    const [loadingRole, setLoadingRole] = useState<'owner' | null>(null)
    const [activeStep, setActiveStep] = useState<OnboardingStep>(
        currentUser?.role === 'owner' ? 'PROFILE' : 'ROLE'
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
        },
    })

    const currentValues = form.watch();

    const progressValue = useMemo(() => {
        switch(activeStep) {
            case 'ROLE': return 20;
            case 'PROFILE': return 40;
            case 'BASICS': return 60;
            case 'LAYOUT': return 80;
            case 'REVIEW': return 100;
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
            setActiveStep('PROFILE')
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
                setActiveStep('BASICS');
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Profile Update Failed', description: error.message });
            }
        }
    }

    const validateBasics = async () => {
        const result = await form.trigger(['name', 'city', 'location', 'gender']);
        if (result) setActiveStep('LAYOUT');
    }

    const applyPreset = (floors: number, rooms: number, beds: number) => {
        form.setValue('floorCount', floors);
        form.setValue('roomsPerFloor', rooms);
        form.setValue('bedsPerRoom', beds);
        toast({ title: 'Preset Applied', description: `Building configured for ${floors} levels.` });
    }

    const validateLayout = async () => {
        const result = await form.trigger(['floorCount', 'roomsPerFloor', 'bedsPerRoom']);
        if (result) setActiveStep('REVIEW');
    }

    const onPropertySubmit = async (data: PgFormValues) => {
        if (!currentUser) return;

        try {
            const result = await createProperty({
                ownerId: currentUser.id,
                name: data.name,
                location: data.location,
                city: data.city,
                gender: data.gender === 'co-ed' ? 'co-living' : data.gender as any,
                autoSetup: data.autoSetup,
                floorCount: data.floorCount,
                roomsPerFloor: data.roomsPerFloor,
                bedsPerRoom: data.bedsPerRoom
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

    // Visual Preview Components
    const BuildingPreview = () => {
        const { floorCount, roomsPerFloor, bedsPerRoom } = currentValues;
        
        return (
            <div className="mt-4 border rounded-3xl bg-gradient-to-br from-primary/5 via-background to-primary/5 p-8 overflow-hidden relative group shadow-inner">
                <div className="absolute top-6 right-6 bg-primary/20 backdrop-blur-md border border-primary/20 px-4 py-1.5 rounded-full flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Live Blueprint</span>
                </div>

                <div className="flex flex-col-reverse gap-4 items-center">
                    {Array.from({ length: Math.min(Number(floorCount), 4) }).map((_, fIdx) => (
                        <div 
                            key={fIdx} 
                            className="flex gap-3 p-4 rounded-2xl border border-primary/10 bg-background/80 backdrop-blur-xl w-full max-w-md shadow-lg transition-all hover:scale-[1.02] hover:border-primary/30"
                            style={{ 
                                animation: 'slideUp 0.5s ease-out forwards',
                                animationDelay: `${fIdx * 100}ms`
                             }}
                        >
                            <div className="flex flex-col items-center justify-center gap-1 w-12 h-12 rounded-xl bg-primary/10 border border-primary/10 shrink-0">
                                <span className="text-[10px] font-black text-primary/60 leading-none">FLR</span>
                                <span className="text-lg font-black text-primary leading-none">{fIdx + 1}</span>
                            </div>
                            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 flex-1">
                                {Array.from({ length: Math.min(Number(roomsPerFloor), 6) }).map((_, rIdx) => (
                                    <div key={rIdx} className="aspect-square rounded-lg bg-primary/5 border border-primary/10 flex flex-col items-center justify-center gap-1 group/room hover:bg-primary/10 transition-colors">
                                        <Home className="w-3 h-3 text-primary/40 group-hover/room:text-primary transition-colors" />
                                        <div className="flex flex-wrap justify-center gap-0.5 px-1">
                                            {Array.from({ length: Math.min(Number(bedsPerRoom), 4) }).map((_, bIdx) => (
                                                <div key={bIdx} className="w-1.5 h-1.5 rounded-full bg-primary/30 shadow-[0_0_5px_rgba(var(--primary),0.2)]" />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                {Number(roomsPerFloor) > 6 && (
                                    <div className="aspect-square rounded-lg border border-dashed border-primary/20 flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                                        +{Number(roomsPerFloor) - 6}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {Number(floorCount) > 4 && (
                        <div className="text-xs text-primary/40 font-bold tracking-widest uppercase py-2 animate-pulse">
                            + {Number(floorCount) - 4} Additional Floors
                        </div>
                    )}
                </div>

                <div className="mt-8 pt-6 border-t border-primary/10 flex justify-between px-4">
                    <div className="text-center">
                        <div className="text-2xl font-black text-primary leading-none">{Number(floorCount)}</div>
                        <div className="text-[10px] uppercase text-muted-foreground font-black tracking-widest mt-1">Levels</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-black text-primary leading-none">{Number(floorCount) * Number(roomsPerFloor)}</div>
                        <div className="text-[10px] uppercase text-muted-foreground font-black tracking-widest mt-1">Suites</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-black text-primary leading-none">{Number(floorCount) * Number(roomsPerFloor) * Number(bedsPerRoom)}</div>
                        <div className="text-[10px] uppercase text-muted-foreground font-black tracking-widest mt-1">Total Capacity</div>
                    </div>
                </div>

                <style jsx>{`
                    @keyframes slideUp {
                        from { opacity: 0; transform: translateY(20px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                `}</style>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background selection:bg-primary/10 flex flex-col">
            {/* Nav Progress */}
            <div className="sticky top-0 left-0 right-0 z-50 bg-background/60 backdrop-blur-2xl border-b border-primary/5">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20 rotate-3">
                            <Rocket className="w-6 h-6 text-primary-foreground -rotate-3" />
                        </div>
                        <div>
                            <span className="font-black text-xl tracking-tighter block leading-none">RentSutra</span>
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary leading-none mt-1 block">Property Cloud</span>
                        </div>
                    </div>
                    
                    <div className="hidden md:flex items-center gap-10">
                        <StepIndicator active={activeStep === 'ROLE'} completed={activeStep !== 'ROLE'} label="Identity" index={1} />
                        <div className="w-8 h-[2px] bg-muted/20" />
                        <StepIndicator active={activeStep === 'PROFILE'} completed={['BASICS', 'LAYOUT', 'REVIEW'].includes(activeStep)} label="Owner Profile" index={2} />
                        <div className="w-8 h-[2px] bg-muted/20" />
                        <StepIndicator active={activeStep === 'BASICS'} completed={['LAYOUT', 'REVIEW'].includes(activeStep)} label="Business" index={3} />
                        <div className="w-8 h-[2px] bg-muted/20" />
                        <StepIndicator active={activeStep === 'LAYOUT'} completed={activeStep === 'REVIEW'} label="Architecture" index={4} />
                        <div className="w-8 h-[2px] bg-muted/20" />
                        <StepIndicator active={activeStep === 'REVIEW'} completed={false} label="Ignition" index={5} />
                    </div>

                    <div className="w-24 md:hidden">
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progressValue}%` }} />
                        </div>
                    </div>
                </div>
            </div>

            <main className="flex-1 flex flex-col items-center justify-center py-12 px-6">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onPropertySubmit)} className="w-full max-w-4xl">
                        
                        {/* STEP 1: ROLE SELECTION */}
                        {activeStep === 'ROLE' && (
                            <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                                <div className="text-center space-y-6 mb-16">
                                    <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-xs font-black uppercase tracking-[0.2em] animate-bounce">
                                        <Trophy className="w-4 h-4" /> Start Your Journey
                                    </div>
                                    <h1 className="text-5xl md:text-7xl font-black tracking-tight text-foreground leading-[1.1]">
                                        Design your <br />
                                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary/80 to-primary/40">Real Estate future.</span>
                                    </h1>
                                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed font-medium">
                                        Choose your path below. Most owners manage multiple properties and hundreds of tenants on RentSutra.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
                                    <div 
                                        className={cn(
                                            "relative overflow-hidden cursor-pointer group transition-all duration-500 rounded-[2.5rem] border-2 p-8",
                                            loadingRole === 'owner' ? "border-primary bg-primary/5 ring-4 ring-primary/10" : "border-primary/10 bg-card hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/5"
                                        )}
                                        onClick={handleOwnerSetup}
                                    >
                                        <div className="relative z-10 flex flex-col h-full">
                                            <div className="w-16 h-16 rounded-[1.5rem] bg-primary flex items-center justify-center mb-8 shadow-xl shadow-primary/20 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                                                {loadingRole === 'owner' ? <Loader2 className="w-8 h-8 text-primary-foreground animate-spin" /> : <Building2 className="w-8 h-8 text-primary-foreground" />}
                                            </div>
                                            <h3 className="text-3xl font-black mb-3">Owner</h3>
                                            <p className="text-muted-foreground font-medium mb-8 flex-1">
                                                Complete suite for managing rooms, finances, staff and automated tenant billing.
                                            </p>
                                            <div className="flex items-center gap-2 text-primary font-black uppercase tracking-widest text-xs">
                                                Launch Setup <ChevronRight className="w-4 h-4" />
                                            </div>
                                        </div>
                                        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-primary/5 rounded-full blur-[100px] group-hover:bg-primary/20 transition-all duration-700" />
                                    </div>

                                    <div className="relative overflow-hidden rounded-[2.5rem] border-2 border-dashed border-muted-foreground/20 p-8 opacity-60 hover:opacity-100 transition-all duration-500 grayscale hover:grayscale-0">
                                        <div className="flex flex-col h-full">
                                            <div className="w-16 h-16 rounded-[1.5rem] bg-muted flex items-center justify-center mb-8">
                                                <Users className="w-8 h-8 text-muted-foreground" />
                                            </div>
                                            <h3 className="text-3xl font-black mb-3 text-muted-foreground">Tenant</h3>
                                            <p className="text-sm text-muted-foreground font-medium mb-8 flex-1 leading-relaxed">
                                                Access requires an invitation from your property owner. Check your WhatsApp/SMS for the link.
                                            </p>
                                            <div className="flex items-center gap-2 text-muted-foreground font-black uppercase tracking-widest text-xs">
                                                How it works <Info className="w-4 h-4" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STEP 2: PROFILE DETAILS */}
                        {activeStep === 'PROFILE' && (
                            <div className="animate-in fade-in slide-in-from-right-12 duration-700 max-w-2xl mx-auto w-full pb-32 md:pb-0">
                                <div className="space-y-4 mb-12 text-center">
                                    <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">
                                        Phase 01 / 04
                                    </div>
                                    <h2 className="text-4xl md:text-5xl font-black">About You</h2>
                                    <p className="text-muted-foreground text-lg font-medium px-4">Let's set up your owner profile.</p>
                                </div>

                                <Card className="border-primary/10 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] rounded-[2rem] overflow-hidden">
                                    <CardContent className="pt-6 md:pt-10 px-6 md:px-10 pb-6 md:pb-2 space-y-8">
                                        <FormField
                                            control={form.control}
                                            name="ownerName"
                                            render={({ field }) => (
                                                <FormItem className="space-y-3">
                                                    <FormLabel className="text-sm font-black uppercase tracking-widest text-muted-foreground">Full Name</FormLabel>
                                                    <FormControl>
                                                        <div className="relative group">
                                                            <UserCircle className="absolute left-4 top-4 w-6 h-6 text-muted-foreground transition-colors group-focus-within:text-primary" />
                                                            <Input placeholder="e.g. John Doe" className="h-14 pl-12 text-xl font-bold bg-muted/30 border-none ring-offset-background focus-visible:ring-2 focus-visible:ring-primary rounded-2xl" {...field} />
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
                                                    <FormLabel className="text-sm font-black uppercase tracking-widest text-muted-foreground">WhatsApp / Phone Number</FormLabel>
                                                    <FormControl>
                                                        <div className="relative group">
                                                            <Phone className="absolute left-4 top-4 w-5 h-5 text-muted-foreground group-focus-within:text-primary" />
                                                            <Input 
                                                                placeholder="e.g. 9876543210" 
                                                                className="h-14 pl-12 font-bold bg-muted/30 border-none rounded-2xl" 
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
                                    <CardFooter className="bg-background/95 backdrop-blur-xl md:bg-muted/10 flex justify-between p-4 md:p-10 pt-4 md:pt-8 fixed bottom-0 left-0 right-0 md:static border-t border-border/50 md:border-none z-50 pb-6 md:pb-8">
                                        <Button variant="ghost" type="button" onClick={() => setActiveStep('ROLE')} className="font-bold uppercase tracking-widest text-xs hidden md:flex">Back</Button>
                                        <Button type="button" onClick={validateProfile} size="lg" className="w-full md:w-auto px-10 h-14 rounded-2xl font-black uppercase tracking-widest text-xs gap-3 shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
                                            Continue <ChevronRight className="w-5 h-5" />
                                        </Button>
                                    </CardFooter>
                                </Card>
                            </div>
                        )}

                        {/* STEP 3: PROPERTY BASICS */}
                        {activeStep === 'BASICS' && (
                            <div className="animate-in fade-in slide-in-from-right-12 duration-700 max-w-2xl mx-auto w-full pb-32 md:pb-0">
                                <div className="space-y-4 mb-12 text-center">
                                    <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">
                                        Phase 02 / 04
                                    </div>
                                    <h2 className="text-4xl md:text-5xl font-black">Identity & Presence</h2>
                                    <p className="text-muted-foreground text-lg font-medium px-4">How should the world (and your tenants) see your property?</p>
                                </div>

                                <Card className="border-primary/10 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] rounded-[2rem] overflow-hidden">
                                    <CardContent className="pt-6 md:pt-10 px-6 md:px-10 pb-6 md:pb-2 space-y-8">
                                        <FormField
                                            control={form.control}
                                            name="name"
                                            render={({ field }) => (
                                                <FormItem className="space-y-3">
                                                    <FormLabel className="text-sm font-black uppercase tracking-widest text-muted-foreground">The Brand Name</FormLabel>
                                                    <FormControl>
                                                        <div className="relative group">
                                                            <Building className="absolute left-4 top-4 w-6 h-6 text-muted-foreground transition-colors group-focus-within:text-primary" />
                                                            <Input placeholder="e.g., Skyview Luxury Residency" className="h-14 pl-12 text-xl font-bold bg-muted/30 border-none ring-offset-background focus-visible:ring-2 focus-visible:ring-primary rounded-2xl" {...field} />
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
                                                        <FormLabel className="text-sm font-black uppercase tracking-widest text-muted-foreground">Global City</FormLabel>
                                                        <FormControl>
                                                            <div className="relative group">
                                                                <Globe className="absolute left-4 top-4 w-5 h-5 text-muted-foreground group-focus-within:text-primary" />
                                                                <Input placeholder="e.g. Pune" className="h-14 pl-12 font-bold bg-muted/30 border-none rounded-2xl" {...field} />
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
                                                        <FormLabel className="text-sm font-black uppercase tracking-widest text-muted-foreground">Demographics</FormLabel>
                                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                            <FormControl>
                                                                <SelectTrigger className="h-14 font-bold bg-muted/30 border-none rounded-2xl px-6">
                                                                    <SelectValue placeholder="Gender" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent className="rounded-2xl border-primary/10">
                                                                <SelectItem value="co-ed" className="font-bold py-3">Co-living / All</SelectItem>
                                                                <SelectItem value="male" className="font-bold py-3">Male Exclusive</SelectItem>
                                                                <SelectItem value="female" className="font-bold py-3">Female Exclusive</SelectItem>
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
                                                    <FormLabel className="text-sm font-black uppercase tracking-widest text-muted-foreground">Micro-Location / Landmark</FormLabel>
                                                    <FormControl>
                                                        <div className="relative group">
                                                            <MapPin className="absolute left-4 top-4 w-5 h-5 text-muted-foreground group-focus-within:text-primary" />
                                                            <Input placeholder="e.g. Opposite Phoenix Mall, Viman Nagar" className="h-14 pl-12 font-bold bg-muted/30 border-none rounded-2xl" {...field} />
                                                        </div>
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </CardContent>
                                    <CardFooter className="bg-background/95 backdrop-blur-xl md:bg-muted/10 flex justify-between p-4 md:p-10 pt-4 md:pt-8 fixed bottom-0 left-0 right-0 md:static border-t border-border/50 md:border-none z-50 pb-6 md:pb-8">
                                        <Button variant="ghost" type="button" onClick={() => setActiveStep('PROFILE')} className="font-bold uppercase tracking-widest text-xs hidden md:flex">Back</Button>
                                        <Button type="button" onClick={validateBasics} size="lg" className="w-full md:w-auto px-10 h-14 rounded-2xl font-black uppercase tracking-widest text-xs gap-3 shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
                                            Configure Layout <ChevronRight className="w-5 h-5" />
                                        </Button>
                                    </CardFooter>
                                </Card>
                            </div>
                        )}

                        {/* STEP 4: SMART LAYOUT */}
                        {activeStep === 'LAYOUT' && (
                            <div className="animate-in fade-in slide-in-from-right-12 duration-700 w-full pb-32 md:pb-0">
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                                    <div className="lg:col-span-5 space-y-10 px-4 md:px-0">
                                        <div className="space-y-4">
                                            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">
                                                Phase 03 / 04
                                            </div>
                                            <h2 className="text-4xl font-black tracking-tight">Smart Architecture</h2>
                                            <p className="text-muted-foreground font-medium leading-relaxed">
                                                RentSutra automatically generates your entire building structure. Adjust the sliders or use a preset.
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-1 gap-4">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Quick Config Presets</p>
                                            <div className="flex flex-wrap gap-2">
                                                <Button type="button" variant="outline" size="sm" onClick={() => applyPreset(2, 4, 2)} className="rounded-xl font-bold gap-2">
                                                    <Building className="w-4 h-4" /> Small PG
                                                </Button>
                                                <Button type="button" variant="outline" size="sm" onClick={() => applyPreset(4, 6, 2)} className="rounded-xl font-bold gap-2">
                                                    <Layout className="w-4 h-4" /> Large Hostel
                                                </Button>
                                                <Button type="button" variant="outline" size="sm" onClick={() => applyPreset(1, 4, 1)} className="rounded-xl font-bold gap-2">
                                                    <Home className="w-4 h-4" /> Apartment
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="space-y-8">
                                            <div className="space-y-6">
                                                <FormField
                                                    control={form.control}
                                                    name="floorCount"
                                                    render={({ field }) => (
                                                        <FormItem className="space-y-4">
                                                            <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Floor Volume</FormLabel>
                                                            <FormControl>
                                                                <div className="flex items-center justify-between gap-4 bg-muted/30 p-2 rounded-2xl border border-border/50">
                                                                    <Button type="button" variant="ghost" size="icon" className="h-12 w-12 rounded-xl shrink-0 hover:bg-background shadow-sm" onClick={() => field.onChange(Math.max(1, field.value - 1))}>
                                                                        <Minus className="w-5 h-5" />
                                                                    </Button>
                                                                    <div className="flex-1 text-center text-3xl font-black text-primary select-none">{field.value}</div>
                                                                    <Button type="button" variant="ghost" size="icon" className="h-12 w-12 rounded-xl shrink-0 hover:bg-background shadow-sm" onClick={() => field.onChange(Math.min(10, field.value + 1))}>
                                                                        <Plus className="w-5 h-5" />
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
                                                            <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Rooms per Level</FormLabel>
                                                            <FormControl>
                                                                <div className="flex items-center justify-between gap-4 bg-muted/30 p-2 rounded-2xl border border-border/50">
                                                                    <Button type="button" variant="ghost" size="icon" className="h-12 w-12 rounded-xl shrink-0 hover:bg-background shadow-sm" onClick={() => field.onChange(Math.max(1, field.value - 1))}>
                                                                        <Minus className="w-5 h-5" />
                                                                    </Button>
                                                                    <div className="flex-1 text-center text-3xl font-black text-primary select-none">{field.value}</div>
                                                                    <Button type="button" variant="ghost" size="icon" className="h-12 w-12 rounded-xl shrink-0 hover:bg-background shadow-sm" onClick={() => field.onChange(Math.min(20, field.value + 1))}>
                                                                        <Plus className="w-5 h-5" />
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
                                                            <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Bed Count / Room</FormLabel>
                                                            <FormControl>
                                                                <div className="flex items-center justify-between gap-4 bg-muted/30 p-2 rounded-2xl border border-border/50">
                                                                    <Button type="button" variant="ghost" size="icon" className="h-12 w-12 rounded-xl shrink-0 hover:bg-background shadow-sm" onClick={() => field.onChange(Math.max(1, field.value - 1))}>
                                                                        <Minus className="w-5 h-5" />
                                                                    </Button>
                                                                    <div className="flex-1 text-center text-3xl font-black text-primary select-none">{field.value}</div>
                                                                    <Button type="button" variant="ghost" size="icon" className="h-12 w-12 rounded-xl shrink-0 hover:bg-background shadow-sm" onClick={() => field.onChange(Math.min(10, field.value + 1))}>
                                                                        <Plus className="w-5 h-5" />
                                                                    </Button>
                                                                </div>
                                                            </FormControl>
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>

                                            <div className="bg-background/95 backdrop-blur-xl md:bg-transparent flex justify-between p-4 md:p-0 fixed bottom-0 left-0 right-0 md:static border-t border-border/50 md:border-none z-50 pb-6 md:pb-0 md:pt-10">
                                                <Button variant="ghost" type="button" onClick={() => setActiveStep('BASICS')} className="font-bold uppercase tracking-widest text-xs hidden md:flex">Back</Button>
                                                <Button type="button" onClick={validateLayout} size="lg" className="w-full md:w-auto px-10 h-14 rounded-2xl font-black uppercase tracking-widest text-xs gap-3 shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
                                                    Final Review <ChevronRight className="w-5 h-5" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="lg:col-span-7 px-4 md:px-0">
                                        <BuildingPreview />
                                        <div className="mt-8 p-6 rounded-[2rem] bg-card border border-primary/10 flex gap-4 shadow-xl shadow-primary/5">
                                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                                <Info className="w-5 h-5 text-primary" />
                                            </div>
                                            <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                                                <strong className="text-foreground block mb-1">Scale as you Grow</strong>
                                                This setup creates a standardized layout. You can granularly customize specific rooms, naming, and pricing from your property settings after launch.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STEP 5: REVIEW & LAUNCH */}
                        {activeStep === 'REVIEW' && (
                            <div className="animate-in zoom-in-95 duration-700 max-w-2xl mx-auto w-full pb-32 md:pb-0">
                                <div className="text-center space-y-6 mb-12 px-4 md:px-0">
                                    <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-tr from-primary to-primary/60 flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-primary/30 animate-pulse rotate-6">
                                        <CheckCircle2 className="w-14 h-14 text-primary-foreground" />
                                    </div>
                                    <h2 className="text-5xl font-black tracking-tight">Systems Check.</h2>
                                    <p className="text-muted-foreground text-xl font-medium leading-relaxed">Everything is ready for your property launch. <br className="hidden md:block" />Finalize the details below.</p>
                                </div>

                                <Card className="border-none shadow-[0_40px_100px_-20px_rgba(0,0,0,0.15)] rounded-[2rem] md:rounded-[3rem] relative overflow-hidden bg-card mx-4 md:mx-0">
                                    <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 rotate-12 pointer-events-none hidden md:block">
                                        <Building className="w-64 h-64" />
                                    </div>
                                    
                                    <CardContent className="pt-8 md:pt-12 px-6 md:px-12 pb-4 relative z-10 space-y-10">
                                        <div className="space-y-8">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mb-3">Operating As</p>
                                                    <h3 className="text-4xl font-black tracking-tighter text-primary">{currentValues.name}</h3>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mb-3">Stationed In</p>
                                                    <div className="flex items-center justify-end gap-2 text-xl font-black">
                                                        <MapPin className="w-5 h-5 text-primary" />
                                                        {currentValues.city}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-3 gap-2 md:gap-6">
                                                <div className="p-4 md:p-6 rounded-2xl md:rounded-[2rem] bg-muted/40 text-center border border-primary/5 transition-transform hover:scale-105">
                                                    <p className="text-[9px] md:text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 md:mb-2">Structure</p>
                                                    <p className="text-3xl font-black text-primary leading-none">{currentValues.floorCount}</p>
                                                    <p className="text-[10px] font-bold text-muted-foreground mt-1">Floors</p>
                                                </div>
                                                <div className="p-4 md:p-6 rounded-2xl md:rounded-[2rem] bg-muted/40 text-center border border-primary/5 transition-transform hover:scale-105">
                                                    <p className="text-[9px] md:text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 md:mb-2">Inventory</p>
                                                    <p className="text-3xl font-black text-primary leading-none">{Number(currentValues.floorCount) * Number(currentValues.roomsPerFloor)}</p>
                                                    <p className="text-[10px] font-bold text-muted-foreground mt-1">Rooms</p>
                                                </div>
                                                <div className="p-4 md:p-6 rounded-2xl md:rounded-[2rem] bg-muted/40 text-center border border-primary/5 transition-transform hover:scale-105">
                                                    <p className="text-[9px] md:text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 md:mb-2">Beds</p>
                                                    <p className="text-3xl font-black text-primary leading-none">{Number(currentValues.floorCount) * Number(currentValues.roomsPerFloor) * Number(currentValues.bedsPerRoom)}</p>
                                                    <p className="text-[10px] font-bold text-muted-foreground mt-1">Units</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4 p-6 rounded-[2rem] border-2 border-primary/5 bg-primary/5">
                                                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                                                    <Globe className="w-5 h-5 text-primary" />
                                                </div>
                                                <p className="text-sm font-bold text-muted-foreground italic leading-relaxed">
                                                    Located at {currentValues.location}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="pt-6 space-y-4 bg-background/95 backdrop-blur-xl md:bg-transparent p-4 md:p-0 fixed bottom-0 left-0 right-0 md:static border-t border-border/50 md:border-none z-50 pb-6 md:pb-0">
                                            <Button 
                                                type="submit" 
                                                size="lg" 
                                                className="w-full h-16 md:h-20 rounded-2xl md:rounded-[2rem] text-xl md:text-2xl font-black tracking-tight shadow-[0_20px_50px_-10px_rgba(var(--primary),0.5)] transition-all hover:scale-[1.03] active:scale-[0.97] group"
                                                disabled={isCreating}
                                            >
                                                {isCreating ? (
                                                    <div className="flex items-center gap-4">
                                                        <Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin" />
                                                        <span className="uppercase tracking-[0.2em] text-xs md:text-sm">Synchronizing Systems...</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-center gap-3 md:gap-4">
                                                        <Rocket className="w-6 h-6 md:w-8 md:h-8 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                                        <span>LAUNCH DASHBOARD</span>
                                                    </div>
                                                )}
                                            </Button>

                                            <Button variant="ghost" type="button" className="w-full h-12 rounded-xl font-bold uppercase tracking-[0.2em] text-[10px] text-muted-foreground hidden md:flex" onClick={() => setActiveStep('LAYOUT')}>
                                                Recalibrate Layout
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>

                                <div className="mt-12 text-center text-muted-foreground/40 font-black text-[10px] uppercase tracking-[0.5em]">
                                    RentSutra Property Engine v4.0 • Secure Cloud
                                </div>
                            </div>
                        )}
                    </form>
                </Form>
            </main>
        </div>
    )
}

function OnboardingAssistant({ title, message }: { title: string, message: string }) {
    return (
        <div className="mt-8 p-6 rounded-[2rem] bg-primary/5 border border-primary/10 flex gap-4 shadow-xl shadow-primary/5 animate-in slide-in-from-bottom-4 duration-1000">
            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
                <Sparkles className="w-6 h-6 text-primary-foreground" />
            </div>
            <div className="space-y-1">
                <h4 className="font-black text-sm uppercase tracking-widest text-primary flex items-center gap-2">
                    RentSutra Assistant <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                </h4>
                <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                    <strong className="text-foreground">{title}:</strong> {message}
                </p>
            </div>
        </div>
    )
}

function StepIndicator({ active, completed, label, index }: { active: boolean, completed: boolean, label: string, index: number }) {
    return (
        <div className={cn(
            "flex items-center gap-4 transition-all duration-500",
            active ? "opacity-100 scale-110" : "opacity-30"
        )}>
            <div className={cn(
                "w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-black border-2 transition-all duration-500 shadow-lg shadow-transparent",
                completed ? "bg-primary border-primary text-primary-foreground rotate-[15deg]" : 
                active ? "border-primary text-primary shadow-primary/10 -rotate-3" : "border-muted-foreground/30 text-muted-foreground"
            )}>
                {completed ? <Check className="w-6 h-6 -rotate-[15deg]" /> : index}
            </div>
            <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground leading-none mb-1">Step 0{index}</span>
                <span className={cn(
                    "text-sm font-black tracking-tight leading-none",
                    active ? "text-foreground" : "text-muted-foreground"
                )}>
                    {label}
                </span>
            </div>
        </div>
    )
}
