
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
  ownerId: z.string(),
  roomTitle: z.string().min(1, "Room name/number is required."),
  roomType: z.enum(['single', 'double', 'triple', 'dormitory']),
  gender: z.enum(['male', 'female', 'unisex', 'couples']),
  category: z.enum(['standard', 'premium', 'deluxe']),
  floor: z.number().optional(),
  block: z.string().optional(),
  
  monthlyRent: z.number().min(0),
  securityDeposit: z.number().min(0),
  lockInMonths: z.number().optional(),
  electricityBilling: z.enum(['included', 'metered', 'shared']),
  acCharge: z.object({
    included: z.boolean(),
    charge: z.number().optional(),
  }),
  maintenanceCharges: z.number().optional(),

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
  virtualTourLink: z.string().url().optional(),

  address: z.string().optional(),
  landmark: z.string().optional(),
  distanceCollege: z.string().optional(),
  distanceOffice: z.string().optional(),
  distanceMetro: z.string().optional(),
  description: z.string().optional(),
  showLocation: z.boolean().optional(),
});

type RoomData = z.infer<typeof roomSchema>;

export async function saveRoomData(data: RoomData) {
  try {
    const validatedData = roomSchema.parse(data);
    const roomId = `room-${Date.now()}`;
    const roomRef = doc(db, 'rooms', roomId);
    
    // Firestore doesn't handle Date objects from server components well, convert to ISO string
    const dataToSave = {
        ...validatedData,
        availableFrom: validatedData.availableFrom.toISOString(),
    };

    await setDoc(roomRef, dataToSave);
    
    // Revalidate dashboard path to show new room potentially
    revalidatePath('/dashboard/pg-management');
    
    return { success: true, roomId };
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Zod validation error:", error.errors);
      return { success: false, error: "Invalid data provided. Please check all fields." };
    }
    console.error("Error saving room data:", error);
    return { success: false, error: "An unexpected error occurred while saving the room." };
  }
}
