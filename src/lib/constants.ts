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
    baseFee: 200, // ₹200 base fee per month
    monthly: {
        perTenant: 30, // ₹30 per tenant per month
    },
    sixMonth: {
        perTenant: 20, // ₹20 per tenant per month
    },
    yearly: {
        perTenant: 10, // ₹10 per tenant per month
    },
    trial: {
        credit: 500,
        durationDays: 90,
        includedWhatsappCredits: 150,
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
    name: 'Flex (Monthly)',
    price: 200,
    pricePeriod: '/month base',
    description: "No commitment. Standard daily rates. Best for testing.",
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
  },
  sixMonth: {
    id: 'sixMonth',
    name: 'Saver (6-Months)',
    price: 200,
    pricePeriod: '/month base',
    description: "Commit to 6 months for 33% lower daily rates.",
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
  },
  yearly: {
    id: 'yearly',
    name: 'Elite (Yearly)',
    price: 200,
    pricePeriod: '/month base',
    description: "Best value. 66% lower daily rates for long-term growth.",
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
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    pricePeriod: '/year',
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
