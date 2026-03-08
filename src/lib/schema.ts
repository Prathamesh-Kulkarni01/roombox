import { z } from 'zod';
import { CURRENT_SCHEMA_VERSION } from './types';

export const PGSchema = z.object({
    id: z.string(),
    name: z.string(),
    location: z.string(),
    city: z.string().optional(),
    gender: z.enum(['male', 'female', 'co-ed']).optional(),
    priceRange: z.object({
        min: z.number(),
        max: z.number(),
    }).optional(),
    rating: z.number().optional(),
    occupancy: z.number().optional(),
    totalBeds: z.number().optional(),
    totalRooms: z.number().optional(),
    contact: z.string().optional(),
    ownerId: z.string(),
    status: z.enum(['active', 'pending_approval', 'rejected', 'suspended']).default('active'),
    schemaVersion: z.number().default(CURRENT_SCHEMA_VERSION),
}).passthrough(); // allows other fields to pass through without being stripped

export const GuestSchema = z.object({
    id: z.string(),
    name: z.string(),
    phone: z.string().optional(),
    email: z.string().optional(),
    pgId: z.string(),
    pgName: z.string().optional(),
    bedId: z.string(),
    roomId: z.string().optional(),
    rentStatus: z.enum(['paid', 'unpaid', 'partial']).default('unpaid'),
    dueDate: z.string().optional(),
    rentAmount: z.number().default(0),
    depositAmount: z.number().default(0),
    kycStatus: z.enum(['not-started', 'pending', 'verified', 'rejected']).default('not-started'),
    moveInDate: z.string().optional(),
    noticePeriodDays: z.number().default(30),
    rentCycleUnit: z.enum(['minutes', 'hours', 'days', 'weeks', 'months']).default('months'),
    rentCycleValue: z.number().default(1),
    billingAnchorDay: z.number().default(1),
    isVacated: z.boolean().default(false),
    schemaVersion: z.number().default(CURRENT_SCHEMA_VERSION),
}).passthrough();

export const PaymentSchema = z.object({
    id: z.string(),
    date: z.string(),
    amount: z.number(),
    method: z.enum(['cash', 'upi', 'in-app']),
    forMonth: z.string(),
    notes: z.string().optional(),
    schemaVersion: z.number().default(CURRENT_SCHEMA_VERSION),
}).passthrough();

export const ComplaintSchema = z.object({
    id: z.string(),
    guestId: z.string().nullable(),
    guestName: z.string(),
    pgId: z.string(),
    category: z.enum(['maintenance', 'cleanliness', 'wifi', 'food', 'other']),
    description: z.string(),
    status: z.enum(['open', 'in-progress', 'resolved']).default('open'),
    date: z.string(),
    isPublic: z.boolean().default(false),
    schemaVersion: z.number().default(CURRENT_SCHEMA_VERSION),
}).passthrough();
