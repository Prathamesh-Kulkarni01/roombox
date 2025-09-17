
import { z } from 'zod';

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
  // RoomBasicsForm
  roomTitle: z.string().min(1, "Room name/number is required."),
  roomType: z.enum(['single', 'double', 'triple', 'dormitory']).optional().default('double'),
  gender: z.enum(['male', 'female', 'unisex', 'couples']).optional().default('unisex'),
  category: z.enum(['standard', 'premium', 'deluxe']).optional().default('standard'),
  floor: z.coerce.number().optional().default(0),
  block: z.string().optional().default(''),
  
  // PricingForm
  monthlyRent: z.coerce.number().min(0, "Monthly rent must be a positive number.").optional().default(0),
  securityDeposit: z.coerce.number().min(0, "Security deposit must be a positive number.").optional().default(0),
  lockInMonths: z.coerce.number().optional().default(0),
  electricityBilling: z.enum(['included', 'metered', 'shared']).optional().default('included'),
  acCharge: z.object({
    included: z.boolean().optional().default(false),
    charge: z.coerce.number().optional().default(0),
  }).optional().default({ included: false, charge: 0 }),
  maintenanceCharges: z.coerce.number().optional().default(0),

  // AmenitiesForm
  amenities: z.array(z.string()).optional().default([]),
  furnishingType: z.enum(['fully', 'semi', 'unfurnished']).optional().default('fully'),

  // RulesForm
  rules: z.array(z.string()).optional().default([]),
  preferredTenants: z.array(z.string()).optional().default([]),
  
  // FoodServicesForm
  foodIncluded: z.boolean().optional().default(false),
  meals: z.array(z.string()).optional().default([]),
  vegNonVeg: z.enum(['veg', 'non-veg', 'both']).optional().default('veg'),
  housekeepingFrequency: z.enum(['daily', 'alternate', 'weekly']).optional().default('daily'),
  laundryServices: z.boolean().optional().default(false),
  
  // MediaForm
  images: z.array(z.string()).optional().default([]),
  available: z.boolean().optional().default(true),
  availableFrom: z.date().optional().default(() => new Date()),
  virtualTourLink: z.string().url().optional().or(z.literal('')).default(''),
});

export type RoomFormValues = z.infer<typeof roomSchema>;
