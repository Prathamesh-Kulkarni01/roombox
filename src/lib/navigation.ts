import { 
  Home, 
  Building, 
  Users, 
  UserCircle, 
  UtensilsCrossed, 
  Wallet, 
  Settings, 
  MessageSquareWarning, 
  Contact, 
  Globe, 
  BookUser, 
  CreditCard, 
  BookOpen, 
  ShieldCheck, 
  MessageCircle, 
  Receipt, 
  BedDouble,
  ShoppingCart,
  Package,
  FileSpreadsheet,
  Bike,
  QrCode,
  Store,
  Layers,
  Dumbbell,
  CalendarCheck,
  Award
} from 'lucide-react';
import { getActiveAppMode, type AppMode } from '@/core/config/app-mode';

export interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  description: string;
  feature?: string;
  tourId?: string;
  badgeKey?: string;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export interface BottomNavTab {
  id: string;
  href: string;
  label: string;
  icon: React.ElementType;
  badgeKey?: string;
  isSheetTrigger?: boolean;
}

// 1. RENTSUTRA (RENT) NAVIGATION GROUPS
export const rentNavItems: NavGroup[] = [
  {
    title: "nav_group_core",
    items: [
      { href: '/dashboard', label: 'nav_dashboard', icon: Home, feature: 'properties', tourId: 'dashboard-nav', description: 'nav_dashboard_desc' },
      { href: '/dashboard/rent-passbook', label: 'nav_rentbook', icon: BookUser, feature: 'finances', description: 'nav_rentbook_desc' },
      { href: '/dashboard/expense', label: 'nav_expenses', icon: Receipt, feature: 'finances', description: 'nav_expenses_desc' },
      { href: '/dashboard/pg-management/rooms', label: 'manage_rooms_short', icon: BedDouble, feature: 'properties', tourId: 'rooms-nav', description: 'manage_rooms_desc' },
      { href: '/dashboard/complaints', label: 'nav_complaints', icon: MessageSquareWarning, feature: 'complaints', description: 'nav_complaints_desc', badgeKey: 'complaints' },
      { href: '/dashboard/tenant-management', label: 'nav_guests', icon: Users, feature: 'guests', description: 'nav_guests_desc' },
      { href: '/dashboard/leads', label: 'nav_leads', icon: Contact, feature: 'guests', description: 'nav_leads_desc' },
    ]
  },
  {
    title: "nav_group_operations",
    items: [
      { href: '/dashboard/attendance', label: 'nav_attendance', icon: ShieldCheck, feature: 'attendance', description: 'nav_attendance_desc' },
      { href: '/dashboard/food', label: 'nav_food', icon: UtensilsCrossed, feature: 'food', description: 'nav_food_desc' },
      { href: '/dashboard/kyc', label: 'nav_kyc', icon: ShieldCheck, feature: 'kyc', description: 'nav_kyc_desc' },
      { href: '/dashboard/staff', label: 'nav_staff', icon: Contact, feature: 'staff', description: 'nav_staff_desc' },
      { href: '/dashboard/utilities', label: 'Utilities', icon: Settings, feature: 'finances', description: 'Manage meter readings and sub-billing' },
      { href: '/dashboard/pg-management/community', label: 'Community', icon: MessageCircle, feature: 'properties', description: 'Manage notices and marketplace' },
    ]
  },
  {
    title: "nav_group_property",
    items: [
      { href: '/dashboard/pg-management', label: 'nav_properties', icon: Building, feature: 'properties', tourId: 'properties-nav', description: 'nav_properties_desc' },
    ]
  },
  {
    title: "nav_group_financial",
    items: [
      { href: '/dashboard/payouts', label: 'nav_billing', icon: CreditCard, feature: 'payouts', description: 'nav_billing_desc' },
      { href: '/dashboard/wallet', label: 'nav_wallet', icon: Wallet, feature: 'billing', description: 'nav_wallet_desc' },
    ]
  },
  {
    title: "nav_group_growth",
    items: [
      { href: '/dashboard/marketing', label: 'Marketing', icon: Globe, feature: 'marketing', description: 'Listing syndication and tracking' },
      { href: '/dashboard/website', label: 'nav_app_website', icon: Globe, feature: 'website', description: 'nav_app_website_desc' },
      { href: '/dashboard/whatsapp', label: 'nav_whatsapp', icon: MessageCircle, feature: 'whatsapp', description: 'nav_whatsapp_desc' },
      { href: '/dashboard/enterprise', label: 'nav_enterprise', icon: Building, feature: 'enterprise', description: 'nav_enterprise_desc' },
      { href: '/dashboard/training', label: 'nav_training', icon: BookOpen, feature: 'training', description: 'nav_training_desc' },
      { href: '/dashboard/profile', label: 'nav_profile', icon: UserCircle, feature: 'core', description: 'nav_profile_desc' },
      { href: '/dashboard/settings', label: 'nav_settings', icon: Settings, feature: 'core', description: 'nav_settings_desc' },
    ]
  }
];

