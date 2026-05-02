/**
 * Logic-only constants to avoid importing UI libraries (like lucide-react) 
 * in server-side scripts or migrations.
 */

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
    perTenant: 30, // Default per-tenant fee (monthly)
    trial: {
        credit: 500,
        durationDays: 30,
        maxTenants: 100, // Effectively unlimited within the credit
        includedWhatsappCredits: 150
    },
    lowBalance: {
        warningThreshold: 200, // ₹200 → show warning
        riskThreshold: 100, // ₹100 → show risk alert
        restrictedThreshold: 0, // ₹0 → restrict features
    },
    rechargeOptions: [
        { amount: 500, label: 'Starter', bestFor: 'Small PG' },
        { amount: 1000, label: 'Growth', bestFor: 'Medium PG', popular: true },
        { amount: 2000, label: 'Business', bestFor: 'Large PG' },
    ],
    premiumFeatures: {
        website: {
            name: 'Website Builder',
            monthlyCharge: 0, // Flat monthly fee
            billingType: 'monthly' as const,
        }
    }
};
