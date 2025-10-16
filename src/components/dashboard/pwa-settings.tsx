import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import type { PWAConfig } from '@/lib/types';

const pwaConfigSchema = z.object({
  name: z.string().min(2).max(50),
  shortName: z.string().min(2).max(12),
  themeColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/),
  backgroundColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/),
  logo: z.string().url().optional(),
  subdomain: z.string().min(3).max(20).regex(/^[a-z0-9-]+$/).optional(),
});

export function PWASettings() {
  const { toast } = useToast();
  const form = useForm<PWAConfig>({
    resolver: zodResolver(pwaConfigSchema),
    defaultValues: {
      name: '',
      shortName: '',
      themeColor: '#000000',
      backgroundColor: '#ffffff',
    },
  });

  const onSubmit = async (data: PWAConfig) => {
    try {
      // Get the current user's token
      const user = auth.currentUser;
      if (!user) {
        throw new Error('Not authenticated');
      }
      
      const token = await user.getIdToken();
      
      // Save PWA configuration to your backend
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
        description: "Your branded PWA configuration has been saved. Changes will be available in a few minutes.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save PWA configuration. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Branded PWA Settings</CardTitle>
        <CardDescription>
          Customize your Progressive Web App for your PG business. Your tenants will be able to install it as a mobile app.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>App Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Your PG Name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="shortName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Short Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Short name for app icon" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="themeColor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Theme Color</FormLabel>
                  <FormControl>
                    <Input {...field} type="color" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="backgroundColor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Background Color</FormLabel>
                  <FormControl>
                    <Input {...field} type="color" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="subdomain"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Custom Subdomain (Optional)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="your-pg" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="logo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Logo URL (Optional)</FormLabel>
                  <FormControl>
                    <Input {...field} type="url" placeholder="https://yourdomain.com/logo.png" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit">Save PWA Settings</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}