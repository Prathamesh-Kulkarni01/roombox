import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Loader2, QrCode, Share2, Copy, Check, MessageCircle, Upload,
  Image as ImageIcon, Smartphone, ExternalLink, Home, Building,
  Building2, UserCircle, ShieldCheck, Key, Palette, Type, Link as LinkIcon, Sparkles
} from 'lucide-react';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import type { PWAConfig } from '@/lib/types';
import { auth } from '@/lib/firebase';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getRedirectUrlForSubdomain } from '@/lib/utils';

const PRESET_ICONS = [
  { id: 'home', icon: Home, label: 'Home' },
  { id: 'building', icon: Building, label: 'Building' },
  { id: 'building-2', icon: Building2, label: 'Apartment' },
  { id: 'shield', icon: ShieldCheck, label: 'Secure' },
  { id: 'key', icon: Key, label: 'Stay' },
  { id: 'user', icon: UserCircle, label: 'Guest' },
];

const pwaConfigSchema = z.object({
  name: z.string().min(2).max(50),
  shortName: z.string().min(2).max(12),
  themeColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/),
  backgroundColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/),
  logo: z.string().optional().or(z.literal('')),
  subdomain: z.string().min(3).max(20).regex(/^[a-z0-9-]+$/).optional().or(z.literal('')),
});

const PRESET_ICON_SVGS: Record<string, string> = {
  home: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'%3E%3C/path%3E%3Cpolyline points='9 22 9 12 15 12 15 22'%3E%3C/polyline%3E%3C/svg%3E`,
  building: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='4' y='2' width='16' height='20' rx='2' ry='2'%3E%3C/rect%3E%3Cpath d='M9 22v-4h6v4'%3E%3C/path%3E%3Cpath d='M8 6h.01'%3E%3C/path%3E%3Cpath d='M16 6h.01'%3E%3C/path%3E%3Cpath d='M8 10h.01'%3E%3C/path%3E%3Cpath d='M16 10h.01'%3E%3C/path%3E%3Cpath d='M8 14h.01'%3E%3C/path%3E%3Cpath d='M16 14h.01'%3E%3C/path%3E%3C/svg%3E`,
  'building-2': `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18'%3E%3C/path%3E%3Cpath d='M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2'%3E%3C/path%3E%3Cpath d='M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2'%3E%3C/path%3E%3Cpath d='M10 6h4'%3E%3C/path%3E%3Cpath d='M10 10h4'%3E%3C/path%3E%3Cpath d='M10 14h4'%3E%3C/path%3E%3Cpath d='M10 18h4'%3E%3C/path%3E%3C/svg%3E`,
  shield: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'%3E%3C/path%3E%3C/svg%3E`,
  key: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m21 2-2 2'%3E%3C/path%3E%3Ccircle cx='7' cy='17' r='5'%3E%3C/circle%3E%3Cpath d='M12 12 22 2'%3E%3C/path%3E%3Cpath d='m18 7 3 3'%3E%3C/path%3E%3Cpath d='m16 5 3 3'%3E%3C/path%3E%3C/svg%3E`,
  user: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2'%3E%3C/path%3E%3Ccircle cx='12' cy='7' r='4'%3E%3C/circle%3E%3C/svg%3E`,
};

