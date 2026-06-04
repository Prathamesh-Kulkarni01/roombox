"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building, MapPin, ArrowLeft, Loader2, Save, Users, Camera, Wifi, Droplets, Utensils, Tv, Car, Shield } from "lucide-react";
import { useDashboard } from "@/hooks/use-dashboard";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageDropzone } from "@/components/ui/image-dropzone";
import { Checkbox } from "@/components/ui/checkbox";
import { canAccess } from "@/lib/permissions";
import { useAppSelector } from "@/lib/hooks";
import { usePermissionsStore } from "@/lib/stores/configStores";

const AMENITIES_LIST = [
  { id: "wifi", label: "High-Speed WiFi", icon: Wifi },
  { id: "ac", label: "Air Conditioning", icon: Tv }, // Close enough
  { id: "water", label: "24/7 Water", icon: Droplets },
  { id: "meals", label: "Meals Included", icon: Utensils },
  { id: "parking", label: "Parking Space", icon: Car },
  { id: "security", label: "CCTV & Security", icon: Shield },
];

const editPgSchema = z.object({
  name: z.string().min(3, "Property name must be at least 3 characters."),
  location: z.string().min(3, "Location is required."),
  city: z.string().min(2, "City is required."),
  gender: z.enum(["male", "female", "co-ed", "co-living"]),
  amenities: z.array(z.string()).default([]),
  images: z.array(z.string()).default([]),
  upiId: z.string().optional(),
  payeeName: z.string().optional(),
  paymentMode: z.enum(["CASH_ONLY", "DIRECT_UPI", "GATEWAY"]).default("CASH_ONLY"),
  online_payment_enabled: z.boolean().default(false),
});

type EditPgFormValues = z.infer<typeof editPgSchema>;

export default function PgSettingsPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const { pgs, isLoadingPgs, updateProperty } = useDashboard();
  const { currentUser } = useAppSelector((state) => state.user);
  const { featurePermissions } = usePermissionsStore();
  
  const pgId = params.pgId as string;
  const pg = useMemo(() => pgs.find((p) => p.id === pgId), [pgs, pgId]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canEdit = canAccess(featurePermissions, currentUser?.role, "properties", "edit");

  const form = useForm<EditPgFormValues>({
    resolver: zodResolver(editPgSchema),
    defaultValues: {
      name: "",
      location: "",
      city: "",
      gender: "co-ed",
      amenities: [],
      images: [],
      upiId: "",
      payeeName: "",
      paymentMode: "CASH_ONLY",
      online_payment_enabled: false,
    },
  });

  useEffect(() => {
    if (pg) {
      form.reset({
        name: pg.name || "",
        location: pg.location || "",
        city: pg.city || "",
        gender: pg.gender === "co-living" ? "co-living" : (pg.gender as any) || "co-ed",
        amenities: pg.amenities || [],
        images: pg.images || [],
        upiId: pg.upiId || "",
        payeeName: pg.payeeName || "",
        paymentMode: (pg.paymentMode as any) || "CASH_ONLY",
        online_payment_enabled: pg.online_payment_enabled || false,
      });
    }
  }, [pg, form]);

  const onSubmit = async (data: EditPgFormValues) => {
    if (!canEdit) {
      toast({
        variant: "destructive",
        title: "Permission Denied",
        description: "You do not have permission to edit properties.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Direct upi implies UPI ID must be there if selected
      if (data.paymentMode === "DIRECT_UPI" && !data.upiId) {
        toast({
          variant: "destructive",
          title: "Missing UPI ID",
          description: "Please provide a valid UPI ID for Direct UPI payments.",
        });
        setIsSubmitting(false);
        return;
      }

      await updateProperty({ pgId, updates: data }).unwrap();
      
      toast({
        title: "Property Updated",
        description: "Your property settings have been saved successfully.",
      });
      
      router.push(`/dashboard/pg-management/${pgId}`);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error saving property",
        description: error.data?.message || error.message || "An unexpected error occurred.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingPgs || !pg) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] space-y-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2 text-center">
          <Skeleton className="h-4 w-40 mx-auto" />
          <Skeleton className="h-3 w-60 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto pb-16">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/dashboard/pg-management/${pgId}`)}
          className="rounded-full"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            Property Settings
          </h1>
          <p className="text-muted-foreground text-sm">
            Manage {pg.name}'s details, photos, and preferences.
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          
          {/* Basic Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5 text-primary" /> Basic Details
              </CardTitle>
              <CardDescription>
                Core information about your property.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Property Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Skyline Residency" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tenant Preference</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender restriction" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="co-ed">Co-ed / Any</SelectItem>
                        <SelectItem value="co-living">Co-living</SelectItem>
                        <SelectItem value="male">Male only (Boys PG)</SelectItem>
                        <SelectItem value="female">Female only (Girls PG)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location Area</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input className="pl-9" placeholder="e.g. Koramangala" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Bangalore" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Property Photos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-primary" /> Property Photos
              </CardTitle>
              <CardDescription>
                Upload images to showcase your property to potential tenants.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="images"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <ImageDropzone 
                        value={field.value} 
                        onChange={field.onChange} 
                        multiple={true}
                        className="w-full"
                      />
                    </FormControl>
                    <FormDescription>
                      Upload up to 5 high-quality images. The first image will be used as the primary cover.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Amenities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" /> Amenities
              </CardTitle>
              <CardDescription>
                Select the facilities available at this property.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="amenities"
                render={() => (
                  <FormItem>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {AMENITIES_LIST.map((item) => (
                        <FormField
                          key={item.id}
                          control={form.control}
                          name="amenities"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={item.id}
                                className="flex flex-row items-start space-x-3 space-y-0 rounded-xl border p-4 hover:bg-muted/50 transition-colors"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(item.id)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...(field.value || []), item.id])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) => value !== item.id
                                            )
                                          )
                                    }}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none flex items-center gap-2">
                                  <item.icon className="w-4 h-4 text-muted-foreground" />
                                  <FormLabel className="font-medium cursor-pointer">
                                    {item.label}
                                  </FormLabel>
                                </div>
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

          {/* Payment Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" /> Payment Settings
              </CardTitle>
              <CardDescription>
                Configure how tenants can pay rent for this property.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="paymentMode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Payment Mode</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment mode" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="CASH_ONLY">Cash / Offline Only</SelectItem>
                        <SelectItem value="DIRECT_UPI">Direct UPI (0% Fee)</SelectItem>
                        <SelectItem value="GATEWAY">Payment Gateway (Razorpay)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.watch("paymentMode") === "DIRECT_UPI" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-xl border bg-muted/20 animate-in fade-in zoom-in-95 duration-200">
                  <FormField
                    control={form.control}
                    name="upiId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Your UPI ID</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. phone@upi" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="payeeName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payee Name (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Name registered with UPI" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <FormField
                control={form.control}
                name="online_payment_enabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-xl border p-4 shadow-sm bg-muted/20">
                    <div className="space-y-1">
                      <FormLabel className="text-sm font-semibold">Enable In-App Payments</FormLabel>
                      <FormDescription className="text-xs">
                        Allow tenants to pay directly through the app using their preferred mode.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end pt-4">
            <Button 
              type="submit" 
              size="lg" 
              disabled={isSubmitting || !canEdit}
              className="w-full sm:w-auto min-w-[200px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" /> Save Changes
                </>
              )}
            </Button>
          </div>

        </form>
      </Form>
    </div>
  );
}
