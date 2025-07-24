
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
import { ShieldAlert, Globe, Link as LinkIcon, Save, Eye, Loader2, Pencil, Trash2, Share2, Power, PowerOff, GripVertical, Plus, Minus } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { saveSiteConfig, getSiteConfigForOwner, deleteSiteConfig, updateSiteStatus, type SiteConfig } from '@/lib/actions/siteActions'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import SubscriptionDialog from '@/components/dashboard/dialogs/SubscriptionDialog'

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
    const [viewMode, setViewMode] = useState<'loading' | 'display' | 'edit'>('loading');
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isSubDialogOpen, setIsSubDialogOpen] = useState(false);

    const [domain, setDomain] = useState('');
    const [isSaving, startTransition] = useTransition();
    const { toast } = useToast();

    useEffect(() => {
        setDomain(process.env.NEXT_PUBLIC_SITE_DOMAIN || 'rentvastu.netlify.app');
    }, [])

    const form = useForm<WebsiteConfigFormValues>({
        resolver: zodResolver(websiteConfigSchema),
        mode: 'onChange'
    });
    
    const subdomainValue = form.watch('subdomain');
    const siteUrl = useMemo(() => {
        const subdomain = siteConfig?.subdomain || subdomainValue;
        if (!subdomain) return '';
        // Always use route-based path for now, for both dev and prod.
        return `/site/${subdomain}?preview=true`;
        
        /* 
        // Future logic for subdomains
        const isDev = process.env.NODE_ENV === 'development';
        if (isDev) {
             return `/site/${subdomain}?preview=true`;
        }
        return `https://${subdomain}.${domain}`;
        */
    }, [subdomainValue, siteConfig, domain]);

    const fetchConfig = async () => {
        if (!currentUser) return;
        setViewMode('loading');
        const config = await getSiteConfigForOwner(currentUser.id);
        if (config) {
            setSiteConfig(config);
            form.reset(config);
            setViewMode('display');
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
                features: [],
                faqs: [],
                testimonials: [],
                subdomain: '',
                contactPhone: ''
            });
            setViewMode('edit');
        }
    };
    
    useEffect(() => {
        if (!isAppLoading && currentUser) {
            fetchConfig();
        }
    }, [isAppLoading, currentUser?.id]);


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
                setViewMode('display');
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
            setViewMode('edit');
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
        if (!siteUrl) return;
        const urlToShare = `${window.location.origin}${siteUrl.replace('?preview=true','')}`;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: siteConfig?.siteTitle || 'My Property',
                    text: `Check out my property: ${siteConfig?.siteTitle}`,
                    url: urlToShare,
                });
            } catch (error) {
                console.error('Error sharing:', error);
            }
        } else {
            navigator.clipboard.writeText(urlToShare);
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
                        <CardTitle>Website Builder</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col items-center justify-center text-center p-8 bg-muted/50 rounded-lg border">
                            <ShieldAlert className="mx-auto h-12 w-12 text-primary" />
                            <h2 className="mt-4 text-xl font-semibold">Feature Not Available</h2>
                            <p className="mt-2 text-muted-foreground max-w-sm">The Website Builder is not included in your current plan. Please upgrade to access this feature.</p>
                            <Button className="mt-4" onClick={() => setIsSubDialogOpen(true)}>Upgrade Plan</Button>
                        </div>
                    </CardContent>
                </Card>
            </>
       )
    }
    
    if (viewMode === 'display' && siteConfig) {
        const publicUrl = `${window.location.origin}/site/${siteConfig.subdomain}`;
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Globe/> Your Public Website</CardTitle>
                    <CardDescription>Your website is live. You can preview, edit, or delete it below.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <Alert>
                        <LinkIcon className="h-4 w-4" />
                        <AlertTitle>Your Website URL</AlertTitle>
                        <AlertDescription>
                            <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-mono text-sm break-all">{publicUrl}</a>
                        </AlertDescription>
                    </Alert>
                    <div className="flex items-center space-x-2">
                        <Switch id="site-status" checked={siteConfig.status === 'published'} onCheckedChange={handleStatusToggle} disabled={isSaving}/>
                        <Label htmlFor="site-status" className="flex items-center gap-1.5">
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : siteConfig.status === 'published' ? <Power className="w-4 h-4 text-green-500" /> : <PowerOff className="w-4 h-4 text-red-500" />}
                            {isSaving ? 'Updating...' : siteConfig.status === 'published' ? 'Live' : 'Suspended'}
                        </Label>
                    </div>
                </CardContent>
                <CardFooter className="flex-wrap gap-2">
                    <Button variant="outline" onClick={handleShare}><Share2 className="mr-2 h-4 w-4" />Share</Button>
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline"><Eye className="mr-2 h-4 w-4" />Preview</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-7xl h-[90vh] flex flex-col">
                            <DialogHeader>
                                <DialogTitle>Website Preview: {publicUrl}</DialogTitle>
                            </DialogHeader>
                            <div className="flex-1 rounded-md border overflow-hidden">
                                <iframe src={siteUrl} className="w-full h-full" title="Website Preview"/>
                            </div>
                        </DialogContent>
                    </Dialog>
                    <Button onClick={() => setViewMode('edit')}><Pencil className="mr-2 h-4 w-4" />Edit</Button>
                    <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)}><Trash2 className="mr-2 h-4 w-4" />Delete</Button>
                </CardFooter>

                <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will permanently delete your public website at <span className="font-mono text-foreground">{siteConfig.subdomain}.{domain}</span>. This action cannot be undone.
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
        )
    }

    return (
        <Form {...form}>
            <form className="space-y-4">
                <Accordion type="multiple" defaultValue={['basic-info', 'hero', 'about']} className="w-full">
                    <AccordionItem value="basic-info">
                        <AccordionTrigger className="text-lg font-semibold">Basic Information</AccordionTrigger>
                        <AccordionContent className="space-y-6 pt-4">
                             <FormField control={form.control} name="subdomain" render={({ field }) => (<FormItem><FormLabel>Your Subdomain</FormLabel><div className="flex items-center"><Input placeholder="sunshine-pg" {...field} className="rounded-r-none" disabled={!!siteConfig}/><span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-input bg-muted text-sm text-muted-foreground h-10">.{domain}</span></div><FormDescription>This will be your website's public address. Cannot be changed later.</FormDescription><FormMessage /></FormItem>)} />
                             <FormField control={form.control} name="siteTitle" render={({ field }) => (<FormItem><FormLabel>Website Title</FormLabel><Input placeholder="e.g., Sunshine PG & Hostels" {...field} /><FormDescription>This appears in the browser tab and search results.</FormDescription><FormMessage /></FormItem>)} />
                             <div className="grid md:grid-cols-2 gap-6">
                                <FormField control={form.control} name="contactPhone" render={({ field }) => (<FormItem><FormLabel>Public Phone Number</FormLabel><Input type="tel" placeholder="Your business phone number" {...field} /><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="contactEmail" render={({ field }) => (<FormItem><FormLabel>Public Email</FormLabel><Input type="email" placeholder="Your business email" {...field} /><FormMessage /></FormItem>)} />
                            </div>
                        </AccordionContent>
                    </AccordionItem>
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
                     <AccordionItem value="features">
                        <AccordionTrigger className="text-lg font-semibold">Features Section</AccordionTrigger>
                        <AccordionContent className="space-y-6 pt-4">
                            <FormField control={form.control} name="featuresTitle" render={({ field }) => (<FormItem><FormLabel>Title</FormLabel><Input placeholder="Everything You Need..." {...field} /><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="featuresDescription" render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><Textarea placeholder="We provide top-notch facilities..." {...field} /><FormMessage /></FormItem>)} />
                            <div className="space-y-4">
                                <Label>Feature Items</Label>
                                {featureFields.map((field, index) => (
                                    <div key={field.id} className="flex items-start gap-2 p-3 border rounded-md">
                                        <GripVertical className="h-5 w-5 mt-8 text-muted-foreground" />
                                        <div className="flex-1 grid gap-2">
                                            <FormField control={form.control} name={`features.${index}.title`} render={({ field }) => (<Input placeholder="Feature Title" {...field} />)} />
                                            <FormField control={form.control} name={`features.${index}.description`} render={({ field }) => (<Textarea placeholder="Feature Description" {...field} />)} />
                                        </div>
                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeFeature(index)} className="mt-6"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                    </div>
                                ))}
                                <Button type="button" variant="outline" size="sm" onClick={() => appendFeature({title: '', description: ''})}><Plus className="mr-2"/> Add Feature</Button>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                     <AccordionItem value="faqs">
                        <AccordionTrigger className="text-lg font-semibold">FAQ Section</AccordionTrigger>
                        <AccordionContent className="space-y-6 pt-4">
                            <div className="space-y-4">
                                <Label>FAQ Items</Label>
                                {faqFields.map((field, index) => (
                                    <div key={field.id} className="flex items-start gap-2 p-3 border rounded-md">
                                        <GripVertical className="h-5 w-5 mt-8 text-muted-foreground" />
                                        <div className="flex-1 grid gap-2">
                                            <FormField control={form.control} name={`faqs.${index}.q`} render={({ field }) => (<Input placeholder="Question" {...field} />)} />
                                            <FormField control={form.control} name={`faqs.${index}.a`} render={({ field }) => (<Textarea placeholder="Answer" {...field} />)} />
                                        </div>
                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeFaq(index)} className="mt-6"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                    </div>
                                ))}
                                <Button type="button" variant="outline" size="sm" onClick={() => appendFaq({q: '', a: ''})}><Plus className="mr-2"/> Add FAQ</Button>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="testimonials">
                        <AccordionTrigger className="text-lg font-semibold">Testimonials Section</AccordionTrigger>
                        <AccordionContent className="space-y-6 pt-4">
                            <div className="space-y-4">
                                <Label>Testimonials</Label>
                                {testimonialFields.map((field, index) => (
                                    <div key={field.id} className="flex items-start gap-2 p-3 border rounded-md">
                                        <GripVertical className="h-5 w-5 mt-8 text-muted-foreground" />
                                        <div className="flex-1 grid gap-2">
                                            <FormField control={form.control} name={`testimonials.${index}.quote`} render={({ field }) => (<Textarea placeholder="Quote" {...field} />)} />
                                            <FormField control={form.control} name={`testimonials.${index}.author`} render={({ field }) => (<Input placeholder="Author, e.g., Akash S." {...field} />)} />
                                        </div>
                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeTestimonial(index)} className="mt-6"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                    </div>
                                ))}
                                <Button type="button" variant="outline" size="sm" onClick={() => appendTestimonial({quote: '', author: ''})}><Plus className="mr-2"/> Add Testimonial</Button>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>

                <div className="flex justify-end gap-2 pt-4">
                    {viewMode === 'edit' && siteConfig && (
                        <Button type="button" variant="secondary" onClick={() => {
                            form.reset(siteConfig);
                            setViewMode('display');
                        }}>Cancel</Button>
                    )}
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
    )
}
