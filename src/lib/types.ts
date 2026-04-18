export const CURRENT_SCHEMA_VERSION = 7;

export interface KycDocumentConfig {
    id: string;
    label: string;
    type: 'image' | 'pdf' | 'text' | 'file' | 'select' | 'date';
    required: boolean;
    options?: string[];
}

export interface PerformerInfo {
    userId: string;
    name: string;
    role?: string;
}

export interface BaseEntity {
    createdAt?: string; // ISO String
    createdBy?: PerformerInfo;
    updatedAt?: string; // ISO String
    updatedBy?: PerformerInfo;
    schemaVersion?: number;
}

export type ActivityType = 
    | 'GUEST_ONBOARDED'
    | 'GUEST_VACATED'
    | 'GUEST_TRANSFERRED'
    | 'GUEST_UPDATED'
    | 'PAYMENT_RECORDED'
    | 'PAYMENT_CLAIMED'
    | 'PAYMENT_VERIFIED'
    | 'KYC_SUBMITTED'
    | 'KYC_STATUS_UPDATED'
    | 'COMPLAINT_CREATED'
    | 'PROPERTY_CREATED'
    | 'PROPERTY_UPDATED'
    | 'PROPERTY_DELETED'
    | 'KYC_VERIFIED'
    | 'KYC_REJECTED'
    | 'KYC_RESET'
    | 'SYSTEM_LOG'
    | 'STAFF_ONBOARDED'
    | 'STAFF_VACATED'
    | 'STAFF_UPDATED'
    | 'STAFF_DELETED'
    | 'STAFF_TRANSFERRED'
    
    | 'ROOM_CREATED'
    | 'ROOM_UPDATED'
    | 'STAFF_ADDED'
    | 'STAFF_UPDATED'
    | 'STAFF_DELETED'
    | 'EXPENSE_ADDED'
    | 'EXPENSE_DELETED'
    | 'SYSTEM_LOG';

export interface ActivityChange {
    field: string;
    before: any;
    after: any;
}

export interface ActivityLog {
    id: string;
    ownerId: string;
    activityType: ActivityType;
    details: string;
    module: 'properties' | 'guests' | 'financials' | 'staff' | 'complaints' | 'system';
    targetId?: string; // e.g., guestId, complaintId
    targetType?: 'guest' | 'complaint' | 'payment' | 'room' | 'property' | 'staff' | 'expense';
    status: 'success' | 'failed' | 'warning' | 'danger';
    performedBy: PerformerInfo;
    changes?: {
        before?: any;
        after?: any;
        changedFields?: string[];
    } | ActivityChange[]; // Support both formats during transition
    error?: string;
    metadata?: Record<string, any>;
    timestamp: any; // Firestore Timestamp or Date
}

export interface SubmittedKycDocument {
    fieldId: string;
    configId?: string; // Legacy/Migration support
    label?: string;
    value?: string;
    fileUrl?: string;
    url?: string;     // Legacy/Migration support
    fileName?: string;
    status: 'pending' | 'approved' | 'rejected';
    rejectionReason?: string;
    submittedAt: string;
}

export interface BusinessKycDetails {
    gstin?: string;
    pan?: string;
    businessName?: string;
    address?: string;
}


export interface PWAConfig {
  name: string;
  shortName: string;
  themeColor: string;
  backgroundColor: string;
  logo?: string;
  subdomain?: string;
}

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

export interface Room extends BaseEntity {
  id: string;
  name: string;
  beds: Bed[];
  rent: number;
  deposit: number;
  amountType?: 'numeric' | 'symbolic';
  symbolicRentValue?: string; // e.g. "XXX"
  symbolicDepositValue?: string; // e.g. "XXX"
  amenities?: string[];
  floorId: string;
  pgId: string;
}

export interface Floor {
  id: string;
  name: string;
  rooms: Room[];
  pgId: string;
}

