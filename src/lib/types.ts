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
  tenantId: string | null;
}

export interface Room {
  id: string;
  name: string;
  beds: Bed[];
}

export interface Floor {
  id: string;
  name: string;
  rooms: Room[];
}

export interface PG {
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
  rules: string[];
  contact: string; // WhatsApp number
  floors?: Floor[];
}

export interface Tenant {
  id: string;
  name: string;
  pgId: string;
  pgName: string;
  bedId: string;
  rentStatus: 'paid' | 'unpaid';
  dueDate: string;
  rentAmount: number;
  kycStatus: 'verified' | 'pending' | 'rejected';
  kycDocUrl?: string;
  hasMessage?: boolean;
  moveInDate: string;
  noticePeriodDays: number;
  exitDate?: string;
}

export interface Complaint {
  id: string;
  tenantId: string;
  tenantName: string;
  pgId: string;
  category: 'maintenance' | 'cleanliness' | 'wifi' | 'food' | 'other';
  description: string;
  status: 'open' | 'in-progress' | 'resolved';
  date: string;
}
