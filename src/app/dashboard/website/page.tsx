
'use client'

import { useState, useEffect, useMemo } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAppSelector } from '@/lib/hooks'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ShieldAlert, Globe, LinkIcon, Save, Eye } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

const websiteConfigSchema = z.object({
  subdomain: z.string().min(3, 'Subdomain must be at least 3 characters').regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, and hyphens are allowed.'),
  siteTitle: z.string().min(5, 'Site title is too short.'),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email('Invalid email address.').optional(),
  listedPgs: z.array(z.string()).refine(value => value.some(item => item), {
    message: "You must select at least one property to display.",
  }),
});

type WebsiteConfigFormValues = z.infer<typeof websiteConfigSchema>;

export default function WebsiteBuilderPage() {
    const { pgs } = useAppSelector(state => state.pgs)
    const { currentPlan } = useAppSelector(state => state.user)
    const { isLoading } = useAppSelector(state => state.app)
    const [subdomain, setSubdomain] = useState('');
    const [domain, setDomain] = useState('');
    const [isDev, setIsDev] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const hostParts = window.location.hostname.split('.');
            // Simple logic to get the main domain (e.g., example.com from www.example.com)
            const mainDomain = hostParts.length > 1 ? hostParts.slice(-2).join('.') : window.location.hostname;
            setDomain(mainDomain);
            setIsDev(process.env.NODE_ENV === 'development' || mainDomain.includes('localhost'));
        }
    }, [])

    const form = useForm<WebsiteConfigFormValues>({
        resolver: zodResolver(websiteConfigSchema),
        defaultValues: {
            subdomain: '',
            siteTitle: '',
            contactPhone: '',
            contactEmail: '',
            listedPgs: pgs.map(p => p.id), // Default to all selected
        }
    })

    const { fields, append, remove } = useFieldArray({
      control: form.control,
      name: "listedPgs"
    });

    const onSubmit = (data: WebsiteConfigFormValues) => {
        console.log(data)
        // Here you would save the data to the user's settings in your database
    }
    
    const siteUrl = useMemo(() => {
        if (!subdomain) return '';
        if (isDev) return `/${subdomain}`;
        return `https://${subdomain}.${domain}`;
    }, [subdomain, domain, isDev]);
    
    if (isLoading) {
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

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Globe/> Public Website Builder</CardTitle>
                        <CardDescription>Create and customize a public, SEO-friendly website for your properties on a custom subdomain.</CardDescription>
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
                                            onChange={(e) => {
                                                field.onChange(e);
                                                setSubdomain(e.target.value);
                                            }}
                                            className="rounded-r-none" 
                                        />
                                        <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-input bg-muted text-sm text-muted-foreground">.{domain}</span>
                                    </div>
                                    <FormDescription>This will be your website's public address.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        {siteUrl && (
                             <Alert>
                                <LinkIcon className="h-4 w-4" />
                                <AlertTitle>Your Website URL</AlertTitle>
                                <AlertDescription className="flex items-center justify-between">
                                    <a href={siteUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-mono text-sm">{siteUrl}</a>
                                     <Dialog>
                                        <DialogTrigger asChild>
                                            <Button variant="outline" size="sm"><Eye className="mr-2" />Preview</Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-7xl h-[90vh] flex flex-col">
                                            <DialogHeader>
                                                <DialogTitle>Website Preview: {siteUrl}</DialogTitle>
                                            </DialogHeader>
                                            <div className="flex-1 rounded-md border overflow-hidden">
                                                <iframe src={siteUrl} className="w-full h-full" title="Website Preview"/>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                </AlertDescription>
                            </Alert>
                        )}
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
                                        {pgs.map((pg, index) => (
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

                <div className="flex justify-end">
                    <Button type="submit"><Save className="mr-2"/> Save & Publish Website</Button>
                </div>
            </form>
        </Form>
    )
}
