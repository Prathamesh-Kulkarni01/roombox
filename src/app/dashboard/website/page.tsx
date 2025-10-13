

'use client'

import React, { useEffect, useState, useMemo, useTransition } from 'react';
import { useForm, useFieldArray, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Image from 'next/image';
import Link from 'next/link';
import { notFound, useSearchParams } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '@/lib/hooks'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ShieldAlert, Globe, Link as LinkIcon, Save, Eye, Loader2, Pencil, Trash2, Share2, Power, PowerOff, GripVertical, Plus, Minus, Palette, AppWindow, Brush, Copy, QrCode } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { saveSiteConfig, getSiteConfigForOwner, deleteSiteConfig, updateSiteStatus, type SiteConfig } from '@/lib/actions/siteActions'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import SubscriptionDialog from '@/components/dashboard/dialogs/SubscriptionDialog'
import { uploadDataUriToStorage } from '@/lib/storage'
import { FileUp } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import InstallPWA from '@/components/install-pwa';

const featureSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  description: z.string().min(1, 'Description is required.'),
});

const faqSchema = z.object({
  q: z.string().min(1, 'Question is required.'),
  a: z.string().min(1, 'Answer is required.'),
});

const testimonialSchema = z.object({
  quote: z.string().min(1, 'Quote is required.'),
  author: z.string().min(1, 'Author is required.'),
});

