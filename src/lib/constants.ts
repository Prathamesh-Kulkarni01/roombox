import type { Menu, Plan, PlanName } from './types';

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
    baseFee: 0, // ₹0 base fee per month for the standard plan
    monthly: {
        perTenant: 20, // ₹20 per bed per month beyond the free limit
    },
    sixMonth: {
        perTenant: 20,
    },
    yearly: {
        perTenant: 20,
    },
    freeBedsLimit: 20, // First 20 beds are 100% free
    trial: {
        credit: 60,
        durationDays: 90,
        includedWhatsappCredits: 150,
        maxTenants: 'unlimited',
    },
    lowBalance: {
        warningThreshold: 200, // ₹200 → show warning
        riskThreshold: 100, // ₹100 → show risk alert
        restrictedThreshold: 0, // ₹0 → restrict features
    },
    rechargeOptions: [
        { amount: 500, label: 'Standard', description: 'Basic recharge' },
        { amount: 1000, label: 'Value', description: 'Best for small PGs', popular: true },
        { amount: 2000, label: 'Growth', description: 'Best for scaling' },
    ],
    premiumFeatures: {
        website: {
            name: 'Website Builder',
            monthlyCharge: 50, // Flat monthly fee
            billingType: 'monthly' as const,
        },
        whatsapp: {
            name: 'WhatsApp Automation',
            perTenantCharge: 10, // Per-tenant charge
            billingType: 'per_tenant' as const,
        },
        enterprise: {
            name: 'Enterprise DB (Private DB)',
            monthlyCharge: 2000, // Flat monthly charge for BYODB
            billingType: 'monthly' as const,
        }
    }
};

export const plans: Record<PlanName, Plan> = {
  trial: {
    id: 'trial',
    name: '90-Day Trial',
    price: 0,
    pricePeriod: '/month',
    description: "Experience all features for 90 days. No credit card required.",
    pgLimit: 'unlimited',
    floorLimit: 'unlimited',
    tenantLimit: 'unlimited',
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
  },
  monthly: {
    id: 'monthly',
    name: 'Standard Plan',
    price: 0,
    pricePeriod: '/month (First 20 Beds Free)',
    description: "First 20 beds are free. ₹20/bed/month for additional beds.",
    pgLimit: 'unlimited',
    floorLimit: 'unlimited',
    tenantLimit: 'unlimited',
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
  },
  sixMonth: {
    id: 'sixMonth',
    name: 'Standard Plan (6M commitment)',
    price: 0,
    pricePeriod: '/month (First 20 Beds Free)',
    description: "First 20 beds are free. ₹20/bed/month for additional beds.",
    pgLimit: 'unlimited',
    floorLimit: 'unlimited',
    tenantLimit: 'unlimited',
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
  },
  yearly: {
    id: 'yearly',
    name: 'Standard Plan (Yearly commitment)',
    price: 0,
    pricePeriod: '/month (First 20 Beds Free)',
    description: "First 20 beds are free. ₹20/bed/month for additional beds.",
    pgLimit: 'unlimited',
    floorLimit: 'unlimited',
    tenantLimit: 'unlimited',
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
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise Plan',
    price: 2000,
    pricePeriod: '/month',
    description: "Standard Plan with Private DB Addon enabled.",
    pgLimit: 'unlimited',
    floorLimit: 'unlimited',
    tenantLimit: 'unlimited',
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
  },
};