export interface MenuItem {
  id: string;
  name: string;
  category: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}

export interface Meal {
  breakfast: string;
  lunch: string;
  dinner: string;
  ratings?: {
    breakfast?: MealFeedback[];
    lunch?: MealFeedback[];
    dinner?: MealFeedback[];
  }
}

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export type Menu = Record<DayOfWeek, Meal>;

export interface InventoryItem {
  id: string;
  name: string;
  unit: 'kg' | 'grams' | 'litres' | 'ml' | 'pieces' | 'packets';
  stock: number;
  threshold: number;
  lastUpdated: string;
}

export interface MealFeedback {
  guestId: string;
  rating: number; // 1-5
  comment?: string;
  date: string;
}

export interface MenuTemplate {
  id: string;
  name: string;
  menu: Menu;
}

export interface PG extends BaseEntity {
  id: string;
  name: string;
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
  totalRooms: number;
  rules: string[];
  contact: string; // WhatsApp number
  floors?: Floor[];
  menu?: Menu;
  inventory?: InventoryItem[];
  menuTemplates?: MenuTemplate[];
  ownerId: string;
  status: 'active' | 'pending_approval' | 'rejected' | 'suspended';
  paymentMode?: 'DIRECT_UPI' | 'GATEWAY' | 'CASH_ONLY';
  upiId?: string;
  payeeName?: string;
  qrCodeImage?: string;
  online_payment_enabled?: boolean;
  direct_upi_enabled?: boolean;
}

export interface Payment extends BaseEntity {
  id: string;
  amount: number;
  month: string;
  type: 'credit' | 'debit';
  method: 'cash' | 'upi' | 'in-app' | 'direct_upi' | 'gateway' | 'DIRECT_UPI';
  forMonth?: string; // deprecated by month
  notes?: string;
  status: 'INITIATED' | 'CLAIMED_PAID' | 'VERIFIED' | 'REJECTED' | 'pending';
  utr?: string;
  screenshotUrl?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  claimedAt?: string;
  date?: string; // Legacy/fallback for createdAt
  payoutStatus?: string; // Legacy
  payoutFailureReason?: string; // Legacy
  payoutId?: string; // Legacy
  payoutTo?: string; // Legacy
  payoutMode?: 'PAYOUT' | 'ROUTE';
  payoutSnapshot?: {
    fund_account_id?: string;
    vpa?: string;
    mode: 'PAYOUT' | 'ROUTE';
    account_id?: string;
    payout_type?: string; 
  };
  matchConfidence?: 'HIGH' | 'PARTIAL' | 'UNMATCHED';
  referenceId?: string;
  discrepancies?: string[];
}

export interface LedgerEntry {
  id: string;
  date: string; // ISO string
  type: 'debit' | 'credit';
  description: string;
  amount: number;
  amountType?: 'numeric' | 'symbolic';
  symbolicValue?: string; // e.g. "XXX"

  pgId?: string;
}

// Payment Method Types
export interface PaymentMethodBase {
  id: string;
  name: string;
  isActive: boolean;
  isPrimary: boolean;
  createdAt: string;
  razorpay_fund_account_id?: string;
}

export interface BankPaymentMethod extends PaymentMethodBase {
  type: 'bank_account';
  accountNumber: string;
  accountNumberLast4: string;
  ifscCode: string;
  accountHolderName: string;
  bankName?: string;
}

export interface UpiPaymentMethod extends PaymentMethodBase {
  type: 'upi';
  vpaAddress: string;
}

export type PaymentMethod = BankPaymentMethod | UpiPaymentMethod;

export interface PaymentMethodValidationResult {
  isValid: boolean;
  error?: string;
}


export type BedStatus = 'available' | 'occupied' | 'rent-pending' | 'rent-partial' | 'notice-period';

// Consolidated into previous definitions

export interface KycDocument {
  guestId: string;
  aadhaarUrl: string;
  photoUrl: string;
}

