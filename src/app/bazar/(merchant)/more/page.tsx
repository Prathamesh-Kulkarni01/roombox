'use client';

import { useState } from 'react';
import { 
  Store, 
  Clock, 
  MapPin, 
  Phone, 
  ShieldCheck, 
  Percent, 
  Power, 
  Languages, 
  Users, 
  HelpCircle,
  ChevronRight,
  ExternalLink,
  QrCode,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

export default function BazarMorePage() {
  const { toast } = useToast();
  const [onlinePaused, setOnlinePaused] = useState(false);
  const [lang, setLang] = useState<'mr' | 'en'>('mr');

  const handleTogglePause = () => {
    const next = !onlinePaused;
    setOnlinePaused(next);
    toast({
      title: next ? 'Online Orders Paused' : 'Online Orders Resumed',
      description: next 
        ? 'Your physical shop stays open. Online customers will see "Busy/Paused".' 
        : 'Customers can place delivery and counter pickup orders.',
    });
  };

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      {/* Profile & Shop Header */}
      <div className="bg-white border border-border p-4 rounded-2xl flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-emerald-50 text-[#0D7C4D] flex items-center justify-center font-bold">
            <Store className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-base text-foreground">श्री महालक्ष्मी सुपर बझार</h1>
              <Badge variant="outline" className="text-[10px] bg-emerald-50 text-[#0D7C4D] border-emerald-200">
                Verified Store
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">मेन रोड, बस स्टँड जवळ, पलूस (सांगली)</p>
          </div>
        </div>

        <Button variant="outline" size="sm" asChild className="h-8 text-xs font-semibold">
          <Link href="/bazar/store/fresh-mart" target="_blank">
            <ExternalLink className="h-3.5 w-3.5 mr-1 text-emerald-600" />
            Preview
          </Link>
        </Button>
      </div>

      {/* Emergency Action: Pause Online Orders */}
      <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center justify-between shadow-xs">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Power className="h-4 w-4 text-amber-700" />
            <span className="font-bold text-xs text-amber-900">
              Emergency Pause Online Orders (ऑर्डर्स थांबवा)
            </span>
          </div>
          <p className="text-[11px] text-amber-800">
            If store gets overcrowded, pause new online orders without closing your shop.
          </p>
        </div>
        <Switch
          checked={onlinePaused}
          onCheckedChange={handleTogglePause}
          aria-label="Pause online orders"
        />
      </div>

      {/* Section 1: Store Operations */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
          Store Operations (दुकान कामकाज)
        </h2>
        <Card className="rounded-2xl border-border divide-y divide-border overflow-hidden bg-white shadow-xs">
          {/* Google Sheets Sync */}
          <Link href="/bazar/sheets-sync" className="p-3.5 flex items-center justify-between hover:bg-muted/40 transition-colors">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <FileSpreadsheet className="h-4 w-4" />
              </div>
              <div>
                <p className="font-bold text-xs">Google Sheets Live Sync</p>
                <p className="text-[11px] text-muted-foreground">Manage your stock directly in Google Sheets</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>

          {/* Timings */}
          <div className="p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <p className="font-bold text-xs">Opening Hours (वेळापत्रक)</p>
                <p className="text-[11px] text-muted-foreground">7:00 AM – 10:00 PM (Daily)</p>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px]">Open Daily</Badge>
          </div>

          {/* Delivery Settings */}
          <div className="p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
                <MapPin className="h-4 w-4" />
              </div>
              <div>
                <p className="font-bold text-xs">Delivery Radius (वितरण क्षेत्र)</p>
                <p className="text-[11px] text-muted-foreground">Palus & 5 km surrounding radius</p>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px]">5 km Radius</Badge>
          </div>
        </Card>
      </div>

      {/* Section 2: Preferences & Support */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
          App Settings & Language (भाषा आणि सपोर्ट)
        </h2>
        <Card className="rounded-2xl border-border divide-y divide-border overflow-hidden bg-white shadow-xs">
          {/* Language Switch */}
          <div className="p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-50 text-[#0D7C4D] flex items-center justify-center">
                <Languages className="h-4 w-4" />
              </div>
              <div>
                <p className="font-bold text-xs">Application Language</p>
                <p className="text-[11px] text-muted-foreground">मराठी / English</p>
              </div>
            </div>
            <div className="flex gap-1 bg-muted p-1 rounded-lg">
              <button
                onClick={() => setLang('mr')}
                className={`text-xs font-bold px-2.5 py-1 rounded-md transition-colors ${
                  lang === 'mr' ? 'bg-[#0D7C4D] text-white' : 'text-muted-foreground'
                }`}
              >
                मराठी
              </button>
              <button
                onClick={() => setLang('en')}
                className={`text-xs font-bold px-2.5 py-1 rounded-md transition-colors ${
                  lang === 'en' ? 'bg-[#0D7C4D] text-white' : 'text-muted-foreground'
                }`}
              >
                English
              </button>
            </div>
          </div>

          {/* Help & WhatsApp Support */}
          <a
            href={`https://wa.me/${(process.env.NEXT_PUBLIC_SUPPORT_PHONE || '918067528791').replace(/\D/g, '')}?text=Hello%20Bazar%20Support%2C%20I%20need%20help%20with%20my%20store.`}
            target="_blank"
            rel="noreferrer"
            className="p-3.5 flex items-center justify-between hover:bg-muted/40 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Phone className="h-4 w-4" />
              </div>
              <div>
                <p className="font-bold text-xs">Merchant Helpdesk (मदत केंद्र)</p>
                <p className="text-[11px] text-muted-foreground">Chat directly on WhatsApp with Bazar Support</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </a>
        </Card>
      </div>

      {/* App Version Info */}
      <div className="text-center text-xs text-muted-foreground pt-2">
        <p className="font-semibold">Bazar Merchant Operating System v2.1</p>
        <p className="text-[10px]">Built for Palus, Tasgaon, Islampur & Sangli Retailers</p>
      </div>
    </div>
  );
}

