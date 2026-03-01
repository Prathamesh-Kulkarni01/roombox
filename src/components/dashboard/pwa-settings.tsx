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
  logo: z.string().url().optional().or(z.literal('')),
  subdomain: z.string().min(3).max(20).regex(/^[a-z0-9-]+$/).optional().or(z.literal('')),
});

export function PWASettings() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

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

  const appUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const brandedUrl = subdomainValue ? `${appUrl}/app/${subdomainValue}` : '';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div className="lg:col-span-7 space-y-6">
        <Card className="border-0 shadow-sm overflow-hidden bg-white">
          <CardHeader className="bg-slate-50 border-b px-8 py-6">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-2xl font-bold text-slate-900">Brand Your App</CardTitle>
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
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-slate-800 border-b pb-2">
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
                            <Input {...field} placeholder="e.g. Skyline Residency" className="h-12 bg-slate-50" />
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
                            <Input {...field} placeholder="e.g. Skyline" maxLength={12} className="h-12 bg-slate-50" />
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
                          <div className="flex items-center shadow-sm rounded-md overflow-hidden border">
                            <span className="bg-slate-100 px-4 py-3 text-sm font-medium text-slate-600 border-r isolate whitespace-nowrap">
                              rentsutra.com/app/
                            </span>
                            <Input {...field} placeholder="your-pg" className="border-0 h-12 rounded-none focus-visible:ring-0 bg-slate-50" />
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
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-slate-800 border-b pb-2">
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
                              <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-slate-200 shadow-sm shrink-0 cursor-pointer">
                                <input {...field} type="color" className="absolute -top-4 -left-4 w-24 h-24 cursor-pointer" />
                              </div>
                              <Input value={field.value} onChange={field.onChange} className="h-12 bg-slate-50 uppercase font-mono text-sm" />
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
                              <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-slate-200 shadow-sm shrink-0 cursor-pointer">
                                <input {...field} type="color" className="absolute -top-4 -left-4 w-24 h-24 cursor-pointer" />
                              </div>
                              <Input value={field.value} onChange={field.onChange} className="h-12 bg-slate-50 uppercase font-mono text-sm" />
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
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-slate-800 border-b pb-2">
                    <ImageIcon className="w-5 h-5 text-primary" />
                    3. App Logo
                  </h3>

                  <Tabs defaultValue="upload" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 h-12 bg-slate-100 p-1 rounded-xl mb-4">
                      <TabsTrigger value="upload" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Upload Your Logo</TabsTrigger>
                      <TabsTrigger value="library" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Choose Preset Icon</TabsTrigger>
                    </TabsList>

                    <TabsContent value="upload" className="space-y-4">
                      <div className="flex items-center justify-center w-full">
                        <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            {isUploading ? (
                              <div className="flex flex-col items-center gap-3">
                                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                                <p className="text-sm font-medium text-slate-600">Uploading your logo...</p>
                              </div>
                            ) : (
                              <>
                                <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-sm mb-3">
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
                            className="h-24 flex flex-col gap-2 items-center justify-center border-slate-200 hover:border-primary hover:bg-primary/5 bg-white shadow-sm"
                            onClick={() => {
                              toast({ title: "Icon Selected", description: "You've selected a preset icon." });
                              // We would ideally set the SVG or a preset image URL here
                            }}
                          >
                            <div className="bg-slate-100 p-3 rounded-full">
                              <item.icon className="w-6 h-6 text-slate-700" />
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

          <div className="flex justify-center">
            {/* Minimalist Phone Mockup */}
            <div className="relative w-[300px] h-[620px] bg-slate-900 rounded-[3.5rem] p-3 shadow-2xl">
              <div className="absolute top-0 inset-x-0 h-7 flex justify-center items-center z-20">
                <div className="w-24 h-5 bg-black rounded-b-2xl"></div>
              </div>

              <div className="relative w-full h-full bg-white rounded-[2.5rem] overflow-hidden flex flex-col items-center text-center">

                {/* Background "Splashes" */}
                <div
                  className="absolute inset-x-0 top-0 h-2/3 transition-colors duration-500 ease-in-out"
                  style={{ backgroundColor: themeColorValue + '15' }}
                >
                  <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-white to-transparent" />
                </div>

                <div className="z-10 w-full px-6 pt-24 animate-in fade-in duration-700">
                  <div
                    className="w-28 h-28 mx-auto rounded-[2rem] shadow-xl border-4 border-white mb-6 flex items-center justify-center overflow-hidden transition-all duration-500 bg-white"
                  >
                    {logoValue ? (
                      <img src={logoValue} alt="App Logo" className="w-full h-full object-cover" />
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
                    <div className="h-4 w-1/2 mx-auto rounded-full bg-slate-100" />
                  </div>
                </div>

                {/* Bottom Bar Mockup */}
                <div className="absolute bottom-6 inset-x-6">
                  <div className="flex justify-around items-center bg-white shadow-[0_0_20px_rgba(0,0,0,0.05)] p-4 rounded-2xl border border-slate-100">
                    <div className="w-6 h-6 rounded-md bg-slate-200" />
                    <div className="w-6 h-6 rounded-md bg-slate-200" />
                    <div className="w-6 h-6 rounded-md" style={{ backgroundColor: themeColorValue }} />
                    <div className="w-6 h-6 rounded-md bg-slate-200" />
                  </div>
                  <div className="w-1/3 h-1 bg-slate-300 mx-auto mt-4 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {brandedUrl && (
        <div className="col-span-full mt-12 bg-indigo-50/50 p-8 rounded-3xl border border-indigo-100/50">
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

            <div className="flex flex-col md:flex-row gap-8 items-center bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
              <div className="bg-white p-4 rounded-xl border-2 border-slate-100 shadow-sm shrink-0">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(brandedUrl)}&margin=10`}
                  alt="App QR Code"
                  className="w-40 h-40"
                />
              </div>

              <div className="flex-1 space-y-6 w-full text-center md:text-left">
                <div>
                  <Label className="text-sm font-semibold text-slate-700">Tenant App Link</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Input readOnly value={brandedUrl} className="bg-slate-50 border-slate-200 h-12 text-slate-700 font-medium" />
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
                  <Button variant="outline" asChild className="h-12 px-6 rounded-xl text-base font-semibold border-slate-200 hover:bg-slate-50 text-slate-700">
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
