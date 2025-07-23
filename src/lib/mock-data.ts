
import type { Menu, Plan, PlanName, PG } from './types';
import { Home, Building, Users, Wand2, UserCircle, LogOut, UtensilsCrossed, Wallet, Settings, MessageSquareWarning, Contact, ChevronsUpDown, Globe, BookUser } from 'lucide-react';


export const defaultMenu: Menu = {
  monday: { breakfast: 'Poha, Tea', lunch: 'Roti, Mixed Veg, Dal Tadka, Rice', dinner: 'Paneer Butter Masala, Roti, Salad' },
  tuesday: { breakfast: 'Upma, Coffee', lunch: 'Roti, Aloo Gobi, Dal Fry, Rice', dinner: 'Chole, Bhature, Onion Salad' },
  wednesday: { breakfast: 'Idli Sambar', lunch: 'Roti, Rajma, Jeera Rice', dinner: 'Veg Pulao, Raita, Papad' },
  thursday: { breakfast: 'Aloo Paratha, Curd', lunch: 'Roti, Bhindi Masala, Dal Makhani, Rice', dinner: 'Kadhi Pakoda, Rice, Roti' },
  friday: { breakfast: 'Masala Dosa', lunch: 'Roti, Lauki Sabzi, Chana Dal, Rice', dinner: 'Veg Biryani, Raita' },
  saturday: { breakfast: 'Bread Omelette', lunch: 'Roti, Baingan Bharta, Arhar Dal, Rice', dinner: 'Pav Bhaji' },
  sunday: { breakfast: 'Puri Sabji', lunch: 'Special Thali (Chef\'s choice)', dinner: 'Noodles, Manchurian' },
}

export const plans: Record<PlanName, Plan> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    pricePeriod: 'Forever',
    description: "For single property owners using local storage. No cloud backup.",
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
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 99,
    pricePeriod: '/property/month',
    description: "For growing businesses managing up to 5 properties.",
    pgLimit: 5,
    floorLimit: 10,
    hasComplaints: true,
    hasStaffManagement: true,
    hasAiRentReminders: true,
    hasSeoGenerator: true,
    hasKycVerification: false,
    hasAutomatedWhatsapp: false,
    hasMarketplace: false,
    hasCloudSync: true,
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
  },
  business: {
      id: 'business',
      name: 'Business',
      price: 399,
      pricePeriod: '/property/month',
      description: "Advanced tools for scaling operators.",
      pgLimit: 10,
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
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    pricePeriod: "",
    description: "List your property on our marketplace for maximum visibility.",
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
  { href: '/dashboard/website', label: 'Website', icon: Globe, feature: 'website' },
  { href: '/dashboard/seo-generator', label: 'AI SEO', icon: Wand2, feature: 'seo' },
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
    priceRange: { min: 9000, max: 15000 },
    amenities: ['wifi', 'ac', 'power-backup', 'food', 'laundry'],
    rules: [
      'No guests allowed after 10 PM.',
      'Maintain cleanliness in common areas.',
      'Rent to be paid by the 5th of every month.',
    ],
    contact: '+919876543210',
  },
];
