

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
  kycRejectReason?: string;
  hasMessage?: boolean;
  moveInDate: string;
  noticePeriodDays: number;
  exitDate?: string;
  userId?: string | null; // Link to the user account
  isVacated: boolean; // True if the guest has permanently left the PG
  additionalCharges?: AdditionalCharge[];
  paymentHistory?: Payment[];
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

export type StaffRole = 'manager' | 'cleaner' | 'cook' | 'security' | 'other';

export interface Staff {
  id: string;
  name: string;
  email?: string;
  role: StaffRole;
  phone: string;
  salary: number;
  pgId: string;
  pgName: string;
  userId?: string;
}

export interface Notification {
  id: string;
  type: 'rent-due' | 'checkout-soon' | 'new-complaint' | 'rent-paid' | 'new-guest' | 'kyc-submitted';
  title: string;
  message: string;
  link: string;
  date: string;
  isRead: boolean;
  targetId: string; // guestId or complaintId
}

export type UserRole = 'owner' | 'manager' | 'cook' | 'cleaner' | 'security' | 'other' | 'tenant';

export type PlanName = 'free' | 'starter' | 'pro' | 'business' | 'enterprise';

export interface Plan {
  id: PlanName;
  name: string;
  price: number | 'Custom';
  pricePeriod: string;
  pgLimit: number | 'unlimited';
  bedLimit?: number | 'unlimited';
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
