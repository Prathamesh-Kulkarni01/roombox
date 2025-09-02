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
  roomType: z.enum(['single', 'double', 'triple', 'dormitory']).optional(),
  gender: z.enum(['male', 'female', 'unisex', 'couples']).optional(),
  category: z.enum(['standard', 'premium', 'deluxe']).optional(),
  floor: z.coerce.number().optional(),
  block: z.string().optional(),
  
  // PricingForm
  monthlyRent: z.coerce.number().min(0, "Monthly rent must be a positive number.").optional(),
  securityDeposit: z.coerce.number().min(0, "Security deposit must be a positive number.").optional(),
  lockInMonths: z.coerce.number().optional(),
  electricityBilling: z.enum(['included', 'metered', 'shared']).optional(),
  acCharge: z.object({
    included: z.boolean().optional(),
    charge: z.coerce.number().optional(),
  }).optional(),
  maintenanceCharges: z.coerce.number().optional(),

  // AmenitiesForm
  amenities: z.array(z.string()).optional(),
  furnishingType: z.enum(['fully', 'semi', 'unfurnished']).optional(),

  // RulesForm
  rules: z.array(z.string()).optional(),
  preferredTenants: z.array(z.string()).optional(),
  
  // FoodServicesForm
  foodIncluded: z.boolean().optional(),
  meals: z.array(z.string()).optional(),
  vegNonVeg: z.enum(['veg', 'non-veg', 'both']).optional(),
  housekeepingFrequency: z.enum(['daily', 'alternate', 'weekly']).optional(),
  laundryServices: z.boolean().optional(),
  
  // MediaForm
  images: z.array(z.string()).optional(),
  available: z.boolean().optional(),
  availableFrom: z.date().optional(),
  virtualTourLink: z.string().url().optional().or(z.literal('')),
});
