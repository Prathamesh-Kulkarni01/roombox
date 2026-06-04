"use client";

import React, { useEffect, useState, useMemo, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Image from "next/image";
import Link from "next/link";
import { useAppSelector } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  Globe,
  Link as LinkIcon,
  Save,
  Eye,
  Loader2,
  Trash2,
  Share2,
  Power,
  PowerOff,
  Plus,
  Minus,
  Palette,
  AppWindow,
  Brush,
  Copy,
  QrCode,
  Sparkles,
  Smartphone,
  Laptop,
  ChevronLeft,
  ChevronRight,
  Info,
  Check,
  CheckCircle2,
  Home as HomeIcon,
  IndianRupee,
  MessageSquare,
  Building,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  saveSiteConfig,
  getSiteConfigForOwner,
  deleteSiteConfig,
  updateSiteStatus,
  type SiteConfig,
} from "@/lib/actions/siteActions";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { uploadDataUriToStorage } from "@/lib/storage";
import { getCurrentPlan, cn } from "@/lib/utils";

const websiteConfigSchema = z.object({
  subdomain: z
    .string()
    .min(3, "Subdomain must be at least 3 characters")
    .regex(
      /^[a-z0-9-]+$/,
      "Only lowercase letters, numbers, and hyphens are allowed.",
    ),
  siteTitle: z.string().min(5, "Site title must be at least 5 characters."),
  contactPhone: z.string().optional(),
  contactEmail: z
    .string()
    .email("Invalid email address.")
    .optional()
    .or(z.literal("")),
  logoUrl: z.string().url().optional().or(z.literal("")),
  faviconUrl: z.string().url().optional().or(z.literal("")),
  themeColor: z
    .string()
    .regex(/^#([0-9a-f]{3}){1,2}$/i, "Must be a valid hex color")
    .optional()
    .or(z.literal("")),
  listedPgs: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: "You must select at least one property to display.",
  }),
  status: z.enum(["published", "draft", "suspended"]).optional(),
  heroHeadline: z.string().min(1, "Hero headline is required."),
  heroSubtext: z.string().min(1, "Hero subtext is required."),
  aboutTitle: z.string().min(1, "About title is required."),
  aboutDescription: z.string().min(1, "About description is required."),
  websiteStyle: z
    .enum(["classic", "minimal", "glassmorphism"])
    .default("classic"),
  pwaShortName: z
    .string()
    .max(12, "HomeScreen icon name must be 12 characters or less.")
    .min(2, "Must be at least 2 characters."),
  pwaBackgroundColor: z
    .string()
    .regex(/^#([0-9a-f]{3}){1,2}$/i, "Must be a valid hex color")
    .optional()
    .or(z.literal("")),
  schemaVersion: z.number().optional(),
  updatedAt: z.number().optional(),
});

type WebsiteConfigFormValues = z.infer<typeof websiteConfigSchema>;

const COLOR_PRESETS = [
  {
    name: "Velvet Obsidian",
    primary: "#e61e43",
    splash: "#0f0f0f",
    style: "glassmorphism" as const,
    class: "from-rose-500 to-rose-700 bg-rose-600",
  },
  {
    name: "Royal Navy",
    primary: "#2563eb",
    splash: "#ffffff",
    style: "classic" as const,
    class: "from-blue-500 to-blue-700 bg-blue-600",
  },
  {
    name: "Emerald Sanctuary",
    primary: "#059669",
    splash: "#f0fdfa",
    style: "minimal" as const,
    class: "from-emerald-500 to-emerald-700 bg-emerald-600",
  },
  {
    name: "Sunset Gold",
    primary: "#ca8a04",
    splash: "#fef3c7",
    style: "classic" as const,
    class: "from-yellow-500 to-yellow-600 bg-yellow-500",
  },
];

