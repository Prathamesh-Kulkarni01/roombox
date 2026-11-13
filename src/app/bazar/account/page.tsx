'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  ArrowLeft, 
  User, 
  MapPin, 
  Heart, 
  CreditCard, 
  Globe, 
  Bell, 
  Headphones, 
  Settings, 
  ShieldCheck, 
  FileText, 
  ChevronRight,
  LogOut,
  Edit2
} from 'lucide-react';
import { NativeAppBottomNav } from '@/modules/bazar/components/NativeAppBottomNav';

interface AccountMenuItem {
  id: string;
  labelMarathi: string;
  labelEn: string;
  icon: React.ElementType;
  trailingText?: string;
  href?: string;
}

export default function MyAccountPage() {
  const [selectedLanguage, setSelectedLanguage] = useState<'mr' | 'en'>('mr');

  const menuSections: { title?: string; items: AccountMenuItem[] }[] = [
    {
      items: [
        { id: 'profile', labelMarathi: 'माझी माहिती', labelEn: 'Personal Information', icon: User },
        { id: 'addresses', labelMarathi: 'डिलिव्हरी पत्ते', labelEn: 'Saved Addresses', icon: MapPin, trailingText: '3' },
        { id: 'favorites', labelMarathi: 'माझी आवडती उत्पादने', labelEn: 'My Favourites', icon: Heart, trailingText: '12' },
        { id: 'payment', labelMarathi: 'पेमेंट पद्धती', labelEn: 'Payment Methods', icon: CreditCard },
      ]
    },
    {
      items: [
        { id: 'language', labelMarathi: 'भाषा / Language', labelEn: 'मराठी (Marathi)', icon: Globe, trailingText: 'मराठी' },
        { id: 'notifications', labelMarathi: 'सूचना', labelEn: 'Notifications', icon: Bell },
        { id: 'support', labelMarathi: 'मदत आणि संपर्क', labelEn: 'Help & Support', icon: Headphones },
        { id: 'settings', labelMarathi: 'अॅप सेटिंग्स', labelEn: 'App Settings', icon: Settings },
      ]
    },
    {
      items: [
        { id: 'privacy', labelMarathi: 'गोपनीयता धोरण', labelEn: 'Privacy Policy', icon: ShieldCheck },
        { id: 'terms', labelMarathi: 'अटी व शर्ती', labelEn: 'Terms & Conditions', icon: FileText },
      ]
    }
  ];

  return (
    <div className="w-full min-h-screen bg-[#F8FAF9] text-[#0F1713] flex justify-center pb-24 selection:bg-[#0D7C4D]/20">
      {/* Mobile-First Frame (430px max width on desktop) */}
      <div className="w-full max-w-[430px] bg-[#FFFFFF] min-h-screen shadow-md flex flex-col relative border-x border-[#E5E9E6]">
        
        {/* ─────────────────────────────────────────────────────────────
            1. TOP APP BAR (Back & Title)
        ───────────────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-30 bg-[#FFFFFF] border-b border-[#E5E9E6] px-4 pt-3 pb-2.5">
          <div className="flex items-center gap-2">
            <Link
              href="/bazar"
              className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-[#F2F4F3] active:scale-90 transition-all text-[#0F1713]"
            >
              <ArrowLeft className="h-5 w-5 stroke-[2.2]" />
            </Link>
            <h1 className="font-black text-base text-[#0F1713]">
              माझे खाते <span className="text-[#8A948D] font-normal text-xs">(My Account)</span>
            </h1>
          </div>
        </header>

        {/* ─────────────────────────────────────────────────────────────
            2. USER PROFILE HERO CARD (Matching Row 2, Screen 5)
        ───────────────────────────────────────────────────────────── */}
        <div className="p-4 border-b border-[#F2F4F3] bg-[#FAFBFB]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative h-14 w-14 rounded-full overflow-hidden bg-[#0D7C4D] text-white flex items-center justify-center font-black text-base shadow-xs border-2 border-white">
                <Image
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80"
                  alt="Profile"
                  fill
                  className="object-cover"
                />
              </div>

              <div>
                <h2 className="font-black text-sm text-[#0F1713]">
                  Prathamesh Kulkarni
                </h2>
                <p className="text-xs text-[#8A948D] font-medium mt-0.5">
                  +91 98765 43210
                </p>
                <p className="text-[11px] text-[#0D7C4D] font-bold flex items-center gap-1 mt-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#0D7C4D]" />
                  Verified Customer (Palus)
                </p>
              </div>
            </div>

            <button className="text-xs font-bold text-[#0D7C4D] flex items-center gap-1 bg-[#E8F5EE] px-2.5 py-1 rounded-full active:scale-95 transition-all">
              <Edit2 className="h-3 w-3" />
              <span>Edit</span>
            </button>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            3. ACCOUNT SETTINGS MENU LIST
        ───────────────────────────────────────────────────────────── */}
        <main className="p-4 space-y-4 flex-1">
          {menuSections.map((sec, secIdx) => (
            <div 
              key={secIdx} 
              className="bg-[#FFFFFF] rounded-2xl border border-[#E5E9E6] overflow-hidden divide-y divide-[#F2F4F3] shadow-2xs"
            >
              {sec.items.map(item => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.id}
                    className="p-3.5 flex items-center justify-between hover:bg-[#FAFBFB] active:bg-[#F2F4F3] cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-xl bg-[#F2F4F3] text-[#525C56] flex items-center justify-center">
                        <Icon className="h-4 w-4 stroke-[2]" />
                      </div>

                      <div>
                        <p className="font-bold text-xs text-[#0F1713]">
                          {item.labelMarathi}
                        </p>
                        <p className="text-[10px] text-[#8A948D]">
                          {item.labelEn}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-[#8A948D]">
                      {item.trailingText && (
                        <span className="font-bold text-[#0D7C4D] bg-[#E8F5EE] px-2 py-0.5 rounded-full text-[11px]">
                          {item.trailingText}
                        </span>
                      )}
                      <ChevronRight className="h-4 w-4 stroke-[2]" />
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          {/* App Version Info */}
          <div className="text-center pt-2 pb-6 space-y-1">
            <p className="text-[11px] font-bold text-[#8A948D]">
              Bazar Instant Commerce · v1.2.0 (Stable)
            </p>
            <p className="text-[10px] text-[#A0A7A2]">
              Designed with ❤️ for Rural & Town Commerce
            </p>
          </div>
        </main>

        {/* ─────────────────────────────────────────────────────────────
            4. NATIVE BOTTOM NAVIGATION BAR (Account Active)
        ───────────────────────────────────────────────────────────── */}
        <NativeAppBottomNav />

      </div>
    </div>
  );
}