export const rentBottomTabs: BottomNavTab[] = [
  { id: 'dashboard', href: '/dashboard', label: 'nav_dashboard', icon: Home },
  { id: 'rooms', href: '/dashboard/pg-management/rooms', label: 'manage_rooms_short', icon: BedDouble },
  { id: 'rentbook', href: '/dashboard/rent-passbook', label: 'nav_rentbook', icon: BookUser },
  { id: 'complaints', href: '/dashboard/complaints', label: 'nav_complaints', icon: MessageSquareWarning, badgeKey: 'complaints' },
  { id: 'more', href: '#', label: 'More', icon: Layers, isSheetTrigger: true },
];

// 2. BAZAR (LOCAL GROCERY / COMMERCE) NAVIGATION GROUPS
export const bazarNavItems: NavGroup[] = [
  {
    title: "bazar_group_core",
    items: [
      { href: '/bazar/dashboard', label: 'Home Dashboard', icon: Home, feature: 'orders', tourId: 'bazar-home-nav', description: 'Daily business overview, sales and low stock' },
      { href: '/bazar/queue', label: 'Live Orders & Packing', icon: ShoppingCart, feature: 'orders', tourId: 'bazar-orders-nav', description: 'Customer orders and fulfillment queue', badgeKey: 'orders' },
      { href: '/bazar/pos', label: 'POS Counter Billing', icon: Receipt, feature: 'finances', description: 'Quick walk-in billing without barcode scanner' },
      { href: '/bazar/inventory', label: 'Stock & Inventory', icon: Package, feature: 'inventory', description: 'Stock availability, prices, and catalog' },
      { href: '/bazar/sheets-sync', label: 'Google Sheets Sync', icon: FileSpreadsheet, feature: 'inventory', description: 'Two-way Excel / Google Sheet stock sync' },
    ]
  },
  {
    title: "bazar_group_store",
    items: [
      { href: '/bazar/more', label: 'Store Settings & More', icon: Settings, feature: 'store', description: 'Branded store PWA, timings, delivery radius' },
      { href: '/dashboard/wallet', label: 'Wallet & Payouts', icon: Wallet, feature: 'billing', description: 'Merchant payouts and balance' },
    ]
  }
];

export const bazarBottomTabs: BottomNavTab[] = [
  { id: 'home', href: '/bazar/dashboard', label: 'Home', icon: Home },
  { id: 'orders', href: '/bazar/queue', label: 'Orders', icon: ShoppingCart, badgeKey: 'orders' },
  { id: 'stock', href: '/bazar/inventory', label: 'Stock', icon: Package },
  { id: 'billing', href: '/bazar/pos', label: 'Billing', icon: Receipt },
  { id: 'more', href: '#', label: 'More', icon: Layers, isSheetTrigger: true },
];

// 3. GYM (FITNESS) NAVIGATION GROUPS
export const gymNavItems: NavGroup[] = [
  {
    title: "gym_group_core",
    items: [
      { href: '/gym/dashboard', label: 'Gym Dashboard', icon: Home, feature: 'gym', description: 'Overview and active check-ins' },
      { href: '/gym/members', label: 'Members', icon: Users, feature: 'gym', description: 'Active gym members and renewals' },
      { href: '/gym/attendance', label: 'Attendance', icon: CalendarCheck, feature: 'gym', description: 'Biometric / QR check-ins' },
      { href: '/gym/plans', label: 'Membership Plans', icon: Award, feature: 'gym', description: 'Pricing tiers and validity' },
      { href: '/gym/trainers', label: 'Trainers', icon: Dumbbell, feature: 'gym', description: 'Personal trainers and sessions' },
      { href: '/dashboard/settings', label: 'nav_settings', icon: Settings, feature: 'core', description: 'Account settings' },
    ]
  }
];

export const gymBottomTabs: BottomNavTab[] = [
  { id: 'dashboard', href: '/gym/dashboard', label: 'Dashboard', icon: Home },
  { id: 'members', href: '/gym/members', label: 'Members', icon: Users },
  { id: 'attendance', href: '/gym/attendance', label: 'Attendance', icon: CalendarCheck },
  { id: 'plans', href: '/gym/plans', label: 'Plans', icon: Award },
  { id: 'more', href: '#', label: 'More', icon: Layers, isSheetTrigger: true },
];

/**
 * Registry resolving active navigation dynamically according to app mode
 */
export function getNavGroupsForMode(mode: AppMode): NavGroup[] {
  switch (mode) {
    case 'bazar':
      return bazarNavItems;
    case 'gym':
      return gymNavItems;
    case 'unified':
      return [...rentNavItems, ...bazarNavItems, ...gymNavItems];
    case 'rent':
    default:
      return rentNavItems;
  }
}

export function getBottomTabsForMode(mode: AppMode): BottomNavTab[] {
  switch (mode) {
    case 'bazar':
      return bazarBottomTabs;
    case 'gym':
      return gymBottomTabs;
    case 'unified':
    case 'rent':
    default:
      return rentBottomTabs;
  }
}

/**
 * Backward compatibility: allNavItems returns rentNavItems by default,
 * or dynamically swaps if NEXT_PUBLIC_APP_MODE is set.
 */
export const allNavItems: NavGroup[] = getNavGroupsForMode(getActiveAppMode());