const PRESET_ICONS = [
  {
    id: "home",
    svg: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'%3E%3C/path%3E%3Cpolyline points='9 22 9 12 15 12 15 22'%3E%3C/polyline%3E%3C/svg%3E`,
    label: "Home Icon",
  },
  {
    id: "building",
    svg: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='4' y='2' width='16' height='20' rx='2' ry='2'%3E%3C/rect%3E%3Cpath d='M9 22v-4h6v4'%3E%3C/path%3E%3Cpath d='M8 6h.01'%3E%3C/path%3E%3Cpath d='M16 6h.01'%3E%3C/path%3E%3Cpath d='M8 10h.01'%3E%3C/path%3E%3Cpath d='M16 10h.01'%3E%3C/path%3E%3Cpath d='M8 14h.01'%3E%3C/path%3E%3Cpath d='M16 14h.01'%3E%3C/path%3E%3C/svg%3E`,
    label: "Building Icon",
  },
  {
    id: "shield",
    svg: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'%3E%3C/path%3E%3C/svg%3E`,
    label: "Secure Icon",
  },
  {
    id: "key",
    svg: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='7' cy='17' r='5'%3E%3C/circle%3E%3Cpath d='M12 12 22 2'%3E%3C/path%3E%3Cpath d='m18 7 3 3'%3E%3C/path%3E%3C/svg%3E`,
    label: "Key Icon",
  },
];

export default function WebsiteBuilderPage() {
  const { pgs, currentUser } = useAppSelector((state) => ({
    pgs: state.pgs.pgs,
    currentUser: state.user.currentUser,
  }));

  const currentPlan = getCurrentPlan(currentUser);
  const [siteConfig, setSiteConfig] = useState<SiteConfig | null>(null);
  const [viewMode, setViewMode] = useState<"loading" | "ready">("loading");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Wizard State
  const [currentStep, setCurrentStep] = useState(1);
  const [mobileTab, setMobileTab] = useState<"edit" | "preview">("edit");
  const [previewDevice, setPreviewDevice] = useState<"phone" | "desktop">(
    "phone",
  );
  const [previewScreen, setPreviewScreen] = useState<
    "web" | "app-icon" | "app-splash" | "app-dashboard"
  >("web");

  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);

  const [domain, setDomain] = useState("");
  const [isSaving, startTransition] = useTransition();
  const { toast } = useToast();

  useEffect(() => {
    const rawUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== "undefined" ? window.location.origin : "");
    try {
      const parsed = new URL(rawUrl);
      setDomain(parsed.host);
    } catch(e) {
      setDomain(typeof window !== "undefined" ? window.location.host : "");
    }
  }, []);

  const form = useForm<WebsiteConfigFormValues>({
    resolver: zodResolver(websiteConfigSchema),
    mode: "onChange",
    defaultValues: {
      siteTitle: "",
      subdomain: "",
      pwaShortName: "",
      contactPhone: "",
      contactEmail: "",
      themeColor: "#2563eb",
      pwaBackgroundColor: "#ffffff",
      logoUrl: "",
      faviconUrl: "",
      heroHeadline: "",
      heroSubtext: "",
      aboutTitle: "",
      aboutDescription: "",
      websiteStyle: "classic",
      listedPgs: [],
    },
  });

  const watchAll = form.watch();

  const appUrl = useMemo(() => {
    const subdomain = siteConfig?.subdomain || watchAll.subdomain;
    if (!subdomain) return "";
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : `https://${domain}`;
        
    try {
      const url = new URL(origin);
      let host = url.hostname;
      if (host.startsWith('www.')) host = host.substring(4);
      url.hostname = `${subdomain}.${host}`;
      return url.toString().replace(/\/+$/, '');
    } catch(e) {
      return `${origin}/site/${subdomain}`;
    }
  }, [siteConfig?.subdomain, watchAll.subdomain, domain]);

  const fetchConfig = async () => {
    if (!currentUser) return;
    setViewMode("loading");
    try {
      const config = await getSiteConfigForOwner(currentUser.id);
      if (config) {
        setSiteConfig(config);
        form.reset({
          ...config,
          websiteStyle: config.websiteStyle || "classic",
          pwaShortName: config.pwaShortName || config.siteTitle.slice(0, 12),
          pwaBackgroundColor: config.pwaBackgroundColor || "#ffffff",
        } as WebsiteConfigFormValues);
        setLogoPreview(config.logoUrl || null);
        setFaviconPreview(config.faviconUrl || null);
      } else {
        form.reset({
          siteTitle: `${currentUser.name || "My"}'s PG`,
          pwaShortName: currentUser.name
            ? currentUser.name.slice(0, 12)
            : "MyPG",
          contactEmail: currentUser.email || "",
          listedPgs: pgs.map((p) => p.id),
          heroHeadline: `Welcome to ${currentUser.name || "Our"} PG`,
          heroSubtext:
            "Premium living with comfort, convenience, and community.",
          aboutTitle: "A Better Way to Live Shared",
          aboutDescription: `We provide fully-furnished shared living spaces equipped with high-speed WiFi, laundry, daily meals, and 24/7 security. Our focus is safety, cleanliness, and hassle-free payments.`,
          websiteStyle: "classic",
          subdomain: "",
          contactPhone: currentUser.phone || "",
          logoUrl: "",
          faviconUrl: "",
          themeColor: "#2563eb",
          pwaBackgroundColor: "#ffffff",
        });
      }
    } catch (error) {
      console.error("Failed to fetch config:", error);
    } finally {
      setViewMode("ready");
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchConfig();
    }
  }, [currentUser?.id]);

  // Slugify siteTitle for subdomain placeholder
  useEffect(() => {
    if (!siteConfig && watchAll.siteTitle && !watchAll.subdomain) {
      const slug = watchAll.siteTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      form.setValue("subdomain", slug.slice(0, 20), { shouldValidate: true });
    }
  }, [watchAll.siteTitle, siteConfig]);

  // Update PWA Short Name if siteTitle changes and hasn't been edited
  useEffect(() => {
    if (watchAll.siteTitle && !watchAll.pwaShortName) {
      form.setValue("pwaShortName", watchAll.siteTitle.slice(0, 12), {
        shouldValidate: true,
      });
    }
  }, [watchAll.siteTitle]);

  const handleImageUpload = async (file: File, type: "logo" | "favicon") => {
    if (!currentUser) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
      const dataUri = reader.result as string;
      if (type === "logo") setLogoPreview(dataUri);
      if (type === "favicon") setFaviconPreview(dataUri);
      try {
        const url = await uploadDataUriToStorage(
          dataUri,
          `sites/${currentUser.id}/${type}`,
        );
        form.setValue(type === "logo" ? "logoUrl" : "faviconUrl", url, {
          shouldValidate: true,
        });
        toast({
          title: "Upload Successful",
          description: `${type === "logo" ? "Brand logo" : "Favicon"} uploaded and cached.`,
        });
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Upload Failed",
          description: "Could not upload image to server storage.",
        });
        if (type === "logo") setLogoPreview(siteConfig?.logoUrl || null);
        if (type === "favicon")
          setFaviconPreview(siteConfig?.faviconUrl || null);
      }
    };
  };

  const handlePresetSelect = (preset: (typeof COLOR_PRESETS)[0]) => {
    form.setValue("themeColor", preset.primary, { shouldValidate: true });
    form.setValue("pwaBackgroundColor", preset.splash, {
      shouldValidate: true,
    });
    form.setValue("websiteStyle", preset.style, { shouldValidate: true });
    toast({
      title: "Preset Applied",
      description: `Theme preset "${preset.name}" applied successfully.`,
    });
  };

  const handlePresetIconSelect = (svg: string) => {
    setFaviconPreview(svg);
    form.setValue("faviconUrl", svg, { shouldValidate: true });
    toast({
      title: "App Icon Selected",
      description: "Custom preset SVG app icon applied.",
    });
  };

  const onSubmit = (
    data: WebsiteConfigFormValues,
    status: "draft" | "published",
  ) => {
    if (!currentUser) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          "You must be authenticated to publish site configurations.",
      });
      return;
    }

    startTransition(async () => {
      const payload = {
        ...data,
        status,
        ownerId: currentUser.id,
        existingSubdomain: siteConfig?.subdomain,
        updatedAt: Date.now(),
      };
      const result = await saveSiteConfig(payload);

      if (result.success && result.config) {
        toast({
          title:
            status === "published" ? "Website Published Live!" : "Draft Saved",
          description: `Your custom domain & brand settings have been synchronized.`,
        });
        setSiteConfig(result.config);
        form.reset({
          ...result.config,
          websiteStyle: result.config.websiteStyle || "classic",
          pwaShortName:
            result.config.pwaShortName || result.config.siteTitle.slice(0, 12),
          pwaBackgroundColor: result.config.pwaBackgroundColor || "#ffffff",
        } as WebsiteConfigFormValues);
        setLogoPreview(result.config.logoUrl || null);
        setFaviconPreview(result.config.faviconUrl || null);
        setCurrentStep(6);
      } else {
        if (result.errorField === "subdomain") {
          form.setError("subdomain", { type: "manual", message: result.error });
          setCurrentStep(1);
        } else {
          toast({
            variant: "destructive",
            title: "Publish Failed",
            description: result.error,
          });
        }
      }
    });
  };

  const handleDelete = async () => {
    if (!siteConfig) return;
    setIsDeleting(true);
    const result = await deleteSiteConfig(siteConfig.subdomain);
    if (result.success) {
      toast({
        title: "Site Deleted",
        description: "Branded website and PWA configuration cleaned up.",
      });
      setSiteConfig(null);
      fetchConfig();
      setCurrentStep(1);
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: result.error,
      });
    }
    setIsDeleting(false);
    setIsDeleteDialogOpen(false);
  };

  const handleStatusToggle = async () => {
    if (!siteConfig) return;
    const newStatus =
      siteConfig.status === "published" ? "suspended" : "published";

    startTransition(async () => {
      const result = await updateSiteStatus(siteConfig.subdomain, newStatus);
      if (result.success && result.config) {
        setSiteConfig(result.config);
        toast({
          title: `Status: ${newStatus === "published" ? "Live" : "Suspended"}`,
          description: `Your app and website are now ${newStatus}.`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Status Update Failed",
          description: result.error,
        });
      }
    });
  };

  const handleCopyLink = async () => {
    if (!appUrl) return;
    const publicUrl = appUrl.split("?")[0];
    await navigator.clipboard.writeText(publicUrl);
    toast({ title: "Link Copied", description: "URL copied to clipboard." });
  };

  const handleShare = async () => {
    if (!appUrl) return;
    const publicUrl = appUrl.split("?")[0];
    try {
      if (navigator.share) {
        await navigator.share({
          title: watchAll.siteTitle,
          text: `Check out our digital hostel app and PG website!`,
          url: publicUrl,
        });
      } else {
        window.open(
          `https://wa.me/?text=${encodeURIComponent(`Check out our PG properties and branded mobile app: ${publicUrl}`)}`,
          "_blank",
        );
      }
    } catch (e) {
      handleCopyLink();
    }
  };

  if (viewMode === "loading") {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-4 w-2/3" />
        <Card className="border border-border/40">
          <CardContent className="p-8">
            <Skeleton className="h-72 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (currentPlan && !currentPlan.hasWebsiteBuilder) {
    return (
      <Card className="border border-border/40">
        <CardHeader>
          <CardTitle>Branding & Website Builder</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center text-center p-8 bg-muted/20 rounded-xl border border-dashed">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Globe className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground">
              Premium Feature
            </h2>
            <p className="mt-2 text-muted-foreground max-w-sm text-sm">
              The Website & PWA Builder is a premium service. Please upgrade
              your plan or recharge your wallet to proceed.
            </p>
            <Button className="mt-6 rounded-xl h-11" asChild>
              <Link href="/dashboard/wallet">Recharge Wallet</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const nextStep = async () => {
    let fieldsToValidate: Array<keyof WebsiteConfigFormValues> = [];
    if (currentStep === 1) {
      fieldsToValidate = ["siteTitle", "pwaShortName", "subdomain"];
    } else if (currentStep === 2) {
      fieldsToValidate = ["logoUrl", "faviconUrl"];
    } else if (currentStep === 3) {
      fieldsToValidate = ["themeColor", "pwaBackgroundColor", "websiteStyle"];
    } else if (currentStep === 4) {
      fieldsToValidate = [
        "heroHeadline",
        "heroSubtext",
        "aboutTitle",
        "aboutDescription",
        "listedPgs",
      ];
    }

    const isValid = await form.trigger(fieldsToValidate);
    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, 6));
      if (currentStep === 1) setPreviewScreen("web");
      if (currentStep === 2) setPreviewScreen("app-icon");
      if (currentStep === 3) setPreviewScreen("app-splash");
    } else {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description:
          "Please fill in all required fields correctly before moving on.",
      });
    }
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const stepsList = [
    { num: 1, label: "Identity" },
    { num: 2, label: "Brand Logos" },
    { num: 3, label: "Style Presets" },
    { num: 4, label: "Hostel Details" },
    { num: 5, label: "Visual Review" },
    { num: 6, label: "Publish Info" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <Globe className="w-8 h-8 text-primary" /> Branding & Web OS
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Build your independent digital presence, brand, and downloadable PWA
            app.
          </p>
        </div>

        {siteConfig && (
          <div className="flex items-center gap-3 bg-muted/40 border p-2.5 rounded-xl text-sm">
            <div className="flex items-center space-x-2">
              <Switch
                id="site-status"
                checked={siteConfig.status === "published"}
                onCheckedChange={handleStatusToggle}
                disabled={isSaving}
              />
              <Label
                htmlFor="site-status"
                className="flex items-center gap-1.5 font-bold cursor-pointer"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                ) : siteConfig.status === "published" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <PowerOff className="w-4 h-4 text-rose-500" />
                )}
                {siteConfig.status === "published"
                  ? "Website Live"
                  : "Suspended"}
              </Label>
            </div>
          </div>
        )}
      </div>

      <div className="lg:hidden grid grid-cols-2 bg-muted p-1 rounded-xl h-11">
        <Button
          variant={mobileTab === "edit" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setMobileTab("edit")}
          className="rounded-lg font-bold"
        >
          1. Edit Builder Form
        </Button>
        <Button
          variant={mobileTab === "preview" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setMobileTab("preview")}
          className="rounded-lg font-bold"
        >
          2. Live Preview
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div
          className={cn(
            "lg:col-span-7 space-y-6",
            mobileTab !== "edit" && "hidden lg:block",
          )}
        >
          <Card className="border border-border/40 shadow-sm overflow-hidden">
            <div className="bg-muted/30 border-b p-6 pb-4">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Step {currentStep} of 6
                </span>
                <span className="text-xs font-extrabold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                  {stepsList[currentStep - 1].label}
                </span>
              </div>
              <div className="grid grid-cols-6 gap-1.5 h-1.5 bg-muted rounded-full overflow-hidden">
                {stepsList.map((step) => (
                  <div
                    key={step.num}
                    className={cn(
                      "rounded-full transition-all duration-300",
                      currentStep >= step.num ? "bg-primary" : "bg-border",
                    )}
                  />
                ))}
              </div>
            </div>

            <CardContent className="p-8">
              <Form {...form}>
                <form className="space-y-8">
                  {currentStep === 1 && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                      <div className="border-b pb-4">
                        <h3 className="text-lg font-bold text-foreground">
                          PG Brand Identity
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Configure your brand details and secure your unique
                          subdomain.
                        </p>
                      </div>

                      <FormField
                        control={form.control}
                        name="siteTitle"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-bold">
                              Brand / PG App Name
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g. Skyline Elite PG"
                                className="h-12 rounded-xl"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              The primary title appearing in search results, app
                              installs, and headers.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="pwaShortName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-bold">
                              Home Screen App Label
                            </FormLabel>
                            <FormControl>
                              <Input
                                maxLength={12}
                                placeholder="e.g. Skyline"
                                className="h-12 rounded-xl"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              The shorter label shown below the app icon on
                              mobile home screens (Max 12 chars).
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="subdomain"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-bold">
                              App & Website Subdomain
                            </FormLabel>
                            <FormControl>
                              <div className="flex flex-col sm:flex-row sm:items-center rounded-xl overflow-hidden border bg-background">
                                <Input
                                  placeholder="skyline-pg"
                                  className="h-12 rounded-none border-0 focus-visible:ring-0 flex-1 min-w-0"
                                  {...field}
                                />
                                <span className="bg-muted px-4 py-3 text-xs sm:text-sm font-semibold text-muted-foreground border-t sm:border-t-0 sm:border-l isolate whitespace-nowrap text-center">
                                  .{domain.replace(/^www\./, "")}
                                </span>
                              </div>
                            </FormControl>
                            <FormDescription>
                              Your site will be accessible instantly at this
                              link. Use lowercase letters, numbers, and hyphens.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {currentStep === 2 && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                      <div className="border-b pb-4">
                        <h3 className="text-lg font-bold text-foreground">
                          Brand Assets & Icons
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Upload high-resolution logos or choose from our
                          quick-preset SVGs.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                        <FormField
                          control={form.control}
                          name="logoUrl"
                          render={() => (
                            <FormItem className="space-y-4">
                              <FormLabel className="font-bold">
                                Brand Logo (Header)
                              </FormLabel>
                              <div className="h-28 border border-dashed rounded-xl flex items-center justify-center bg-muted/10 overflow-hidden relative">
                                {logoPreview ? (
                                  <Image
                                    src={logoPreview}
                                    alt="Logo Preview"
                                    width={180}
                                    height={80}
                                    className="object-contain max-h-24"
                                  />
                                ) : (
                                  <div className="text-center p-4">
                                    <span className="text-xs text-muted-foreground block font-bold">
                                      No Logo Uploaded
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">
                                      Used on navbar (192x96 px)
                                    </span>
                                  </div>
                                )}
                              </div>
                              <FormControl>
                                <Input
                                  type="file"
                                  accept="image/*"
                                  className="rounded-xl h-11"
                                  onChange={(e) =>
                                    e.target.files?.[0] &&
                                    handleImageUpload(e.target.files[0], "logo")
                                  }
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="faviconUrl"
                          render={() => (
                            <FormItem className="space-y-4">
                              <FormLabel className="font-bold">
                                App Icon / Favicon
                              </FormLabel>
                              <div className="h-28 border border-dashed rounded-xl flex items-center justify-center bg-muted/10 overflow-hidden relative">
                                {faviconPreview ? (
                                  <div className="w-16 h-16 rounded-2xl overflow-hidden bg-primary flex items-center justify-center">
                                    <img
                                      src={faviconPreview}
                                      alt="App Icon Preview"
                                      className="w-12 h-12 object-contain"
                                    />
                                  </div>
                                ) : (
                                  <div className="text-center p-4">
                                    <span className="text-xs text-muted-foreground block font-bold">
                                      Default App Launcher
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">
                                      Square icon recommended (1:1)
                                    </span>
                                  </div>
                                )}
                              </div>
                              <FormControl>
                                <Input
                                  type="file"
                                  accept="image/*"
                                  className="rounded-xl h-11"
                                  onChange={(e) =>
                                    e.target.files?.[0] &&
                                    handleImageUpload(
                                      e.target.files[0],
                                      "favicon",
                                    )
                                  }
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="space-y-3 pt-4 border-t">
                        <Label className="font-bold">
                          Choose a Quick Icon Preset
                        </Label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {PRESET_ICONS.map((item) => (
                            <Button
                              key={item.id}
                              type="button"
                              variant="outline"
                              onClick={() => handlePresetIconSelect(item.svg)}
                              className="h-16 flex flex-col items-center justify-center gap-1 border-border/60 rounded-xl hover:bg-muted/50"
                            >
                              <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
                                <img
                                  src={item.svg}
                                  className="w-4 h-4"
                                  alt={item.label}
                                />
                              </div>
                              <span className="text-[10px] font-bold text-muted-foreground">
                                {item.label}
                              </span>
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {currentStep === 3 && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                      <div className="border-b pb-4">
                        <h3 className="text-lg font-bold text-foreground">
                          Visual Style & Themes
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Apply preconfigured design styles or customize your
                          primary palette.
                        </p>
                      </div>

                      <div className="space-y-3">
                        <Label className="font-bold text-sm">
                          Theme Design Presets
                        </Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {COLOR_PRESETS.map((preset) => (
                            <div
                              key={preset.name}
                              onClick={() => handlePresetSelect(preset)}
                              className="border p-4 rounded-xl cursor-pointer hover:border-primary transition-all bg-card shadow-sm flex items-center gap-3 active:scale-[0.98]"
                            >
                              <div
                                className={cn(
                                  "w-6 h-6 rounded-full shrink-0 bg-gradient-to-tr",
                                  preset.class,
                                )}
                              />
                              <div className="text-left">
                                <h4 className="text-xs font-extrabold text-foreground">
                                  {preset.name}
                                </h4>
                                <span className="text-[9px] uppercase font-bold text-muted-foreground block mt-0.5">
                                  {preset.style}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                        <FormField
                          control={form.control}
                          name="themeColor"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-bold">
                                Primary Brand Color
                              </FormLabel>
                              <FormControl>
                                <div className="flex gap-3 items-center">
                                  <div className="relative w-11 h-11 rounded-xl overflow-hidden border shadow-sm cursor-pointer shrink-0">
                                    <input
                                      type="color"
                                      className="absolute -top-4 -left-4 w-20 h-20 cursor-pointer"
                                      {...field}
                                    />
                                  </div>
                                  <Input
                                    className="h-11 rounded-xl uppercase font-mono"
                                    {...field}
                                  />
                                </div>
                              </FormControl>
                              <FormDescription>
                                Applied to buttons, badges, and active state
                                highlights.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="pwaBackgroundColor"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-bold">
                                Splash Screen Background
                              </FormLabel>
                              <FormControl>
                                <div className="flex gap-3 items-center">
                                  <div className="relative w-11 h-11 rounded-xl overflow-hidden border shadow-sm cursor-pointer shrink-0">
                                    <input
                                      type="color"
                                      className="absolute -top-4 -left-4 w-20 h-20 cursor-pointer"
                                      {...field}
                                    />
                                  </div>
                                  <Input
                                    className="h-11 rounded-xl uppercase font-mono"
                                    {...field}
                                  />
                                </div>
                              </FormControl>
                              <FormDescription>
                                Background color while opening the installed
                                mobile app.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="websiteStyle"
                        render={({ field }) => (
                          <FormItem className="space-y-3 pt-4 border-t">
                            <FormLabel className="font-bold">
                              Website Style Template
                            </FormLabel>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              {["classic", "minimal", "glassmorphism"].map(
                                (style) => (
                                  <Button
                                    key={style}
                                    type="button"
                                    variant={
                                      field.value === style
                                        ? "default"
                                        : "outline"
                                    }
                                    onClick={() => field.onChange(style)}
                                    className="h-14 rounded-xl capitalize font-bold text-xs"
                                  >
                                    {style === "classic" && (
                                      <Globe className="w-4 h-4 mr-1.5" />
                                    )}
                                    {style === "minimal" && (
                                      <Brush className="w-4 h-4 mr-1.5" />
                                    )}
                                    {style === "glassmorphism" && (
                                      <Sparkles className="w-4 h-4 mr-1.5" />
                                    )}
                                    {style}
                                  </Button>
                                ),
                              )}
                            </div>
                            <FormDescription>
                              Controls layout density, card styles, and shadows
                              across the generated site.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {currentStep === 4 && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                      <div className="border-b pb-4">
                        <h3 className="text-lg font-bold text-foreground">
                          Site Text Content
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Configure your headline, descriptions, and list
                          specific properties.
                        </p>
                      </div>

                      <FormField
                        control={form.control}
                        name="heroHeadline"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-bold">
                              Hero Headline Title
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g. Premium Living Spaces For Professionals"
                                className="h-12 rounded-xl"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="heroSubtext"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-bold">
                              Hero Subtext Description
                            </FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Comfortable, fully-managed co-living spaces."
                                className="rounded-xl"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="aboutTitle"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-bold">
                                About Section Title
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="A Better Way to Live"
                                  className="h-11 rounded-xl"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="contactPhone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-bold">
                                Contact Phone (WhatsApp)
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="e.g. 919876543210"
                                  className="h-11 rounded-xl"
                                  {...field}
                                />
                              </FormControl>
                              <FormDescription>
                                Must include country code (e.g. 91... for
                                India).
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="aboutDescription"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-bold">
                              About Description
                            </FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Tell your brand story and services details..."
                                className="rounded-xl"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="listedPgs"
                        render={() => (
                          <FormItem className="space-y-3 pt-4 border-t">
                            <FormLabel className="font-bold">
                              Properties to List on Public Site
                            </FormLabel>
                            <FormDescription>
                              Select which of your properties should be listed
                              on the public domain.
                            </FormDescription>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                              {pgs.map((pg) => (
                                <FormField
                                  key={pg.id}
                                  control={form.control}
                                  name="listedPgs"
                                  render={({ field }) => (
                                    <div className="flex items-center gap-3 p-3 border rounded-xl bg-card hover:bg-muted/20">
                                      <Checkbox
                                        checked={field.value?.includes(pg.id)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([
                                                ...(field.value || []),
                                                pg.id,
                                              ])
                                            : field.onChange(
                                                field.value?.filter(
                                                  (value) => value !== pg.id,
                                                ),
                                              );
                                        }}
                                      />
                                      <div className="text-left leading-none">
                                        <span className="text-xs font-bold block text-foreground">
                                          {pg.name}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground">
                                          {pg.location}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                />
                              ))}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {currentStep === 5 && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                      <div className="border-b pb-4">
                        <h3 className="text-lg font-bold text-foreground">
                          Pre-Publishing Verification
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Review details before committing deployment settings.
                        </p>
                      </div>

                      <div className="space-y-4">
                        <div className="flex justify-between items-center bg-muted/30 p-4 rounded-xl border text-sm">
                          <div>
                            <span className="font-bold text-foreground block">
                              Site Subdomain
                            </span>
                            <span className="font-mono text-xs text-muted-foreground">
                              {watchAll.subdomain}.{domain}
                            </span>
                          </div>
                          <span className="text-xs text-primary bg-primary/10 px-2.5 py-1 rounded-full font-bold self-start sm:self-auto">
                            Active
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-muted/10 p-4 rounded-xl border">
                          <div>
                            <span className="text-muted-foreground font-bold">
                              Brand Title:
                            </span>
                            <p className="font-bold text-foreground mt-0.5">
                              {watchAll.siteTitle}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground font-bold">
                              App Icon Name:
                            </span>
                            <p className="font-bold text-foreground mt-0.5">
                              {watchAll.pwaShortName}
                            </p>
                          </div>
                          <div className="mt-2">
                            <span className="text-muted-foreground font-bold">
                              Primary Palette:
                            </span>
                            <div className="flex items-center gap-1.5 mt-1 font-mono">
                              <div
                                className="w-4 h-4 rounded-full border"
                                style={{ backgroundColor: watchAll.themeColor }}
                              />
                              {watchAll.themeColor}
                            </div>
                          </div>
                          <div className="mt-2">
                            <span className="text-muted-foreground font-bold">
                              Style Template:
                            </span>
                            <p className="font-bold text-foreground mt-0.5 capitalize">
                              {watchAll.websiteStyle}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 flex gap-3 text-xs leading-relaxed text-primary">
                        <Info className="w-5 h-5 shrink-0 mt-0.5" />
                        <div>
                          <strong>Immediate Sync:</strong> Publishing updates
                          both the public SEO-optimized landing website and the
                          offline-capable PWA manifest within minutes.
                        </div>
                      </div>
                    </div>
                  )}

                  {currentStep === 6 && (
                    <div className="space-y-6 animate-in fade-in duration-300 text-center">
                      <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-8 h-8" />
                      </div>
                      <div>
                        <h3 className="text-xl font-extrabold text-foreground">
                          Your Web App is Live!
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1.5 max-w-sm mx-auto">
                          Properties and branding have been deployed under your
                          custom subdomain URL.
                        </p>
                      </div>

                      <Alert className="text-left border-emerald-500/20 bg-emerald-500/[0.02] p-4 rounded-2xl max-w-md mx-auto">
                        <Globe className="h-5 h-5 text-emerald-500 shrink-0" />
                        <AlertTitle className="font-bold text-foreground">
                          Public Website & App Link
                        </AlertTitle>
                        <AlertDescription className="mt-1 flex items-center justify-between gap-4 font-mono text-xs break-all">
                          <a
                            href={appUrl.split("?")[0]}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline font-bold"
                          >
                            {appUrl.split("?")[0]}
                          </a>
                        </AlertDescription>
                      </Alert>

                      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto pt-4 border-t">
                        {appUrl ? (
                          <div className="p-3 border rounded-2xl bg-white shadow-sm shrink-0">
                            <Image
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(appUrl.split("?")[0])}`}
                              width={140}
                              height={140}
                              alt="QR code for app"
                            />
                          </div>
                        ) : (
                          <Skeleton className="w-36 h-36" />
                        )}
                        <div className="flex flex-col gap-2 w-full text-left">
                          <span className="text-xs font-bold text-muted-foreground block mb-1">
                            Spread the Word
                          </span>
                          <Button
                            className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                            onClick={handleShare}
                          >
                            <Share2 className="mr-2 h-4 w-4" /> Share with
                            Tenants
                          </Button>
                          <Button
                            variant="outline"
                            className="w-full h-11 rounded-xl font-bold"
                            onClick={handleCopyLink}
                          >
                            <Copy className="mr-2 h-4 w-4 text-primary" /> Copy
                            Link
                          </Button>
                        </div>
                      </div>

                      <div className="pt-6">
                        <Button
                          variant="ghost"
                          onClick={() => setCurrentStep(5)}
                          className="font-bold text-sm"
                        >
                          Modify branding or list more properties
                        </Button>
                      </div>
                    </div>
                  )}

                  {currentStep <= 5 && (
                    <div className="flex justify-between items-center gap-4 pt-6 border-t mt-8">
                      {currentStep > 1 ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={prevStep}
                          disabled={isSaving}
                          className="rounded-xl h-12 font-bold px-5"
                        >
                          <ChevronLeft className="mr-1.5 w-5 h-5" /> Back
                        </Button>
                      ) : (
                        <div />
                      )}

                      {currentStep < 5 ? (
                        <Button
                          type="button"
                          onClick={nextStep}
                          className="rounded-xl h-12 font-bold px-6 ml-auto"
                        >
                          Next Step <ChevronRight className="ml-1.5 w-5 h-5" />
                        </Button>
                      ) : (
                        <div className="flex gap-2.5 ml-auto">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={form.handleSubmit((data) =>
                              onSubmit(data, "draft"),
                            )}
                            disabled={isSaving}
                            className="rounded-xl h-12 font-bold px-5 border-owner-primary/20 hover:bg-owner-light"
                          >
                            {isSaving && (
                              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                            )}
                            Save Draft
                          </Button>
                          <Button
                            type="button"
                            onClick={form.handleSubmit((data) =>
                              onSubmit(data, "published"),
                            )}
                            disabled={isSaving}
                            className="rounded-xl h-12 font-bold px-6"
                          >
                            {isSaving && (
                              <Loader2 className="mr-1.5 h-4 w-4 animate-spin text-white" />
                            )}
                            {siteConfig ? "Update & Publish" : "Publish Live"}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {currentStep === 6 && (
                    <div className="flex justify-end gap-2 pt-6 border-t mt-8">
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => setIsDeleteDialogOpen(true)}
                        className="rounded-xl h-11 font-bold"
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete Site
                      </Button>
                      <Button
                        type="button"
                        onClick={() => setCurrentStep(1)}
                        className="rounded-xl h-11 font-bold"
                      >
                        Edit Brand
                      </Button>
                    </div>
                  )}
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        <div
          className={cn(
            "lg:col-span-5 space-y-6",
            mobileTab !== "preview" && "hidden lg:block",
          )}
        >
          <div className="sticky top-6 space-y-4 text-center">
            <div className="flex justify-between items-center px-2">
              <h3 className="text-lg font-bold flex items-center gap-2 text-foreground">
                <Smartphone className="w-5 h-5 text-primary" /> Visual Preview
                Simulator
              </h3>

              <div className="flex bg-muted p-1 rounded-xl text-xs gap-1 border">
                <Button
                  variant={previewScreen === "web" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setPreviewScreen("web")}
                  className="rounded-lg font-bold py-1 h-7 text-[10px]"
                >
                  Website
                </Button>
                <Button
                  variant={previewScreen !== "web" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => {
                    setPreviewScreen("app-dashboard");
                    setPreviewDevice("phone");
                  }}
                  className="rounded-lg font-bold py-1 h-7 text-[10px]"
                >
                  PWA App
                </Button>
              </div>
            </div>

            <div className="flex justify-center items-center w-full">
              {previewDevice === "phone" ? (
                <div className="relative w-[285px] h-[580px] bg-slate-950 rounded-[3rem] p-3 shadow-2xl ring-4 ring-slate-800 flex flex-col justify-between overflow-hidden">
                  <div className="absolute top-0 inset-x-0 h-6 flex justify-center items-center z-30">
                    <div className="w-20 h-4 bg-black rounded-b-xl border-t border-slate-800" />
                  </div>

                  <div className="relative w-full h-full bg-background rounded-[2.2rem] overflow-hidden flex flex-col justify-between text-left select-none text-xs">
                    {previewScreen === "web" && (
                      <div
                        className={cn(
                          "w-full h-full flex flex-col overflow-y-auto pt-6",
                          watchAll.websiteStyle === "glassmorphism" &&
                            "bg-slate-950 text-slate-100",
                          watchAll.websiteStyle === "minimal" &&
                            "bg-white text-slate-900",
                          watchAll.websiteStyle === "classic" &&
                            "bg-slate-50 text-slate-900",
                        )}
                        style={
                          {
                            "--owner-primary": watchAll.themeColor,
                          } as React.CSSProperties
                        }
                      >
                        <style
                          dangerouslySetInnerHTML={{
                            __html: `
                          .mock-primary-bg { background-color: ${watchAll.themeColor} !important; }
                          .mock-primary-text { color: ${watchAll.themeColor} !important; }
                          .mock-primary-border { border-color: ${watchAll.themeColor} !important; }
                          .mock-primary-bg-light { background-color: ${watchAll.themeColor}10 !important; }
                          .mock-glass { background: rgba(255,255,255,0.03); backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.08); }
                          .mock-minimal { background: #ffffff; border: 1px solid #0f172a; border-radius: 0px !important; }
                        `,
                          }}
                        />

                        <div className="p-3 border-b flex justify-between items-center bg-background/80 backdrop-blur-md sticky top-0 z-20">
                          <span className="font-extrabold tracking-tight text-[11px] truncate w-32">
                            {watchAll.siteTitle || "Skyline PG"}
                          </span>
                          {logoPreview ? (
                            <img
                              src={logoPreview}
                              className="h-4 object-contain"
                              alt="logo"
                            />
                          ) : (
                            <Building className="w-4 h-4 mock-primary-text" />
                          )}
                        </div>

                        <div
                          className={cn(
                            "p-4 py-8 text-center space-y-2 relative border-b",
                            watchAll.websiteStyle === "glassmorphism" &&
                              "bg-gradient-to-b from-owner-primary/10 to-transparent",
                          )}
                        >
                          <h4
                            className={cn(
                              "text-sm font-extrabold tracking-tight leading-tight",
                              watchAll.websiteStyle === "minimal" &&
                                "font-serif uppercase",
                            )}
                          >
                            {watchAll.heroHeadline || "Premium Living Shared"}
                          </h4>
                          <p className="text-[10px] text-muted-foreground leading-normal px-2">
                            {watchAll.heroSubtext ||
                              "Comfortable & Hassle-Free Living."}
                          </p>
                          <div className="pt-2 flex justify-center gap-1.5">
                            <div className="mock-primary-bg text-white font-bold px-3 py-1 rounded-md text-[8px]">
                              Properties
                            </div>
                            <div className="border border-border bg-background px-3 py-1 rounded-md text-[8px] font-bold">
                              App Login
                            </div>
                          </div>
                        </div>

                        <div className="p-4 space-y-2">
                          <span className="mock-primary-bg-light mock-primary-text px-2 py-0.5 rounded-full text-[7px] font-bold uppercase tracking-wider inline-block">
                            About Us
                          </span>
                          <h5 className="font-bold text-[11px]">
                            {watchAll.aboutTitle || "A Better Way to Live"}
                          </h5>
                          <p className="text-[9px] text-muted-foreground leading-relaxed">
                            {watchAll.aboutDescription ||
                              "Fully-furnished shared living spaces equipped with WiFi, security, and food."}
                          </p>
                        </div>

                        <div className="p-4 space-y-3 bg-muted/10 border-t">
                          <span className="font-bold text-[10px] block">
                            Listed Properties
                          </span>
                          {pgs.filter((p) => watchAll.listedPgs?.includes(p.id))
                            .length > 0 ? (
                            pgs
                              .filter((p) => watchAll.listedPgs?.includes(p.id))
                              .map((pg) => (
                                <div
                                  key={pg.id}
                                  className={cn(
                                    "border p-2.5 rounded-lg flex gap-2 bg-background",
                                    watchAll.websiteStyle === "glassmorphism" &&
                                      "mock-glass",
                                    watchAll.websiteStyle === "minimal" &&
                                      "mock-minimal",
                                  )}
                                >
                                  <div className="w-12 h-12 relative rounded overflow-hidden shrink-0">
                                    <Image
                                      src={pg.images[0]}
                                      fill
                                      className="object-cover"
                                      alt="pg"
                                    />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <span className="font-extrabold text-[9px] block truncate">
                                      {pg.name}
                                    </span>
                                    <span className="text-[7px] text-muted-foreground truncate block">
                                      {pg.location}
                                    </span>
                                    <span className="text-[8px] font-bold block mt-1 mock-primary-text">
                                      ₹{pg.priceRange.min}/mo
                                    </span>
                                  </div>
                                </div>
                              ))
                          ) : (
                            <div className="text-center p-3 text-[9px] text-muted-foreground italic border border-dashed rounded-lg">
                              No properties selected yet
                            </div>
                          )}
                        </div>

                        <div className="mock-primary-bg p-5 text-center text-white space-y-2 mt-auto">
                          <span className="font-bold text-[11px] block">
                            Looking for a Room?
                          </span>
                          <div className="bg-white text-[9px] font-bold rounded-lg py-1.5 text-slate-900 inline-block px-4 mx-auto cursor-pointer">
                            Contact Manager
                          </div>
                        </div>
                      </div>
                    )}

                    {previewScreen === "app-icon" && (
                      <div className="w-full h-full bg-slate-950 p-6 pt-12 flex flex-col justify-start animate-in fade-in duration-300">
                        <div className="grid grid-cols-4 gap-4 mt-6">
                          <div className="flex flex-col items-center gap-1.5">
                            <div
                              className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden shadow-lg border"
                              style={{ backgroundColor: watchAll.themeColor }}
                            >
                              {faviconPreview ? (
                                <img
                                  src={faviconPreview}
                                  alt="App Icon"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Building className="w-6 h-6 text-white" />
                              )}
                            </div>
                            <span className="text-[8px] font-bold text-slate-300 truncate w-full text-center">
                              {watchAll.pwaShortName || "MyPG"}
                            </span>
                          </div>
                          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                            <div
                              key={i}
                              className="flex flex-col items-center gap-1.5 opacity-20"
                            >
                              <div className="w-12 h-12 rounded-xl bg-slate-700" />
                              <div className="w-8 h-2 bg-slate-700 rounded-full" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {previewScreen === "app-splash" && (
                      <div
                        className="w-full h-full flex flex-col items-center justify-center relative animate-in zoom-in-95 fade-in duration-300"
                        style={{
                          backgroundColor:
                            watchAll.pwaBackgroundColor || "#ffffff",
                        }}
                      >
                        <div
                          className="w-24 h-24 rounded-[1.8rem] shadow-xl flex items-center justify-center overflow-hidden border-2 border-white bg-white"
                          style={{ backgroundColor: watchAll.themeColor }}
                        >
                          {faviconPreview ? (
                            <img
                              src={faviconPreview}
                              alt="App Logo"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Building className="w-10 h-10 text-white" />
                          )}
                        </div>
                        <h4
                          className="text-sm font-black tracking-tight mt-4"
                          style={{ color: watchAll.themeColor }}
                        >
                          {watchAll.siteTitle || "Skyline PG"}
                        </h4>
                        <div className="absolute bottom-8 flex flex-col items-center gap-2">
                          <Loader2
                            className="w-4 h-4 animate-spin"
                            style={{ color: watchAll.themeColor }}
                          />
                          <p className="text-[7px] uppercase font-bold tracking-widest opacity-40">
                            Powered by RentSutra
                          </p>
                        </div>
                      </div>
                    )}

                    {previewScreen === "app-dashboard" && (
                      <div className="w-full h-full bg-slate-900 text-slate-100 flex flex-col justify-between p-4 pt-12 animate-in fade-in duration-300">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-8 h-8 rounded-lg overflow-hidden bg-primary flex items-center justify-center shrink-0"
                            style={{ backgroundColor: watchAll.themeColor }}
                          >
                            {faviconPreview ? (
                              <img
                                src={faviconPreview}
                                alt="Logo"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Building className="w-4 h-4 text-white" />
                            )}
                          </div>
                          <div>
                            <span className="font-extrabold text-[10px] block">
                              {watchAll.siteTitle || "Skyline PG"}
                            </span>
                            <span className="text-[7px] text-slate-400 font-medium">
                              Tenant Mobile Dashboard
                            </span>
                          </div>
                        </div>

                        <div className="my-auto space-y-4">
                          <div className="bg-slate-800/80 border border-slate-700/50 p-4 rounded-xl space-y-3">
                            <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400 block">
                              Outstanding Dues
                            </span>
                            <div className="flex justify-between items-end">
                              <span className="text-lg font-black tracking-tight text-white">
                                ₹8,500
                              </span>
                              <span className="text-[8px] font-bold text-rose-400">
                                Due in 3 days
                              </span>
                            </div>
                            <div
                              className="w-full py-2.5 rounded-lg text-white font-bold text-center text-[9px] shadow-lg cursor-pointer"
                              style={{ backgroundColor: watchAll.themeColor }}
                            >
                              Pay Rent Now
                            </div>
                          </div>

                          <div className="bg-slate-800/40 border border-slate-700/30 p-3 rounded-lg flex items-center justify-between text-[8px] text-slate-300">
                            <span className="flex items-center gap-1.5">
                              <Info className="w-3.5 h-3.5 text-blue-400" />{" "}
                              Maintenance complaint is resolved.
                            </span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </div>
                        </div>

                        <div className="flex justify-around items-center bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/50 text-[7px] text-slate-400 font-bold mt-auto">
                          <div
                            className="flex flex-col items-center gap-0.5"
                            style={{ color: watchAll.themeColor }}
                          >
                            <HomeIcon className="w-4.5 h-4.5" /> Home
                          </div>
                          <div className="flex flex-col items-center gap-0.5">
                            <IndianRupee className="w-4.5 h-4.5" /> Receipts
                          </div>
                          <div className="flex flex-col items-center gap-0.5">
                            <MessageSquare className="w-4.5 h-4.5" /> Support
                          </div>
                        </div>
                      </div>
                    )}

                    {previewScreen !== "app-splash" && (
                      <div className="w-full flex justify-center py-1 mt-auto shrink-0 bg-background/90 z-20">
                        <div className="w-20 h-1 bg-slate-600 rounded-full" />
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="relative w-full max-w-lg aspect-[16/10] bg-slate-900 rounded-xl p-2.5 shadow-2xl ring-2 ring-slate-800 flex flex-col">
                  <div className="w-full flex justify-between items-center py-1.5 px-3 border-b border-slate-800 shrink-0">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-rose-500" />
                      <div className="w-2 h-2 rounded-full bg-yellow-500" />
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    </div>
                    <div className="bg-slate-800 px-3 py-0.5 rounded text-[8px] text-slate-400 font-mono w-48 truncate">
                      {watchAll.subdomain || "brand"}.{domain}
                    </div>
                    <div className="w-4" />
                  </div>

                  <div className="w-full h-full bg-slate-50 text-slate-950 overflow-y-auto text-[10px] flex flex-col justify-between">
                    <div className="p-4 py-8 text-center bg-white border-b space-y-3">
                      <h4 className="text-base font-extrabold tracking-tight">
                        {watchAll.heroHeadline || "Headline"}
                      </h4>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        {watchAll.heroSubtext || "Subtext description."}
                      </p>
                      <div
                        className="inline-block py-1.5 px-4 rounded-lg text-white font-bold cursor-pointer text-[9px]"
                        style={{ backgroundColor: watchAll.themeColor }}
                      >
                        Explore Properties
                      </div>
                    </div>
                    <div className="p-4 space-y-2 bg-white">
                      <span className="font-bold text-[9px]">
                        About Our Properties
                      </span>
                      <p className="text-slate-500 leading-relaxed text-[9px]">
                        {watchAll.aboutDescription}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2.5 items-center bg-muted/30 border p-3 rounded-2xl max-w-[285px] mx-auto text-xs">
              {previewScreen === "web" && (
                <div className="flex gap-1.5">
                  <Button
                    variant={previewDevice === "phone" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setPreviewDevice("phone")}
                    className="h-8 rounded-lg font-bold px-3 text-[11px]"
                  >
                    <Smartphone className="w-4 h-4 mr-1" /> Mobile
                  </Button>
                  <Button
                    variant={
                      previewDevice === "desktop" ? "secondary" : "ghost"
                    }
                    size="sm"
                    onClick={() => setPreviewDevice("desktop")}
                    className="h-8 rounded-lg font-bold px-3 text-[11px]"
                  >
                    <Laptop className="w-4 h-4 mr-1" /> Desktop
                  </Button>
                </div>
              )}

              {previewScreen !== "web" && (
                <div className="flex gap-1 bg-muted p-0.5 rounded-lg border w-full justify-around text-[9px] font-bold">
                  <span
                    onClick={() => setPreviewScreen("app-icon")}
                    className={cn(
                      "py-1 px-2 rounded cursor-pointer transition-all",
                      previewScreen === "app-icon"
                        ? "bg-background text-primary"
                        : "text-muted-foreground",
                    )}
                  >
                    App Icon
                  </span>
                  <span
                    onClick={() => setPreviewScreen("app-splash")}
                    className={cn(
                      "py-1 px-2 rounded cursor-pointer transition-all",
                      previewScreen === "app-splash"
                        ? "bg-background text-primary"
                        : "text-muted-foreground",
                    )}
                  >
                    Splash Screen
                  </span>
                  <span
                    onClick={() => setPreviewScreen("app-dashboard")}
                    className={cn(
                      "py-1 px-2 rounded cursor-pointer transition-all",
                      previewScreen === "app-dashboard"
                        ? "bg-background text-primary"
                        : "text-muted-foreground",
                    )}
                  >
                    App Dashboard
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-extrabold text-foreground">
              Are you absolutely sure?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              This will permanently delete your public PG website at{" "}
              <span className="font-mono font-bold text-foreground">
                {siteConfig?.subdomain}.{domain}
              </span>{" "}
              and erase your custom PWA settings. This action is irreversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2.5">
            <AlertDialogCancel className="rounded-xl font-bold">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90 text-white font-bold rounded-xl px-5"
            >
              {isDeleting && (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin text-white" />
              )}
              Delete Everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
