
import { Home, Building, Users, UserCircle, UtensilsCrossed, Wallet, Settings, MessageSquareWarning, Contact, Globe, BookUser, CreditCard, BookOpen, IndianRupee, ShieldCheck, MessageCircle, Receipt } from 'lucide-react';

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
    title: "nav_group_financial",
    items: [
        { href: '/dashboard/wallet', label: 'nav_wallet', icon: Wallet, feature: 'billing', description: 'nav_wallet_desc' },
        { href: '/dashboard/payouts', label: 'nav_billing', icon: CreditCard, feature: 'payouts', description: 'nav_billing_desc' },
        { href: '/dashboard/rent-passbook', label: 'nav_rentbook', icon: BookUser, feature: 'finances', description: 'nav_rentbook_desc' },
        { href: '/dashboard/expense', label: 'nav_expenses', icon: Receipt, feature: 'finances', description: 'nav_expenses_desc' },
    ]
  },
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
        { href: '/dashboard/training', label: 'nav_training', icon: BookOpen, feature: 'training', description: 'nav_training_desc' },
        { href: '/dashboard/enterprise', label: 'nav_enterprise', icon: Building, feature: 'enterprise', description: 'nav_enterprise_desc' },
        { href: '/dashboard/profile', label: 'nav_profile', icon: UserCircle, feature: 'core', description: 'nav_profile_desc' },
        { href: '/dashboard/settings', label: 'nav_settings', icon: Settings, feature: 'core', description: 'nav_settings_desc' },
    ]
  }
];