export type RentCycleUnit = 'minutes' | 'hours' | 'days' | 'weeks' | 'months';

export interface Guest extends BaseEntity {
  roomName?: any;
  id: string;
  shortId?: string;
  name: string;
  phone?: string;
  email: string;
  pgId: string;
  pgName: string;
  bedId: string;
  roomId?: string;
  rentStatus: 'paid' | 'unpaid' | 'partial';
  dueDate: string; // ISO string
  rentAmount: number;
  depositAmount: number;
  amountType?: 'numeric' | 'symbolic';
  symbolicRentValue?: string; // e.g. "XXX"
  symbolicDepositValue?: string; // e.g. "XXX"
  kycStatus: 'not-started' | 'pending' | 'verified' | 'rejected';
  kycRejectReason?: string | null;
  moveInDate: string; // ISO string
  noticePeriodDays: number;
  rentCycleUnit: RentCycleUnit; // e.g., 'months'
  rentCycleValue: number; // e.g., 1
  billingAnchorDay: number; // Day of the month to bill on (e.g., 15)
  exitDate?: string;
  timezone?: string;
  userId?: string | null; // Link to the user account
  isVacated: boolean; // True if the guest has permanently left the PG
  ledger: LedgerEntry[];
  documents?: SubmittedKycDocument[];
  paymentHistory: any[]; // History of payments recorded
  payments?: Payment[]; // For tracking manual/offline payment submissions
  lastPaymentDate?: string;
  finalSettlementAmount?: number;
  lastReminderSentAt?: string;
  lastReminderType?: 'T-3' | 'T-1' | 'T0' | 'T+2';
  balance: number;
  symbolicBalance?: string | null; // e.g. "2 * XXX + 500"
  isOnboarded?: boolean;
  // Legacy fields for dashboard component compatibility
  balanceBroughtForward?: number;
  additionalCharges?: AdditionalCharge[];
  rentPaidAmount?: number;
}

export interface AdditionalCharge { // Also deprecated
  id: string;
  description: string;
  amount: number;
  date: string;
}


export interface Complaint extends BaseEntity {
  id: string;
  guestId: string | null; // Null if raised by owner for property
  guestName: string; // "Owner Reported" or guest name
  pgId: string;
  floorId?: string;
  roomId?: string;
  bedId?: string;
  pgName?: string;
  category: 'maintenance' | 'cleanliness' | 'wifi' | 'food' | 'other';
  description: string;
  status: 'open' | 'in-progress' | 'resolved';
  date: string;
  upvotes?: number;
  isPublic: boolean;
  imageUrls?: string[];
}

export interface Expense extends BaseEntity {
  id: string;
  pgId: string;
  pgName?: string;
  ownerId: string;
  category: 'food' | 'maintenance' | 'utilities' | 'salary' | 'other';
  description: string;
  amount: number;
  date: string;
  paymentMode?: string;
}

export type StaffRole = 'manager' | 'cleaner' | 'cook' | 'security' | 'staff' | 'other';
export type UserRole = 'admin' | 'owner' | 'tenant' | StaffRole | 'unassigned';

export type PlanName = 'free' | 'pro' | 'enterprise';

