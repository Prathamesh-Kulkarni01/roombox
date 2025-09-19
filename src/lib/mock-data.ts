
import type { Menu, Plan, PlanName, PG } from './types';
import { Home, Building, Users, Wand2, UserCircle, LogOut, UtensilsCrossed, Wallet, Settings, MessageSquareWarning, Contact, ChevronsUpDown, Globe, BookUser, CreditCard, BookOpen, IndianRupee } from 'lucide-react';


export const defaultMenu: Menu = {
  monday: { breakfast: 'Poha, Tea', lunch: 'Roti, Mixed Veg, Dal Tadka, Rice', dinner: 'Paneer Butter Masala, Roti, Salad' },
  tuesday: { breakfast: 'Upma, Coffee', lunch: 'Roti, Aloo Gobi, Dal Fry, Rice', dinner: 'Chole, Bhature, Onion Salad' },
  wednesday: { breakfast: 'Idli Sambar', lunch: 'Roti, Rajma, Jeera Rice', dinner: 'Veg Pulao, Raita, Papad' },
  thursday: { breakfast: 'Aloo Paratha, Curd', lunch: 'Roti, Bhindi Masala, Dal Makhani, Rice', dinner: 'Kadhi Pakoda, Rice, Roti' },
  friday: { breakfast: 'Masala Dosa', lunch: 'Roti, Lauki Sabzi, Chana Dal, Rice', dinner: 'Veg Biryani, Raita' },
  saturday: { breakfast: 'Bread Omelette', lunch: 'Roti, Baingan Bharta, Arhar Dal, Rice', dinner: 'Pav Bhaji' },
  sunday: { breakfast: 'Puri Sabji', lunch: 'Special Thali (Chef\'s choice)', dinner: 'Noodles, Manchurian' },
}

export const PRICING_CONFIG = {
    perProperty: 100, // ₹100 per property per month
    perTenant: 20, // ₹20 per tenant per month
    premiumFeatures: {
        website: {
            name: 'Website Builder',
            monthlyCharge: 20, // Flat monthly fee
            billingType: 'monthly' as const,
        },
        kyc: {
            name: 'Automated KYC',
            monthlyCharge: 50, // Flat monthly fee for KYC access
            billingType: 'monthly' as const,
        },
        whatsapp: {
            name: 'WhatsApp Automation',
            perTenantCharge: 30, // Per-tenant charge for WhatsApp services
            billingType: 'per_tenant' as const,
        }
    }
};

export const plans: Record<PlanName, Plan> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    pricePeriod: 'Forever',
    description: "For single property owners just starting out. No cloud backup.",
    pgLimit: 1,
    floorLimit: 2,
    hasComplaints: true,
    hasStaffManagement: false,
    hasAiRentReminders: false,
    hasSeoGenerator: false,
    hasKycVerification: false,
    hasAutomatedWhatsapp: false,
    hasMarketplace: false,
    hasCloudSync: false,
    hasWebsiteBuilder: false,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 199,
    pricePeriod: '/property/month',
    description: "Unlock powerful automation and analytics for unlimited properties.",
    pgLimit: 'unlimited',
    floorLimit: 'unlimited',
    hasComplaints: true,
    hasStaffManagement: true,
    hasAiRentReminders: true,
    hasSeoGenerator: true,
    hasKycVerification: true,
    hasAutomatedWhatsapp: true,
    hasMarketplace: false,
    hasCloudSync: true,
    hasWebsiteBuilder: true,
  }
};

export interface NavItem {
    href: string;
    label: string;
    icon: React.ElementType;
    feature?: string;
    tourId?: string;
}

export const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: Home, feature: 'properties', tourId: 'dashboard-nav' },
  { href: '/dashboard/rent-passbook', label: 'Rentbook', icon: BookUser, feature: 'finances' },
  { href: '/dashboard/complaints', label: 'Complaints', icon: MessageSquareWarning, feature: 'complaints' },
  { href: '/dashboard/expense', label: 'Expenses', icon: Wallet, feature: 'finances' },
  { href: '/dashboard/food', label: 'Food Menu', icon: UtensilsCrossed, feature: 'food' },
  { href: '/dashboard/pg-management', label: 'Properties', icon: Building, feature: 'properties', tourId: 'pg-management-nav' },
  { href: '/dashboard/tenant-management', label: 'Guests', icon: Users, feature: 'guests' },
  { href: '/dashboard/staff', label: 'Staff', icon: Contact, feature: 'staff' },
  { href: '/dashboard/payouts', label: 'Payouts', icon: IndianRupee, feature: 'finances' },
  { href: '/dashboard/website', label: 'Website', icon: Globe, feature: 'website' },
  { href: '/dashboard/seo-generator', label: 'AI SEO', icon: Wand2, feature: 'seo' },
  { href: '/dashboard/training', label: 'Training Center', icon: BookOpen, feature: 'core' },
  { href: '/dashboard/subscription', label: 'Subscription', icon: CreditCard, feature: 'core' },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings, feature: 'core' },
];

// This is temporary mock data for the public PG pages.
// In a real app, you would fetch this from a public Firestore collection.
export const mockPgs: PG[] = [
  {
    id: 'sunshine-pg',
    ownerId: 'mock-owner',
    name: 'Sunshine PG',
    location: 'Koramangala, Bangalore',
    city: 'Bangalore',
    gender: 'female',
    images: [
      "https://placehold.co/1200x600.png",
      "https://placehold.co/600x400.png",
      "https://placehold.co/600x400.png",
    ],
    rating: 4.5,
    occupancy: 25,
    totalBeds: 30,
    rules: [
      'No guests allowed after 10 PM.',
      'Maintain cleanliness in common areas.',
      'Rent to be paid by the 5th of every month.',
    ],
    contact: '+919876543210',
  },
];