const websiteConfigSchema = z.object({
  subdomain: z.string().min(3, 'Subdomain must be at least 3 characters').regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, and hyphens are allowed.'),
  siteTitle: z.string().min(5, 'Site title is too short.'),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email('Invalid email address.').optional(),
  logoUrl: z.string().url().optional(),
  faviconUrl: z.string().url().optional(),
  themeColor: z.string().regex(/^#([0-9a-f]{3}){1,2}$/i, 'Must be a valid hex color').optional().or(z.literal('')),
  listedPgs: z.array(z.string()).refine(value => value.some(item => item), {
    message: "You must select at least one property to display.",
  }),
  status: z.enum(['published', 'draft', 'suspended']).optional(),
  heroHeadline: z.string().min(1, "Hero headline is required."),
  heroSubtext: z.string().min(1, "Hero subtext is required."),
  aboutTitle: z.string().min(1, "About title is required."),
  aboutDescription: z.string().min(1, "About description is required."),
  featuresTitle: z.string().min(1, "Features title is required."),
  featuresDescription: z.string().min(1, "Features description is required."),
  features: z.array(featureSchema).optional(),
  faqs: z.array(faqSchema).optional(),
  testimonials: z.array(testimonialSchema).optional(),
});

type WebsiteConfigFormValues = z.infer<typeof websiteConfigSchema>;

export default function WebsiteBuilderPage() {
    const { pgs, currentUser } = useAppSelector(state => ({ pgs: state.pgs.pgs, currentUser: state.user.currentUser }))
    const { currentPlan } = useAppSelector(state => state.user)
    const { isLoading: isAppLoading } = useAppSelector(state => state.app)
    
    const [siteConfig, setSiteConfig] = useState<SiteConfig | null>(null);
    const [viewMode, setViewMode] = useState<'loading' | 'ready'>('loading');
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isSubDialogOpen, setIsSubDialogOpen] = useState(false);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [faviconPreview, setFaviconPreview] = useState<string | null>(null);

    const [domain, setDomain] = useState('');
    const [isSaving, startTransition] = useTransition();
    const { toast } = useToast();

    useEffect(() => {
        setDomain(process.env.NEXT_PUBLIC_SITE_DOMAIN || 'rentsutra.netlify.app');
    }, [])

    const form = useForm<WebsiteConfigFormValues>({
        resolver: zodResolver(websiteConfigSchema),
        mode: 'onChange'
    });
    
    const subdomainValue = form.watch('subdomain');
    const siteTitleValue = form.watch('siteTitle');
    const faviconValue = form.watch('faviconUrl');

    const appUrl = useMemo(() => {
        const subdomain = siteConfig?.subdomain || subdomainValue;
        if (!subdomain) return '';
        // Use a placeholder for the origin if window is not available
        const origin = typeof window !== 'undefined' ? window.location.origin : `https://${domain}`;
        return `${origin}/site/${subdomain}`;
    }, [subdomainValue, siteConfig, domain]);
    
    const siteUrl = useMemo(() => {
        if (!appUrl) return '';
        return `${appUrl}?preview=true`;
    }, [appUrl]);

    const fetchConfig = async () => {
        if (!currentUser) return;
        setViewMode('loading');
        const config = await getSiteConfigForOwner(currentUser.id);
        if (config) {
            setSiteConfig(config);
            form.reset(config);
            setLogoPreview(config.logoUrl || null);
            setFaviconPreview(config.faviconUrl || null);
        } else {
            form.reset({
                siteTitle: `${currentUser.name || 'My'}'s Properties`,
                contactEmail: currentUser.email || '',
                listedPgs: pgs.map(p => p.id),
                heroHeadline: `Welcome to ${currentUser.name || 'Our'} PG`,
                heroSubtext: "Comfortable & Hassle-Free Living.",
                aboutTitle: "A Better Way to Live",
                aboutDescription: `We’re a trusted PG management company with properties across ${pgs[0]?.city || 'the city'}. Our mission is to simplify shared living.`,
                featuresTitle: "Everything You Need Under One Roof",
                featuresDescription: "We provide top-notch facilities to ensure a comfortable stay.",
                features: [], faqs: [], testimonials: [], subdomain: '', contactPhone: '', logoUrl: '', faviconUrl: '', themeColor: '',
            });
        }
        setViewMode('ready');
    };
    
    useEffect(() => {
        if (!isAppLoading && currentUser) {
            fetchConfig();
        }
    }, [isAppLoading, currentUser?.id]);

    const handleImageUpload = async (file: File, type: 'logo' | 'favicon') => {
        if (!currentUser) return;
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = async () => {
            const dataUri = reader.result as string;
            if (type === 'logo') setLogoPreview(dataUri);
            if (type === 'favicon') setFaviconPreview(dataUri);
            try {
                const url = await uploadDataUriToStorage(dataUri, `sites/${currentUser.id}/${type}`);
                form.setValue(type === 'logo' ? 'logoUrl' : 'faviconUrl', url, { shouldValidate: true });
                toast({ title: `${type.charAt(0).toUpperCase() + type.slice(1)} Uploaded`, description: "Click save to apply changes." });
            } catch (error) {
                toast({ variant: 'destructive', title: 'Upload Failed', description: "Could not upload the image." });
                 if (type === 'logo') setLogoPreview(siteConfig?.logoUrl || null);
                 if (type === 'favicon') setFaviconPreview(siteConfig?.faviconUrl || null);
            }
        };
    };

    const { fields: featureFields, append: appendFeature, remove: removeFeature } = useFieldArray({ control: form.control, name: "features" });
    const { fields: faqFields, append: appendFaq, remove: removeFaq } = useFieldArray({ control: form.control, name: "faqs" });
    const { fields: testimonialFields, append: appendTestimonial, remove: removeTestimonial } = useFieldArray({ control: form.control, name: "testimonials" });

    const onSubmit = (data: WebsiteConfigFormValues, status: 'draft' | 'published') => {
        if (!currentUser) {
            toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to save settings.'});
            return;
        }

        startTransition(async () => {
            const result = await saveSiteConfig({ ...data, status, ownerId: currentUser.id, existingSubdomain: siteConfig?.subdomain });
            if (result.success && result.config) {
                toast({ title: 'Success!', description: `Your website has been ${status === 'published' ? 'published' : 'saved as a draft'}.`});
                setSiteConfig(result.config);
                form.reset(result.config);
                setLogoPreview(result.config.logoUrl || null);
                setFaviconPreview(result.config.faviconUrl || null);
            } else {
                if (result.errorField === 'subdomain') {
                    form.setError('subdomain', { type: 'manual', message: result.error });
                } else {
                    toast({ variant: 'destructive', title: 'Error', description: result.error});
                }
            }
        });
    }

    const handleDelete = async () => {
        if (!siteConfig) return;
        setIsDeleting(true);
        const result = await deleteSiteConfig(siteConfig.subdomain);
        if (result.success) {
            toast({ title: 'Success', description: 'Your public website has been deleted.' });
            setSiteConfig(null);
            fetchConfig(); // re-fetch to set default values
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
        setIsDeleting(false);
        setIsDeleteDialogOpen(false);
    }
    
    const handleStatusToggle = async () => {
        if (!siteConfig) return;
        const newStatus = siteConfig.status === 'published' ? 'suspended' : 'published';
        
        startTransition(async () => {
            const result = await updateSiteStatus(siteConfig.subdomain, newStatus);
            if (result.success && result.config) {
                setSiteConfig(result.config);
                toast({
                    title: `Website ${newStatus === 'published' ? 'Live' : 'Suspended'}`,
                    description: `Your website is now ${newStatus}.`,
                });
            } else {
                toast({ variant: 'destructive', title: 'Error', description: result.error });
            }
        });
    }

    const handleShare = async () => {
        if (!appUrl) return;
        const urlToShare = appUrl.replace('?preview=true','');
        try {
            if (navigator.share) {
                await navigator.share({
                    title: siteConfig?.siteTitle || 'My Property',
                    text: `Check out my property: ${siteConfig?.siteTitle}`,
                    url: urlToShare,
                });
            } else {
                await navigator.clipboard.writeText(urlToShare);
                toast({ title: 'Copied to Clipboard', description: 'Website URL copied.' });
            }
        } catch (error) {
            console.error('Error sharing:', error);
            await navigator.clipboard.writeText(urlToShare);
            toast({ title: 'Copied to Clipboard', description: 'Website URL copied.' });
        }
    };
    
    if (viewMode === 'loading' || isAppLoading) {
        return (
             <div className="space-y-6">
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-4 w-2/3" />
                <Card><CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent></Card>
             </div>
        )
    }
    
    if (currentPlan && !currentPlan.hasWebsiteBuilder) {
        return (
            <>
                <SubscriptionDialog open={isSubDialogOpen} onOpenChange={setIsSubDialogOpen} />
                <Card>
                    <CardHeader>
                        <CardTitle>App & Website Builder</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col items-center justify-center text-center p-8 bg-muted/50 rounded-lg border">
                            <ShieldAlert className="mx-auto h-12 w-12 text-primary" />
                            <h2 className="mt-4 text-xl font-semibold">Feature Not Available</h2>
                            <p className="mt-2 text-muted-foreground max-w-sm">The Website Builder is a premium feature. Please upgrade your plan to create a public website for your properties.</p>
                            <Button className="mt-4" onClick={() => setIsSubDialogOpen(true)}>Upgrade Plan</Button>
                        </div>
                    </CardContent>
                </Card>
            </>
       )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Globe/> App & Website Builder
                </CardTitle>
                <CardDescription>
                    {siteConfig 
                        ? "Manage your brand, PWA, and public-facing website." 
                        : "Create a public website and branded app for your properties."
                    }
                </CardDescription>
            </CardHeader>
            <CardContent>
                {siteConfig && (
                    <div className="space-y-4 mb-6 p-4 border rounded-lg bg-muted/40">
                         <Alert>
                            <LinkIcon className="h-4 w-4" />
                            <AlertTitle>Your Website URL</AlertTitle>
                            <AlertDescription>
                                <a href={appUrl.replace('?preview=true','')} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-mono text-sm break-all">{appUrl.replace('?preview=true','')}</a>
                            </AlertDescription>
                        </Alert>
                        <div className="flex items-center justify-between flex-wrap gap-4">
                            <div className="flex items-center space-x-2">
                                <Switch id="site-status" checked={siteConfig.status === 'published'} onCheckedChange={handleStatusToggle} disabled={isSaving}/>
                                <Label htmlFor="site-status" className="flex items-center gap-1.5">
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : siteConfig.status === 'published' ? <Power className="w-4 h-4 text-green-500" /> : <PowerOff className="w-4 h-4 text-red-500" />}
                                    {isSaving ? 'Updating...' : siteConfig.status === 'published' ? 'Live' : 'Suspended'}
                                </Label>
                            </div>
                             <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={handleShare}><Share2 className="mr-2 h-4 w-4" />Share</Button>
                                <Dialog>
                                    <DialogTrigger asChild><Button variant="outline" size="sm"><Eye className="mr-2 h-4 w-4" />Preview</Button></DialogTrigger>
                                    <DialogContent className="max-w-7xl h-[90vh] flex flex-col p-0">
                                        <DialogHeader className="p-6 pb-4 border-b"><DialogTitle>Website Preview</DialogTitle></DialogHeader>
                                        <div className="flex-1 rounded-md border overflow-hidden"><iframe src={siteUrl} className="w-full h-full" title="Website Preview"/></div>
                                    </DialogContent>
                                </Dialog>
                                <Button variant="destructive" size="sm" onClick={() => setIsDeleteDialogOpen(true)}><Trash2 className="mr-2 h-4 w-4" />Delete Site</Button>
                             </div>
                        </div>
                    </div>
                )}
                
                <Form {...form}>
                    <form className="space-y-4">
                        <Tabs defaultValue="branding" className="w-full">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="branding"><Brush className="w-4 h-4 mr-2" />Branding</TabsTrigger>
                                <TabsTrigger value="app"><AppWindow className="w-4 h-4 mr-2" />App (PWA)</TabsTrigger>
                                <TabsTrigger value="website"><Globe className="w-4 h-4 mr-2" />Website</TabsTrigger>
                            </TabsList>
                            <TabsContent value="branding" className="mt-6">
                                <div className="space-y-6">
                                    <FormField control={form.control} name="siteTitle" render={({ field }) => (<FormItem><FormLabel>Brand / App Name</FormLabel><Input placeholder="e.g., Sunshine PG & Hostels" {...field} /><FormDescription>This name appears on your website, PWA, and in search results.</FormDescription><FormMessage /></FormItem>)} />
                                    <div className="grid md:grid-cols-2 gap-6 items-center">
                                        <FormField control={form.control} name="logoUrl" render={() => (
                                            <FormItem><FormLabel>Your Logo</FormLabel>
                                            <div className="w-48 h-24 border rounded-md flex items-center justify-center bg-muted/40 overflow-hidden">
                                                {logoPreview ? <Image src={logoPreview} alt="Logo Preview" width={192} height={96} className="object-contain"/> : '192x96'}
                                            </div>
                                            <FormControl><Input type="file" accept="image/png, image/jpeg, image/svg+xml" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'logo')} /></FormControl>
                                            <FormMessage /></FormItem>
                                        )}/>
                                        <FormField control={form.control} name="faviconUrl" render={() => (
                                            <FormItem><FormLabel>Your Favicon / App Icon</FormLabel>
                                            <div className="w-16 h-16 border rounded-md flex items-center justify-center bg-muted/40 overflow-hidden">
                                                {faviconPreview ? <Image src={faviconPreview} alt="Favicon Preview" width={64} height={64} className="object-contain"/> : '64x64'}
                                            </div>
                                            <FormControl><Input type="file" accept="image/png, image/x-icon" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'favicon')} /></FormControl>
                                            <FormMessage /></FormItem>
                                        )}/>
                                    </div>
                                    <FormField control={form.control} name="themeColor" render={({ field }) => (
                                        <FormItem><FormLabel>Theme Color</FormLabel>
                                        <div className="flex items-center gap-2">
                                        <FormControl><Input placeholder="#2563EB" {...field} className="w-48"/></FormControl>
                                        <div className="w-8 h-8 rounded-full border" style={{ backgroundColor: field.value || '#ffffff' }} />
                                        </div><FormMessage /></FormItem>
                                    )}/>
                                </div>
                            </TabsContent>
                            <TabsContent value="app" className="mt-6">
                                <div className="grid md:grid-cols-2 gap-8 items-start">
                                    <div className="space-y-6">
                                        <FormField control={form.control} name="subdomain" render={({ field }) => (<FormItem><FormLabel>Your App's Subdomain</FormLabel><div className="flex items-center"><Input placeholder="sunshine-pg" {...field} className="rounded-r-none" disabled={!!siteConfig}/><span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-input bg-muted text-sm text-muted-foreground h-10">.{domain}</span></div><FormDescription>This will be your app's unique address. Cannot be changed later.</FormDescription><FormMessage /></FormItem>)} />
                                        
                                        <Card>
                                            <CardHeader className="pb-4">
                                                <CardTitle className="text-lg">Share Your App</CardTitle>
                                                <CardDescription>Let tenants scan the QR code or use the buttons to access and install the app.</CardDescription>
                                            </CardHeader>
                                            <CardContent className="flex flex-col sm:flex-row items-center gap-4">
                                                {appUrl ? (
                                                  <div className="p-2 border rounded-md">
                                                    <Image 
                                                      src={`https://api.qrserver.com/v1/create-qr-code/?size=128x128&data=${encodeURIComponent(appUrl)}`}
                                                      width={128}
                                                      height={128}
                                                      alt="QR code for app"
                                                    />
                                                  </div>
                                                ) : <Skeleton className="w-32 h-32"/>}
                                                <div className="flex flex-col gap-2 w-full">
                                                    <InstallPWA />
                                                    <Button type="button" variant="outline" onClick={handleShare}><Share2 className="mr-2 h-4 w-4"/>Share App Link</Button>
                                                    <Button type="button" variant="outline" onClick={async () => { await navigator.clipboard.writeText(appUrl); toast({title: 'Link Copied!'}); }}><Copy className="mr-2 h-4 w-4"/>Copy Link</Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>App Preview</Label>
                                        <div className="aspect-[9/16] bg-slate-800 rounded-2xl border-4 border-slate-600 p-4 flex flex-col items-center justify-center">
                                            <div className="w-16 h-16 bg-background rounded-2xl flex items-center justify-center shadow-lg mb-2">
                                                {faviconValue ? <Image src={faviconValue} alt="App Icon" width={64} height={64} className="rounded-2xl object-cover" /> : <AppWindow className="w-8 h-8 text-muted-foreground" />}
                                            </div>
                                            <p className="text-sm text-white font-medium text-center max-w-[120px] truncate">{siteTitleValue || "Your App Name"}</p>
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>
                            <TabsContent value="website" className="mt-6">
                                 <Accordion type="multiple" defaultValue={['hero', 'about']} className="w-full">
                                    <AccordionItem value="hero">
                                        <AccordionTrigger className="text-lg font-semibold">Hero Section</AccordionTrigger>
                                        <AccordionContent className="space-y-6 pt-4">
                                            <FormField control={form.control} name="heroHeadline" render={({ field }) => (<FormItem><FormLabel>Headline</FormLabel><Input placeholder="Welcome to..." {...field} /><FormMessage /></FormItem>)} />
                                            <FormField control={form.control} name="heroSubtext" render={({ field }) => (<FormItem><FormLabel>Subtext</FormLabel><Textarea placeholder="Describe your properties in a sentence." {...field} /><FormMessage /></FormItem>)} />
                                        </AccordionContent>
                                    </AccordionItem>
                                    <AccordionItem value="about">
                                        <AccordionTrigger className="text-lg font-semibold">About Section</AccordionTrigger>
                                        <AccordionContent className="space-y-6 pt-4">
                                            <FormField control={form.control} name="aboutTitle" render={({ field }) => (<FormItem><FormLabel>Title</FormLabel><Input placeholder="A Better Way to Live" {...field} /><FormMessage /></FormItem>)} />
                                            <FormField control={form.control} name="aboutDescription" render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><Textarea placeholder="Tell your brand story briefly..." {...field} /><FormMessage /></FormItem>)} />
                                        </AccordionContent>
                                    </AccordionItem>
                                     <AccordionItem value="listed-pgs">
                                        <AccordionTrigger className="text-lg font-semibold">Listed Properties</AccordionTrigger>
                                        <AccordionContent className="space-y-6 pt-4">
                                            <FormField control={form.control} name="listedPgs" render={() => ( <FormItem><FormDescription>Select which of your properties to show on the public website.</FormDescription><div className="space-y-3 pt-2">{pgs.map((pg) => (<FormField key={pg.id} control={form.control} name="listedPgs" render={({ field }) => (<FormItem key={pg.id} className="flex flex-row items-start space-x-3 space-y-0"><FormControl><Checkbox checked={field.value?.includes(pg.id)} onCheckedChange={(checked) => { return checked ? field.onChange([...(field.value || []), pg.id]) : field.onChange(field.value?.filter((value) => value !== pg.id))}}/></FormControl><FormLabel className="font-normal">{pg.name} - <span className="text-muted-foreground">{pg.location}</span></FormLabel></FormItem>)} />))}</div><FormMessage /></FormItem>)} />
                                        </AccordionContent>
                                    </AccordionItem>
                                </Accordion>
                            </TabsContent>
                        </Tabs>
                        <div className="flex justify-end gap-2 pt-4 border-t mt-6">
                            <Button type="button" variant="outline" onClick={form.handleSubmit(data => onSubmit(data, 'draft'))} disabled={isSaving}>
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save as Draft
                            </Button>
                            <Button type="button" onClick={form.handleSubmit(data => onSubmit(data, 'published'))} disabled={isSaving}>
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {siteConfig ? 'Update & Publish' : 'Create & Publish'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
            
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete your public website at <span className="font-mono text-foreground">{siteConfig?.subdomain}.{domain}</span>. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
}
