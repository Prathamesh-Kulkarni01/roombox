

export type Amenity =
  | 'wifi'
  | 'ac'
  | 'power-backup'
  | 'tv'
  | 'laundry'
  | 'food'
  | 'parking';

export interface Bed {
  id: string;
  name: string;
  guestId: string | null;
}

export interface Room {
  id: string;
  name: string;
  beds: Bed[];
  rent: number;
  deposit: number;
  amenities?: string[];
  floorId: string;
  pgId: string;
}

export interface Floor {
  id:string;
  name: string;
  rooms: Room[];
  pgId: string;
}

export interface Meal {
  breakfast: string;
  lunch: string;
  dinner: string;
}

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export type Menu = Record<DayOfWeek, Meal>;


export interface PG {
  id: string;
  name:string;
  location: string;
  city: string;
  gender: 'male' | 'female' | 'co-ed';
  priceRange: {
    min: number;
    max: number;
  };
  amenities: Amenity[];
  images: string[];
  rating: number;
  occupancy: number;
  totalBeds: number;
  rules: string[];
  contact: string; // WhatsApp number
  floors?: Floor[];
  menu?: Menu;
  ownerId: string;
}

export interface AdditionalCharge {
  id: string;
  description: string;
  amount: number;
}

export interface Payment {
    id: string;
    date: string; // ISO string
    amount: number;
    method: 'cash' | 'upi' | 'in-app' | 'other';
    forMonth: string; // e.g., "July 2024"
    notes?: string;
}

export type BedStatus = 'available' | 'occupied' | 'rent-pending' | 'rent-partial' | 'notice-period';

export interface KycDocumentConfig {
  id: string;
  label: string;
  type: 'image' | 'pdf';
  required: boolean;
}

export interface SubmittedKycDocument {
  configId: string;
  label: string;
  url: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
}

export interface KycDocument {
    guestId: string;
    aadhaarUrl: string;
    photoUrl: string;
}

export interface Guest {
  id: string;
  name: string;
  phone?: string;
  email: string;
  pgId: string;
  pgName: string;
  bedId: string;
  rentStatus: 'paid' | 'unpaid' | 'partial';
  dueDate: string;
  rentAmount: number;
  rentPaidAmount?: number;
  balanceBroughtForward?: number; // For carrying over previous unpaid amounts
  depositAmount?: number;
  kycStatus: 'not-started' | 'pending' | 'verified' | 'rejected';
  kycRejectReason?: string | null;
  kycExtractedName?: string | null;
  kycExtractedDob?: string | null;
  kycExtractedIdNumber?: string | null;
  hasMessage?: boolean;
  moveInDate: string;
  noticePeriodDays: number;
  exitDate?: string;
  userId?: string | null; // Link to the user account
  isVacated: boolean; // True if the guest has permanently left the PG
  additionalCharges?: AdditionalCharge[];
  paymentHistory?: Payment[];
  documents?: SubmittedKycDocument[];
}

export interface Complaint {
  id: string;
  guestId: string;
  guestName: string;
  pgId: string;
  category: 'maintenance' | 'cleanliness' | 'wifi' | 'food' | 'other';
  description: string;
  status: 'open' | 'in-progress' | 'resolved';
  date: string;
  pgName?: string;
  upvotes?: number;
  isPublic?: boolean;
  imageUrls?: string[];
}

export interface Expense {
  id: string;
  pgId: string;
  pgName: string;
  category: 'food' | 'maintenance' | 'utilities' | 'salary' | 'other';
  description: string;
  amount: number;
  date: string;
}

export type StaffRole = 'owner' | 'manager' | 'cleaner' | 'cook' | 'security' | 'other' | 'tenant';

export type PlanName = 'free' | 'pro'; // Simplified plans

export interface Plan {
  id: PlanName;
  name: string;
  price: number | 'Custom';
  pricePeriod: string;
  pgLimit: number | 'unlimited';
  floorLimit?: number | 'unlimited';
  hasStaffManagement: boolean;
  hasComplaints: boolean;
  hasAiRentReminders: boolean;
  hasSeoGenerator: boolean;
  hasKycVerification: boolean;
  hasAutomatedWhatsapp: boolean;
  hasMarketplace: boolean;
  hasCloudSync: boolean;
  hasWebsiteBuilder: boolean;
  description: string;
}

export type SubscriptionStatus = 'trialing' | 'active' | 'inactive' | 'past_due' | 'canceled';

export interface PremiumFeatures {
    website?: { enabled: boolean };
    kyc?: { enabled: boolean };
    whatsapp?: { enabled: boolean };
}

export interface UserSubscriptionPayment {
  id: string; // Razorpay Payment ID or internal ID
  date: string; // ISO string
  amount: number;
  status: 'paid' | 'failed';
  invoiceUrl?: string;
}

export interface User {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  password?: string;
  role: UserRole;
  pgIds?: string[]; // Kept for owners
  avatarUrl?: string;
  guestId: string | null; // The ID of the ACTIVE guest record
  guestHistoryIds?: string[]; // IDs of previous, vacated guest records
  ownerId?: string; // If role is tenant or staff, this is the ID of their PG owner
  pgId?: string; // Tenant's active PG ID for direct access
  subscription?: {
    planId: PlanName;
    status: SubscriptionStatus;
    razorpay_subscription_id?: string;
    razorpay_payment_id?: string;
    trialEndDate?: string; // ISO string
    premiumFeatures?: PremiumFeatures;
    paymentHistory?: UserSubscriptionPayment[];
  };
  fcmToken?: string | null;
}

export interface Invite {
  email: string;
  ownerId: string;
  role: UserRole;
  details: Guest | Staff;
}

export interface SiteConfig {
  subdomain: string;
  ownerId: string;
  siteTitle: string;
  contactPhone?: string;
  contactEmail?: string;
  listedPgs: string[];
  status: 'published' | 'draft' | 'suspended';
  heroHeadline?: string;
  heroSubtext?: string;
  aboutTitle?: string;
  aboutDescription?: string;
  featuresTitle?: string;
  featuresDescription?: string;
  features?: { title: string; description: string; }[];
  faqs?: { q: string; a: string; }[];
  testimonials?: { quote: string; author: string; }[];
}

export interface ChargeTemplate {
    id: string;
    name: string; // e.g., "Electricity Bill"
    calculation: 'fixed' | 'unit'; // Fixed total amount or based on units
    unitCost: number | null; // Cost per unit (e.g., kWh)
    splitMethod: 'equal' | 'room' | 'custom'; // Split equally, by room type, or custom
    frequency: 'monthly' | 'one-time';
    autoAddToDialog: boolean;
    billingDayOfMonth: number;
}


export interface BillingCycleDetails {
    totalAmount: number;
    propertyCharge: number;
    tenantCharge: number;
    premiumFeaturesCharge: number;
    premiumFeaturesDetails: Record<string, { charge: number; description: string; }>;
}

export interface BillingDetails {
    currentCycle: BillingCycleDetails;
    nextCycleEstimate: BillingCycleDetails;
    details: {
        propertyCount: number;
        billableTenantCount: number;
        pricingConfig: typeof import('./mock-data').PRICING_CONFIG;
    };
}