export function PWASettings() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewMode, setPreviewMode] = useState<'home' | 'splash' | 'dashboard'>('dashboard');
  const [appUrl, setAppUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setAppUrl(window.location.origin);
    }
  }, []);

  const form = useForm<PWAConfig>({
    resolver: zodResolver(pwaConfigSchema),
    defaultValues: {
      name: '',
      shortName: '',
      themeColor: '#0f172a',
      backgroundColor: '#ffffff',
      logo: '',
      subdomain: '',
    },
  });

  useEffect(() => {
    const fetchConfig = async () => {
      if (!auth) return;
      const user = auth.currentUser;
      if (!user) return;

      try {
        const response = await fetch(`/api/pwa/manifest?ownerId=${user.uid}`);
        if (response.ok) {
          const data = await response.json();
          form.reset({
            name: data.name || '',
            shortName: data.short_name || '',
            themeColor: data.theme_color || '#0f172a',
            backgroundColor: data.background_color || '#ffffff',
            logo: data.icons?.[0]?.src || '',
            subdomain: data.subdomain || '',
          });
        }
      } catch (error) {
        console.error('Failed to fetch PWA config:', error);
      }
    };
    fetchConfig();
  }, [form]);

  const onSubmit = async (data: PWAConfig) => {
    setIsLoading(true);
    try {
      if (!auth) throw new Error('Auth not initialized');
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');

      const token = await user.getIdToken();

      const response = await fetch('/api/pwa-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Failed to save PWA configuration');

      toast({
        title: "Success",
        description: "Your branded app configuration has been saved.",
      });

      // Refresh to apply changes
      window.location.reload();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save configuration. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Max 2MB allowed.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const dataUri = reader.result as string;
        if (!auth) return;
        const user = auth.currentUser;
        if (!user) return;
        const token = await user.getIdToken();

        const response = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ dataUri, folder: 'pwa-logos' }),
        });

        if (!response.ok) throw new Error('Upload failed');
        const { url } = await response.json();
        form.setValue('logo', url);
        toast({ title: "Logo uploaded successfully" });
      };
    } catch (error) {
      toast({
        title: "Upload failed",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const nameValue = form.watch('name') || 'RentSutra';
  const themeColorValue = form.watch('themeColor') || '#0f172a';
  const logoValue = form.watch('logo');
  const subdomainValue = form.watch('subdomain');

  const brandedUrl = subdomainValue ? getRedirectUrlForSubdomain('tenant', subdomainValue, '') : '';

  const qrDarkColor = (themeColorValue || '#0f172a').replace('#', '');
  const qrCodeUrl = brandedUrl ? `https://quickchart.io/qr?text=${encodeURIComponent(brandedUrl)}&size=300&dark=${qrDarkColor}&margin=2${logoValue && !logoValue.startsWith('data:image/svg+xml') ? `&centerImageUrl=${encodeURIComponent(logoValue)}` : ''}` : '';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div className="lg:col-span-7 space-y-6">
        <Card className="border-border/40 shadow-sm overflow-hidden bg-card">
          <CardHeader className="bg-muted/50 border-b border-border/50 px-8 py-6">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-2xl font-bold">Brand Your App</CardTitle>
                <CardDescription className="text-base mt-2">
                  Customize how the app looks when your tenants install it on their phones.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">

                {/* Step 1: App Details */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground border-b border-border/50 pb-2">
                    <Type className="w-5 h-5 text-primary" />
                    1. App Details
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base">Full App Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g. Skyline Residency" className="h-12 bg-muted/30 border-border/50" />
                          </FormControl>
                          <FormDescription>Displayed when app is opened.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="shortName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base">HomeScreen Icon Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g. Skyline" maxLength={12} className="h-12 bg-muted/30 border-border/50" />
                          </FormControl>
                          <FormDescription>Short name under the app icon.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="subdomain"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base flex items-center gap-2">
                          Your App Link
                        </FormLabel>
                        <FormControl>
                          <div className="flex items-center shadow-sm rounded-md overflow-hidden border border-border/50">
                            <span className="bg-muted px-4 py-3 text-sm font-medium text-muted-foreground border-r border-border/50 isolate whitespace-nowrap">
                              {appUrl.replace(/^https?:\/\//, '')}/app/
                            </span>
                            <Input {...field} placeholder="your-pg" className="border-0 h-12 rounded-none focus-visible:ring-0 bg-muted/30" />
                          </div>
                        </FormControl>
                        <FormDescription>The link you will share with your tenants to access the app.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Step 2: Brand Colors */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground border-b border-border/50 pb-2">
                    <Palette className="w-5 h-5 text-primary" />
                    2. Brand Colors
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="themeColor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base">Main Brand Color</FormLabel>
                          <FormControl>
                            <div className="flex gap-3 items-center">
                              <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-border shadow-sm shrink-0 cursor-pointer">
                                <input {...field} type="color" className="absolute -top-4 -left-4 w-24 h-24 cursor-pointer" />
                              </div>
                              <Input value={field.value} onChange={field.onChange} className="h-12 bg-muted/30 border-border/50 uppercase font-mono text-sm" />
                            </div>
                          </FormControl>
                          <FormDescription>Used for buttons and headers.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="backgroundColor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base">Loading Screen Color</FormLabel>
                          <FormControl>
                            <div className="flex gap-3 items-center">
                              <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-border shadow-sm shrink-0 cursor-pointer">
                                <input {...field} type="color" className="absolute -top-4 -left-4 w-24 h-24 cursor-pointer" />
                              </div>
                              <Input value={field.value} onChange={field.onChange} className="h-12 bg-muted/30 border-border/50 uppercase font-mono text-sm" />
                            </div>
                          </FormControl>
                          <FormDescription>Background color while opening.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Step 3: App Logo */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground border-b border-border/50 pb-2">
                    <ImageIcon className="w-5 h-5 text-primary" />
                    3. App Logo
                  </h3>

                  <Tabs defaultValue="upload" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 h-12 bg-muted p-1 rounded-xl mb-4">
                      <TabsTrigger value="upload" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">Upload Your Logo</TabsTrigger>
                      <TabsTrigger value="library" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">Choose Preset Icon</TabsTrigger>
                    </TabsList>

                    <TabsContent value="upload" className="space-y-4">
                      <div className="flex items-center justify-center w-full">
                        <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-border/50 rounded-xl cursor-pointer bg-muted/30 hover:bg-muted/50 transition-colors">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            {isUploading ? (
                              <div className="flex flex-col items-center gap-3">
                                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                                <p className="text-sm font-medium text-slate-600">Uploading your logo...</p>
                              </div>
                            ) : (
                              <>
                                <div className="w-14 h-14 bg-card rounded-full flex items-center justify-center shadow-sm mb-3 border border-border/50">
                                  <Upload className="w-6 h-6 text-primary" />
                                </div>
                                <p className="text-base font-medium text-slate-700">Click to upload image</p>
                                <p className="text-xs text-slate-500 mt-1">Square image recommended (Max 2MB)</p>
                              </>
                            )}
                          </div>
                          <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={isUploading} />
                        </label>
                      </div>

                      {/* Hidden field to store logo URL for the form */}
                      <input type="hidden" {...form.register("logo")} />
                    </TabsContent>

                    <TabsContent value="library">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {PRESET_ICONS.map((item) => (
                          <Button
                            key={item.id}
                            type="button"
                            variant="outline"
                            className={`h-24 flex flex-col gap-2 items-center justify-center border-border/50 hover:border-primary hover:bg-primary/5 bg-card shadow-sm transition-all ${form.watch('logo') === PRESET_ICON_SVGS[item.id] ? 'border-primary ring-2 ring-primary/20 bg-primary/[0.02]' : ''}`}
                            onClick={() => {
                              form.setValue('logo', PRESET_ICON_SVGS[item.id]);
                              toast({ title: "Icon Selected", description: `Selected the ${item.label} icon.` });
                            }}
                          >
                            <div className="p-3 rounded-full transition-colors" style={{ backgroundColor: form.watch('logo') === PRESET_ICON_SVGS[item.id] ? form.watch('themeColor') : '#f1f5f9' }}>
                              <item.icon className={`w-6 h-6 ${form.watch('logo') === PRESET_ICON_SVGS[item.id] ? 'text-white' : 'text-slate-700'}`} />
                            </div>
                            <span className="text-xs font-semibold text-slate-600">{item.label}</span>
                          </Button>
                        ))}
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>

                <div className="pt-6">
                  <Button type="submit" disabled={isLoading} className="w-full h-14 text-lg font-bold shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all rounded-xl">
                    {isLoading ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <Sparkles className="mr-2 h-6 w-6" />}
                    Save Branding & Update App
                  </Button>
                  <p className="text-center text-sm text-slate-500 mt-4">
                    Changes will be ready instantly for new tenants.
                  </p>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-5 space-y-6">
        <div className="sticky top-8 space-y-8">
          <div className="text-center space-y-2">
            <h3 className="text-xl font-bold flex items-center justify-center gap-2">
              <Smartphone className="w-5 h-5 text-primary" />
              Live Preview
            </h3>
            <p className="text-sm text-slate-500">See exactly what your tenants will see</p>
          </div>

          <div className="flex justify-center flex-col items-center gap-6">
            {/* Minimalist Phone Mockup */}
            <div className="relative w-[300px] h-[620px] bg-slate-900 rounded-[3.5rem] p-3 shadow-2xl ring-8 ring-slate-800/50">
              {/* Notch */}
              <div className="absolute top-0 inset-x-0 h-7 flex justify-center items-center z-20">
                <div className="w-24 h-5 bg-black rounded-b-2xl"></div>
              </div>

              <div className="relative w-full h-full bg-white rounded-[2.5rem] overflow-hidden flex flex-col items-center text-center">
                
                {/* Mode: Home Screen */}
                {previewMode === 'home' && (
                  <div className="absolute inset-0 bg-[#f8fafc] p-6 pt-12 animate-in fade-in duration-500">
                    <div className="grid grid-cols-4 gap-4 mt-8">
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-14 h-14 rounded-2xl bg-white shadow-md border flex items-center justify-center overflow-hidden">
                           {logoValue ? (
                            <img src={logoValue} alt="App Icon" className="w-full h-full object-cover" style={{ backgroundColor: themeColorValue }} />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: themeColorValue }}>
                              <Building2 className="w-8 h-8 text-white" />
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] font-medium text-slate-600 truncate w-full text-center">
                          {form.watch('shortName') || 'RoomBox'}
                        </span>
                      </div>
                      {[1,2,3,4,5,6,7].map(i => (
                        <div key={i} className="flex flex-col items-center gap-1 opacity-20">
                          <div className="w-14 h-14 rounded-2xl bg-slate-200" />
                          <div className="w-10 h-2 bg-slate-200 rounded-full" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mode: Splash Screen */}
                {previewMode === 'splash' && (
                  <div 
                    className="absolute inset-0 flex flex-col items-center justify-center animate-in zoom-in-95 fade-in duration-500"
                    style={{ backgroundColor: form.watch('backgroundColor') || '#ffffff' }}
                  >
                    <div className="w-32 h-32 rounded-[2.5rem] shadow-2xl mb-6 flex items-center justify-center overflow-hidden border-4 border-white bg-white">
                      {logoValue ? (
                        <img src={logoValue} alt="App Logo" className="w-full h-full object-cover" style={{ backgroundColor: themeColorValue }} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: themeColorValue }}>
                          <Building2 className="w-16 h-16 text-white" />
                        </div>
                      )}
                    </div>
                    <h4 className="text-xl font-black tracking-tight" style={{ color: themeColorValue }}>{nameValue}</h4>
                    <div className="absolute bottom-12 flex flex-col items-center gap-4">
                      <Loader2 className="w-6 h-6 animate-spin" style={{ color: themeColorValue }} />
                      <p className="text-[10px] uppercase font-black tracking-[0.2em] opacity-40">Powered by RoomBox</p>
                    </div>
                  </div>
                )}

                {/* Mode: Dashboard */}
                {previewMode === 'dashboard' && (
                  <>
                    {/* Background "Splashes" */}
                    <div
                      className="absolute inset-x-0 top-0 h-2/3 transition-colors duration-500 ease-in-out"
                      style={{ backgroundColor: themeColorValue + '15' }}
                    >
                      <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-white to-transparent" />
                    </div>

                    <div className="z-10 w-full px-6 pt-24 animate-in slide-in-from-bottom-4 fade-in duration-700">
                      <div
                        className="w-28 h-28 mx-auto rounded-[2rem] shadow-xl border-4 border-white mb-6 flex items-center justify-center overflow-hidden transition-all duration-500 bg-white"
                      >
                        {logoValue ? (
                          <img src={logoValue} alt="App Logo" className="w-full h-full object-cover" style={{ backgroundColor: themeColorValue }} />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center" style={{ backgroundColor: themeColorValue }}>
                            <Building2 className="w-12 h-12 text-white" />
                          </div>
                        )}
                      </div>

                      <h4 className="text-2xl font-bold tracking-tight text-slate-900 mb-2 truncate px-2">{nameValue || 'Your App Name'}</h4>
                      <p className="text-sm text-slate-500 font-medium">A Premium Stay Experience</p>

                      <div className="mt-12 space-y-4 w-full px-2">
                        <div className="h-12 w-full rounded-2xl flex items-center justify-center text-white font-bold shadow-lg transition-colors duration-500 text-base"
                          style={{ backgroundColor: themeColorValue }}
                        >
                          Login to Dashboard
                        </div>
                        <div className="space-y-3 mt-8">
                          <div className="h-2 w-full rounded-full bg-slate-100" />
                          <div className="h-2 w-3/4 mx-auto rounded-full bg-slate-100" />
                          <div className="h-2 w-1/2 mx-auto rounded-full bg-slate-100" />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Bottom Bar Mockup (Always shown except Splash) */}
                {previewMode !== 'splash' && (
                  <div className="absolute bottom-6 inset-x-6">
                    <div className="flex justify-around items-center bg-card/80 backdrop-blur-md shadow-[0_0_20px_rgba(0,0,0,0.1)] p-4 rounded-2xl border border-border/50">
                      <div className="w-6 h-6 rounded-md bg-muted" />
                      <div className="w-6 h-6 rounded-md bg-muted" />
                      <div className="w-6 h-6 rounded-md" style={{ backgroundColor: themeColorValue }} />
                      <div className="w-6 h-6 rounded-md bg-muted" />
                    </div>
                    <div className="w-1/3 h-1 bg-slate-300 mx-auto mt-4 rounded-full" />
                  </div>
                )}
              </div>
            </div>

            {/* Preview Controls */}
            <div className="flex bg-slate-100 p-1.5 rounded-2xl border shadow-inner">
               <Button 
                variant={previewMode === 'home' ? 'default' : 'ghost'} 
                size="sm" 
                className={`rounded-xl px-4 ${previewMode === 'home' ? 'bg-white shadow-sm' : ''}`}
                onClick={() => setPreviewMode('home')}
               >
                 Icon
               </Button>
               <Button 
                variant={previewMode === 'splash' ? 'default' : 'ghost'} 
                size="sm" 
                className={`rounded-xl px-4 ${previewMode === 'splash' ? 'bg-white shadow-sm' : ''}`}
                onClick={() => setPreviewMode('splash')}
               >
                 Splash
               </Button>
               <Button 
                variant={previewMode === 'dashboard' ? 'default' : 'ghost'} 
                size="sm" 
                className={`rounded-xl px-4 ${previewMode === 'dashboard' ? 'bg-white shadow-sm' : ''}`}
                onClick={() => setPreviewMode('dashboard')}
               >
                 App UI
               </Button>
            </div>
          </div>
        </div>
      </div>

      {brandedUrl && (
        <div className="col-span-full mt-12 bg-primary/5 p-8 rounded-3xl border border-primary/10">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-slate-900 flex items-center justify-center gap-2">
                <Share2 className="w-6 h-6 text-indigo-600" />
                Share Your New App
              </h3>
              <p className="text-slate-600 mt-2">
                Share this link or QR code with your tenants so they can access their dashboard through your branded app.
              </p>
            </div>

            <div className="flex flex-col md:flex-row gap-8 items-center bg-card p-8 rounded-2xl shadow-sm border border-border/50">
              <div className="bg-muted/20 p-4 rounded-xl border-2 border-border/50 shadow-sm shrink-0 flex flex-col items-center gap-4">
                <div className="bg-white p-2 rounded-lg">
                  <img
                    src={qrCodeUrl}
                    alt="App QR Code"
                    className="w-40 h-40 object-contain"
                  />
                </div>
                <Button variant="outline" size="sm" className="w-full font-semibold" onClick={() => window.open(qrCodeUrl, '_blank')}>
                  Download QR
                </Button>
              </div>

              <div className="flex-1 space-y-6 w-full text-center md:text-left">
                <div>
                  <Label className="text-sm font-semibold text-slate-700">Tenant App Link</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Input readOnly value={brandedUrl} className="bg-muted/30 border-border/50 h-12 text-foreground font-medium" />
                    <Button size="icon" className="h-12 w-12 shrink-0 bg-indigo-600 hover:bg-indigo-700" onClick={() => { navigator.clipboard.writeText(brandedUrl); toast({ title: "Link Copied to Clipboard" }); }}>
                      <Copy className="w-5 h-5" />
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                  <Button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Check out our new property app to manage your stay: ${brandedUrl}`)}`, '_blank')} className="bg-[#25D366] hover:bg-[#20ba5a] text-white h-12 px-6 rounded-xl text-base font-semibold shadow-sm">
                    <MessageCircle className="mr-2 h-5 w-5" />
                    WhatsApp to Tenants
                  </Button>
                  <Button variant="outline" asChild className="h-12 px-6 rounded-xl text-base font-semibold border-border/50 hover:bg-muted text-foreground">
                    <a href={brandedUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-5 w-5" />
                      Open App Demo
                    </a>
                  </Button>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-start gap-3 text-sm text-indigo-800 bg-indigo-100/50 p-4 rounded-xl">
              <QrCode className="w-5 h-5 shrink-0 mt-0.5 text-indigo-600" />
              <p>
                <strong>Pro Tip:</strong> Print the QR code and paste it at your reception. New tenants can scan it to instantly get your branded app on their phones!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