export interface Plan {
  id: PlanName;
  name: string;
  price: number | 'Custom';
  pricePeriod: string;
  description: string;
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
  hasDedicatedDb?: boolean;
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

export type OnboardingStepId = 'kyc' | 'contact' | 'linked_account' | 'stakeholder' | 'fund_account' | 'complete';

export interface BusinessKycDetails {
  legal_business_name: string;
  business_type: 'proprietorship' | 'partnership' | 'private_limited' | 'public_limited' | 'llp' | 'trust' | 'society' | 'not_for_profit';
  pan_number: string;
  gst_number?: string;
  phone: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  postal_code: string;
}

export interface User {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  password?: string;
  role: UserRole;
  status: 'active' | 'pending_approval' | 'suspended';
  avatarUrl?: string;
  guestId: string | null; // The ID of the ACTIVE guest record
  guestHistoryIds?: string[]; // IDs of previous, vacated guest records
  ownerId?: string; // If role is tenant or staff, this is the ID of their PG owner
  pgId?: string; // Tenant's active PG ID for direct access
  pgIds?: string[]; // Kept for owners and now multi-property staff
  subscription?: { // Only owners should have this object
    planId: PlanName;
    status: SubscriptionStatus;
    razorpay_contact_id?: string;
    razorpay_account_id?: string; // This will hold the 'acc_...' ID from v2 API
    razorpay_subscription_id?: string;
    razorpay_payment_id?: string;
    payoutMethods?: PaymentMethod[];
    payoutMode?: 'PAYOUT' | 'ROUTE';
    trialEndDate?: string; // ISO string
    premiumFeatures?: PremiumFeatures;
    paymentHistory?: UserSubscriptionPayment[];
    kycDetails?: BusinessKycDetails;
    whatsappCredits?: number;
    whatsappSettings?: Record<string, { tenant: boolean, owner: boolean }>;
    enterpriseProject?: {
      projectId: string;
      databaseId: string;
      clientConfig?: {
        apiKey: string;
        authDomain: string;
        projectId: string;
        storageBucket?: string;
        messagingSenderId?: string;
        appId?: string;
        measurementId?: string;
      };
    };
  };
  fcmToken?: string | null;
  createdAt?: string; // ISO string for when the user was created
  permissions?: string[]; // For staff users, synchronized from staff document
  staffId?: string | null; // Pointer to the staff record in the owner's users_data collection
  activeTenancies?: {
    guestId: string;
    pgId: string;
    ownerId: string;
    pgName?: string;
  }[];
  activeStaffProfiles?: {
    staffId: string;
    ownerId: string;
    role: string;
    pgIds?: string[];
  }[];
  isOnboarded?: boolean;
  lastActiveContext?: {
    ownerId: string;
    staffId: string | null;
    role: string;
    pgIds: string[];
    pgId: string;
  };
}

export interface Invite {
  email: string;
  ownerId: string;
  role: UserRole;
  details: Guest | Staff;
  enterpriseDbId?: string;
}

export interface SiteConfig {
  subdomain: string;
  ownerId: string;
  siteTitle: string;
  contactPhone?: string;
  contactEmail?: string;
  logoUrl?: string;
  faviconUrl?: string;
  themeColor?: string;
  listedPgs: string[];
  status?: 'published' | 'draft' | 'suspended';
  heroHeadline?: string;
  heroSubtext?: string;
  aboutTitle?: string;
  aboutDescription?: string;
  featuresTitle?: string;
  featuresDescription?: string;
  features?: { title: string; description: string; }[];
  faqs?: { q: string; a: string; }[];
  testimonials?: { quote: string; author: string; }[];
  updatedAt?: number;
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

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  date: string; // ISO string
  isRead: boolean;
  link?: string;
  targetId?: string;
}

export interface Notice {
  id: string;
  ownerId: string;
  pgId: string | 'all';
  pgName: string | 'All Properties';
  title: string;
  message: string;
  date: string; // ISO string
  targetCount: number;
}

export interface Staff extends BaseEntity {
  id: string;
  name: string;
  role: StaffRole;
  pgId?: string; // Deprecated, use pgIds
  pgIds: string[];
  ownerId: string;
  userId?: string | null;
  phone: string;
  email?: string;
  salary: number;
  pgName?: string; // Deprecated, use pgNames
  pgNames: string[];
  permissions: string[];
  isActive: boolean;
}

export type OnboardingStatus = 'complete' | 'pending' | 'error' | 'disabled';

export interface OnboardingStep {
  id: string;
  title: string;
  icon: React.ElementType;
  status: OnboardingStatus;
}
