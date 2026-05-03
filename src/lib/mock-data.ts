
import type { PG } from './types';

// This is temporary mock data for the public PG pages.
// In a real app, you would fetch this from a public Firestore collection.
export const mockPgs: PG[] = [
  {
    id: 'sunshine-pg',
    ownerId: 'mock-owner',
    name: 'Sunshine PG',
    location: 'Koramangala, Bangalore',
    city: 'Bangalore',
    gender: 'female',
    images: [
      "https://placehold.co/1200x600.png",
      "https://placehold.co/600x400.png",
      "https://placehold.co/600x400.png",
    ],
    rating: 4.5,
    occupancy: 25,
    totalBeds: 30,
    totalRooms: 10,
    rules: [
      'No guests allowed after 10 PM.',
      'Maintain cleanliness in common areas.',
      'Rent to be paid by the 5th of every month.',
    ],
    contact: '+919876543210',
    priceRange: { min: 5000, max: 15000 },
    amenities: ['wifi', 'ac', 'food'],
    status: 'active',
  },
];
