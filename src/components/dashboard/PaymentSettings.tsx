
'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/context/language-context';
import { useAppSelector } from '@/lib/hooks';
import { auth } from '@/lib/firebase';
import { useGetPropertiesQuery, useUpdatePropertyMutation } from '@/lib/api/apiSlice';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, QrCode, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Image from 'next/image';

const formSchema = z.object({
  upiId: z.string().optional(),
  payeeName: z.string().optional(),
});

interface PaymentSettingsProps {
  onSwitchToOnline?: () => void;
}

export default function PaymentSettings({ onSwitchToOnline }: PaymentSettingsProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { selectedPgId } = useAppSelector((state) => state.app);
  const { data: pgsData, isLoading: isLoadingPgs } = useGetPropertiesQuery();
  const [updateProperty, { isLoading: isUpdating }] = useUpdatePropertyMutation();
  
  const [activePgId, setActivePgId] = useState<string | null>(selectedPgId);
  const [qrPreview, setQrPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const selectedPg = pgsData?.buildings?.find(p => p.id === activePgId);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      upiId: selectedPg?.upiId || '',
      payeeName: selectedPg?.payeeName || '',
    },
  });

  useEffect(() => {
    if (selectedPg) {
      form.reset({
        upiId: selectedPg.upiId || '',
        payeeName: selectedPg.payeeName || '',
      });
      setQrPreview(selectedPg.qrCodeImage || null);
    }
  }, [selectedPg, form]);

  useEffect(() => {
    if (pgsData?.buildings?.length && !activePgId) {
      setActivePgId(pgsData.buildings[0].id);
    }
  }, [pgsData, activePgId]);

  const saveSettings = async (values: z.infer<typeof formSchema>, newQrUrl?: string) => {
    if (!activePgId) return;

    setIsSaving(true);
    try {
      const qrUrl = newQrUrl !== undefined ? newQrUrl : qrPreview;
      const hasOnlineDetails = !!values.upiId || !!qrUrl;
      
      const updates: any = {
        paymentMode: hasOnlineDetails ? 'DIRECT_UPI' : 'CASH_ONLY',
        online_payment_enabled: hasOnlineDetails,
        upiId: values.upiId || '',
        payeeName: values.payeeName || '',
        qrCodeImage: qrUrl || '',
      };

      await updateProperty({
        pgId: activePgId,
        updates,
      }).unwrap();

    } catch (error: any) {
      toast({
        title: "Auto-save failed",
        description: error.data?.error || "Failed to update settings",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-save logic for text fields
  const watchUpiId = form.watch('upiId');
  const watchPayeeName = form.watch('payeeName');

  useEffect(() => {
    const timer = setTimeout(() => {
        if (activePgId && selectedPg) {
            const hasChanged = 
                watchUpiId !== (selectedPg.upiId || '') || 
                watchPayeeName !== (selectedPg.payeeName || '');
            
            if (hasChanged) {
                saveSettings({ upiId: watchUpiId, payeeName: watchPayeeName });
            }
        }
    }, 1000);
    return () => clearTimeout(timer);
  }, [watchUpiId, watchPayeeName, activePgId, selectedPg]);

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 2MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      try {
        if (!auth?.currentUser) {
          throw new Error('Not authenticated');
        }

        const token = await auth.currentUser.getIdToken();

        const response = await fetch('/api/upload', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            dataUri: base64,
            folder: 'qrcodes',
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Upload failed");
        }

        const data = await response.json();
        setQrPreview(data.url);
        // Save immediately on QR upload
        await saveSettings({ ...form.getValues() }, data.url);
        toast({ title: "Success", description: "QR Code uploaded successfully" });
      } catch (error: any) {
        toast({
          title: "Upload Failed",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  if (isLoadingPgs) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto px-4 md:px-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 md:p-8 bg-primary/5 rounded-[2rem] border border-primary/10 shadow-sm">
        <div>
          <h3 className="text-xl font-black tracking-tight text-foreground">Select Property</h3>
          <p className="text-[0.65rem] text-primary/70 font-black uppercase tracking-[0.15em]">Configure settings per PG</p>
        </div>
        {pgsData?.buildings && pgsData.buildings.length > 0 && (
          <Select value={activePgId || ''} onValueChange={setActivePgId}>
            <SelectTrigger className="w-full md:w-[260px] h-12 bg-white rounded-xl border-blue-200 shadow-sm font-bold text-blue-900">
              <SelectValue placeholder="Select Property" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {pgsData.buildings.map((pg) => (
                <SelectItem key={pg.id} value={pg.id} className="font-medium">
                  {pg.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <Form {...form}>
        <form onSubmit={(e) => e.preventDefault()} className="space-y-8">
            <Card className="border-emerald-500/20 shadow-2xl rounded-[2.5rem] overflow-hidden bg-emerald-500/[0.02] backdrop-blur-sm relative">
                {(isSaving || isUploading || isUpdating) && (
                    <div className="absolute top-4 right-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full animate-pulse z-20">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Saving...
                    </div>
                )}
              <CardHeader className="p-6 md:p-10 border-b bg-emerald-500/[0.05]">
                <div className="flex items-center gap-5">
                    <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                        <QrCode className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div>
                        <CardTitle className="text-2xl md:text-3xl font-black tracking-tight text-foreground">UPI & QR Setup</CardTitle>
                        <CardDescription className="text-sm md:text-base font-medium">Add details to enable Direct UPI flow for tenants. Leaving these empty will default to Manual/Cash payments.</CardDescription>
                    </div>
                </div>
              </CardHeader>
              
              <CardContent className="p-6 md:p-10 space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <FormField
                    control={form.control}
                    name="payeeName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-black text-[0.65rem] uppercase tracking-[0.2em] text-emerald-600/70 mb-2 block">Full Payee Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Ashish PG" className="h-16 rounded-2xl border-emerald-500/20 bg-emerald-500/[0.02] shadow-sm text-lg font-bold px-6 focus:ring-emerald-500/20 focus:border-emerald-500" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="upiId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-black text-[0.65rem] uppercase tracking-[0.2em] text-emerald-600/70 mb-2 block">UPI Address (VPA)</FormLabel>
                        <FormControl>
                          <Input placeholder="ashish@okaxis" className="h-16 rounded-2xl border-emerald-500/20 bg-emerald-500/[0.02] shadow-sm text-lg font-mono lowercase px-6 focus:ring-emerald-500/20 focus:border-emerald-500" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-6">
                  <FormLabel className="font-black text-[0.65rem] uppercase tracking-[0.2em] text-emerald-600/70 mb-2 block">Payment QR Code</FormLabel>
                  <div className="flex flex-col md:flex-row items-center gap-8 p-6 md:p-8 bg-background/50 rounded-[2rem] border border-emerald-500/10 shadow-inner overflow-hidden">
                    <div className="relative group w-full md:w-56 h-64 md:h-56 border-4 border-emerald-500/10 rounded-[2.5rem] flex items-center justify-center bg-emerald-500/[0.02] overflow-hidden shadow-lg transition-all hover:border-emerald-500/30">
                      {qrPreview ? (
                        <Image
                          src={qrPreview}
                          alt="QR Code"
                          fill
                          className="object-contain p-4 group-hover:scale-110 transition-transform duration-500"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-3 opacity-30 group-hover:opacity-50 transition-opacity">
                            <QrCode className="h-16 w-16 text-emerald-600" />
                            <span className="text-[0.55rem] font-black uppercase tracking-widest text-center">No Image<br/>Uploaded</span>
                        </div>
                      )}
                      
                      <label className="absolute inset-0 bg-emerald-600/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-white backdrop-blur-md">
                        <Upload className="h-8 w-8 mb-2" />
                        <span className="text-[0.6rem] font-black uppercase tracking-widest">Change Photo</span>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={handleQrUpload}
                          disabled={isUploading}
                        />
                      </label>
                      
                      {isUploading && (
                        <div className="absolute inset-0 bg-background/80 flex items-center justify-center backdrop-blur-sm">
                          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 space-y-6 w-full text-center md:text-left">
                        <div className="p-5 rounded-2xl bg-emerald-500/[0.03] border border-emerald-500/10">
                            <p className="text-sm font-medium text-emerald-800/80 mb-2 leading-relaxed">
                                Upload your PG's payment QR code.
                            </p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">
                                Supports JPG, PNG • Max 2MB
                            </p>
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            className="w-full md:w-auto h-14 px-8 rounded-2xl border-emerald-500/20 text-emerald-700 hover:bg-emerald-500 hover:text-white font-black uppercase tracking-widest text-xs transition-all shadow-sm"
                            asChild
                        >
                            <label className="cursor-pointer">
                                <Upload className="mr-2 h-4 w-4" />
                                {qrPreview ? 'Replace QR Image' : 'Upload QR Image'}
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleQrUpload}
                                    disabled={isUploading}
                                />
                            </label>
                        </Button>
                    </div>
                  </div>
                </div>
              </CardContent>

                <div className="p-6 md:p-10 bg-muted/10 border-t">
                    <p className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-muted-foreground/50 text-center flex items-center justify-center gap-2">
                        <ShieldCheck className="w-3 h-3 text-emerald-600/50" /> 
                        Changes save automatically and sync with all tenants.
                    </p>
                </div>
            </Card>
        </form>
      </Form>
    </div>
  );
}
