
import type { Menu, Plan, PlanName, PG } from './types';
import { Home, Building, Users, Wand2, UserCircle, LogOut, UtensilsCrossed, Wallet, Settings, MessageSquareWarning, Contact, ChevronsUpDown, Globe, BookUser, CreditCard, BookOpen, IndianRupee, HandCoins, ShieldCheck, AppWindow, MessageCircle } from 'lucide-react';


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
    hasDedicatedDb: false,
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
    hasDedicatedDb: false,
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    pricePeriod: '/per year',
    description: "For large chains requiring data isolation and premium support.",
    pgLimit: 'unlimited',
    floorLimit: 'unlimited',
    hasComplaints: true,
    hasStaffManagement: true,
    hasAiRentReminders: true,
    hasSeoGenerator: true,
    hasKycVerification: true,
    hasAutomatedWhatsapp: true,
    hasMarketplace: true,
    hasCloudSync: true,
    hasWebsiteBuilder: true,
    hasDedicatedDb: true,
  }
};

export interface NavItem {
    href: string;
    label: string;
    icon: React.ElementType;
    description: string;
    feature?: string;
    tourId?: string;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const allNavItems: NavGroup[] = [
  {
    title: "nav_group_core",
    items: [
        { href: '/dashboard', label: 'nav_dashboard', icon: Home, feature: 'properties', tourId: 'dashboard-nav', description: 'nav_dashboard_desc' },
        { href: '/dashboard/pg-management', label: 'nav_properties', icon: Building, feature: 'properties', tourId: 'pg-management-nav', description: 'nav_properties_desc' },
        { href: '/dashboard/tenant-management', label: 'nav_guests', icon: Users, feature: 'guests', description: 'nav_guests_desc' },
        { href: '/dashboard/kyc', label: 'nav_kyc', icon: ShieldCheck, feature: 'kyc', description: 'nav_kyc_desc' },
        { href: '/dashboard/staff', label: 'nav_staff', icon: Contact, feature: 'staff', description: 'nav_staff_desc' },
    ]
  },
  {
    title: "nav_group_financial",
    items: [
        { href: '/dashboard/rent-passbook', label: 'nav_rentbook', icon: BookUser, feature: 'finances', description: 'nav_rentbook_desc' },
        { href: '/dashboard/expense', label: 'nav_expenses', icon: Wallet, feature: 'finances', description: 'nav_expenses_desc' },
        { href: '/dashboard/payouts', label: 'nav_payouts', icon: HandCoins, feature: 'finances', description: 'nav_payouts_desc' },
    ]
  },
  {
    title: "nav_group_operations",
    items: [
        { href: '/dashboard/complaints', label: 'nav_complaints', icon: MessageSquareWarning, feature: 'complaints', description: 'nav_complaints_desc' },
        { href: '/dashboard/food', label: 'nav_food', icon: UtensilsCrossed, feature: 'food', description: 'nav_food_desc' },
    ]
  },
  {
      title: "nav_group_growth",
      items: [
          { href: '/dashboard/website', label: 'nav_app_website', icon: Globe, feature: 'website', description: 'nav_app_website_desc' },
          { href: '/dashboard/whatsapp', label: 'nav_whatsapp', icon: MessageCircle, feature: 'whatsapp', description: 'nav_whatsapp_desc' },
          { href: '/dashboard/subscription', label: 'nav_billing', icon: CreditCard, feature: 'core', description: 'nav_billing_desc' },
          { href: '/dashboard/training', label: 'nav_training', icon: BookOpen, feature: 'core', description: 'nav_training_desc' },
          { href: '/dashboard/enterprise', label: 'nav_enterprise', icon: Building, feature: 'core', description: 'nav_enterprise_desc' },
          { href: '/dashboard/settings', label: 'nav_settings', icon: Settings, feature: 'core', description: 'nav_settings_desc' },
      ]
  }
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
    totalRooms: 10,
    rules: [
      'No guests allowed after 10 PM.',
      'Maintain cleanliness in common areas.',
      'Rent to be paid by the 5th of every month.',
    ],
    contact: '+919876543210',
  },
];
