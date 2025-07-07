

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
  amenities?: Amenity[];
}

export interface Floor {
  id:string;
  name: string;
  rooms: Room[];
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
  depositAmount?: number;
  kycStatus: 'verified' | 'pending' | 'rejected';
  kycDocUrl?: string;
  hasMessage?: boolean;
  moveInDate: string;
  noticePeriodDays: number;
  exitDate?: string;
  userId?: string;
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

export interface Staff {
  id: string;
  name: string;
  email?: string;
  role: 'manager' | 'cleaner' | 'cook' | 'security' | 'other';
  phone: string;
  salary: number;
  pgId: string;
  pgName: string;
}

export interface Notification {
  id: string;
  type: 'rent-due' | 'checkout-soon' | 'new-complaint' | 'rent-overdue';
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
  hasAutomatedWhatsapp: boolean;
  hasMarketplace: boolean;
  hasCloudSync: boolean;
  description: string;
}

export interface User {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  password?: string;
  role: UserRole;
  pgIds?: string[];
  avatarUrl?: string;
  guestId?: string; // Link to a Guest record if the user is a tenant
  subscription?: {
    planId: PlanName;
    status: 'active' | 'inactive';
  };
}
