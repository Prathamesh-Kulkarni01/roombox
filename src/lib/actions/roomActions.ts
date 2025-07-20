
'use server'

import { z } from 'zod';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { revalidatePath } from 'next/cache';

const featureSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
});

const faqSchema = z.object({
  q: z.string().min(1),
  a: z.string().min(1),
});

const testimonialSchema = z.object({
  quote: z.string().min(1),
  author: z.string().min(1),
});

export const roomSchema = z.object({
  roomTitle: z.string().min(1, "Room name/number is required."),
  roomType: z.enum(['single', 'double', 'triple', 'dormitory']),
  gender: z.enum(['male', 'female', 'unisex', 'couples']),
  category: z.enum(['standard', 'premium', 'deluxe']),
  floor: z.coerce.number().optional(),
  block: z.string().optional(),
  
  monthlyRent: z.coerce.number().min(0, "Monthly rent must be a positive number."),
  securityDeposit: z.coerce.number().min(0, "Security deposit must be a positive number."),
  lockInMonths: z.coerce.number().optional(),
  electricityBilling: z.enum(['included', 'metered', 'shared']),
  acCharge: z.object({
    included: z.boolean(),
    charge: z.coerce.number().optional(),
  }),
  maintenanceCharges: z.coerce.number().optional(),

  amenities: z.array(z.string()),
  furnishingType: z.enum(['fully', 'semi', 'unfurnished']),

  rules: z.array(z.string()),
  preferredTenants: z.array(z.string()),
  
  foodIncluded: z.boolean(),
  meals: z.array(z.string()).optional(),
  vegNonVeg: z.enum(['veg', 'non-veg', 'both']).optional(),
  
  housekeepingFrequency: z.enum(['daily', 'alternate', 'weekly']).optional(),
  laundryServices: z.boolean(),
  
  images: z.array(z.string()).optional(),
  available: z.boolean(),
  availableFrom: z.date(),
  virtualTourLink: z.string().url().optional().or(z.literal('')),

  address: z.string().optional(),
  landmark: z.string().optional(),
  distanceCollege: z.string().optional(),
  distanceOffice: z.string().optional(),
  distanceMetro: z.string().optional(),
  description: z.string().optional(),
  showLocation: z.boolean().optional(),
});
