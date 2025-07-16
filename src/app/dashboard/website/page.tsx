
'use client'

import { useState, useEffect, useMemo, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAppSelector } from '@/lib/hooks'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ShieldAlert, Globe, Link as LinkIcon, Save, Eye, Loader2, Pencil, Trash2, Share2, Power, PowerOff } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { saveSiteConfig, getSiteConfigForOwner, deleteSiteConfig, updateSiteStatus, type SiteConfig } from '@/lib/actions/siteActions'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

const websiteConfigSchema = z.object({
  subdomain: z.string().min(3, 'Subdomain must be at least 3 characters').regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, and hyphens are allowed.'),
  siteTitle: z.string().min(5, 'Site title is too short.'),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email('Invalid email address.').optional(),
  listedPgs: z.array(z.string()).refine(value => value.some(item => item), {
    message: "You must select at least one property to display.",
  }),
  status: z.enum(['published', 'draft', 'suspended']).optional(),
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

    const [domain, setDomain] = useState('');
    const [isDev, setIsDev] = useState(false);
    const [isSaving, startTransition] = useTransition();
    const { toast } = useToast();

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const hostParts = window.location.hostname.split('.');
            const mainDomain = hostParts.length > 1 ? hostParts.slice(-2).join('.') : window.location.hostname;
            setDomain(mainDomain);
            setIsDev(process.env.NODE_ENV === 'development' || mainDomain.includes('localhost'));
        }
    }, [])

    const form = useForm<WebsiteConfigFormValues>({
        resolver: zodResolver(websiteConfigSchema),
        mode: 'onChange'
    });
    
    const subdomainValue = form.watch('subdomain');
    const hasSubdomainError = !!form.formState.errors.subdomain;

    const siteUrl = useMemo(() => {
        const subdomain = siteConfig?.subdomain || subdomainValue;
        if (!subdomain || hasSubdomainError) return '';
        if (isDev) return `/site/${subdomain}?preview=true`;
        return `https://${subdomain}.${domain}`;
    }, [subdomainValue, siteConfig, hasSubdomainError, domain, isDev]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAppLoading, currentUser?.id]);


    const { fields } = useFieldArray({
      control: form.control,
      name: "listedPgs"
    });

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
            form.reset({
                subdomain: '',
                siteTitle: `${currentUser?.name || 'My'}'s Properties`,
                contactEmail: currentUser?.email || '',
                contactPhone: '',
                listedPgs: pgs.map(p => p.id),
            });
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
        if (navigator.share) {
            try {
                await navigator.share({
                    title: siteConfig?.siteTitle || 'My Property',
                    text: `Check out my property: ${siteConfig?.siteTitle}`,
                    url: siteUrl,
                });
            } catch (error) {
                console.error('Error sharing:', error);
            }
        } else {
            navigator.clipboard.writeText(siteUrl);
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
    
    if (!currentPlan?.hasWebsiteBuilder) {
        return (
         <div className="flex items-center justify-center h-full">
             <div className="text-center p-8 bg-card rounded-lg border">
                 <ShieldAlert className="mx-auto h-12 w-12 text-primary" />
                 <h2 className="mt-4 text-xl font-semibold">Feature Not Available</h2>
                 <p className="mt-2 text-muted-foreground max-w-sm">The Website Builder is not included in your current plan. Please upgrade to access this feature.</p>
                 <Button className="mt-4">Upgrade Plan</Button>
             </div>
         </div>
       )
    }
    
    if (viewMode === 'display' && siteConfig) {
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
                            <a href={siteUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-mono text-sm break-all">{siteUrl.replace('?preview=true','')}</a>
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
                <CardFooter className="gap-2">
                    <Button variant="outline" onClick={handleShare}><Share2 className="mr-2 h-4 w-4" />Share</Button>
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline"><Eye className="mr-2 h-4 w-4" />Preview</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-7xl h-[90vh] flex flex-col">
                            <DialogHeader>
                                <DialogTitle>Website Preview: {siteUrl.replace('?preview=true','')}</DialogTitle>
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
            <form className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Globe/> Public Website Builder</CardTitle>
                        <CardDescription>{siteConfig ? 'Edit your public website settings below.' : 'Create a public, SEO-friendly website for your properties on a custom subdomain.'}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <FormField
                            control={form.control}
                            name="subdomain"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Your Subdomain</FormLabel>
                                    <div className="flex items-center">
                                        <Input 
                                            placeholder="sunshine-pg" 
                                            {...field} 
                                            className="rounded-r-none"
                                            disabled={!!siteConfig}
                                        />
                                        <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-input bg-muted text-sm text-muted-foreground h-10">.{domain}</span>
                                    </div>
                                    <FormDescription>This will be your website's public address. Cannot be changed later.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Website Content</CardTitle>
                        <CardDescription>Customize the content that appears on your public website.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <FormField control={form.control} name="siteTitle" render={({ field }) => (<FormItem><FormLabel>Website Title</FormLabel><Input placeholder="e.g., Sunshine PG & Hostels" {...field} /><FormDescription>This appears in the browser tab and search results.</FormDescription><FormMessage /></FormItem>)} />
                        <div className="grid md:grid-cols-2 gap-6">
                            <FormField control={form.control} name="contactPhone" render={({ field }) => (<FormItem><FormLabel>Public Phone Number</FormLabel><Input type="tel" placeholder="Your business phone number" {...field} /><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="contactEmail" render={({ field }) => (<FormItem><FormLabel>Public Email</FormLabel><Input type="email" placeholder="Your business email" {...field} /><FormMessage /></FormItem>)} />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Listed Properties</CardTitle>
                        <CardDescription>Select which of your properties to show on the public website.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <FormField
                            control={form.control}
                            name="listedPgs"
                            render={() => (
                                <FormItem>
                                    <div className="space-y-3">
                                        {pgs.map((pg) => (
                                            <FormField
                                                key={pg.id}
                                                control={form.control}
                                                name="listedPgs"
                                                render={({ field }) => {
                                                    return (
                                                        <FormItem key={pg.id} className="flex flex-row items-start space-x-3 space-y-0">
                                                            <FormControl>
                                                                <Checkbox
                                                                    checked={field.value?.includes(pg.id)}
                                                                    onCheckedChange={(checked) => {
                                                                        return checked
                                                                        ? field.onChange([...(field.value || []), pg.id])
                                                                        : field.onChange(field.value?.filter((value) => value !== pg.id))
                                                                    }}
                                                                />
                                                            </FormControl>
                                                            <FormLabel className="font-normal">{pg.name} - <span className="text-muted-foreground">{pg.location}</span></FormLabel>
                                                        </FormItem>
                                                    )
                                                }}
                                            />
                                        ))}
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-2">
                    {viewMode === 'edit' && siteConfig && (
                        <Button type="button" variant="secondary" onClick={() => {
                            form.reset(siteConfig); // Reset form to last saved state
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
