
'use server'

import { revalidatePath } from 'next/cache'
import { db } from '../firebase'
import { doc, setDoc } from 'firebase/firestore'
import { z } from 'zod'

const websiteConfigSchema = z.object({
  subdomain: z.string().min(3).regex(/^[a-z0-9-]+$/),
  ownerId: z.string(),
  siteTitle: z.string().min(5),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email().optional(),
  listedPgs: z.array(z.string()).min(1),
});

export async function saveSiteConfig(config: z.infer<typeof websiteConfigSchema>) {
    try {
        const validatedConfig = websiteConfigSchema.parse(config);

        if (!db) {
             throw new Error("Firestore is not initialized.");
        }

        const siteDocRef = doc(db, 'sites', validatedConfig.subdomain);
        await setDoc(siteDocRef, validatedConfig);

        // Revalidate the path to ensure the public site updates immediately
        revalidatePath(`/site/${validatedConfig.subdomain}`);
        
        return { success: true };
    } catch (error) {
        if (error instanceof z.ZodError) {
            return { success: false, error: "Invalid data provided." };
        }
        console.error("Error saving site config:", error);
        return { success: false, error: "An unexpected error occurred." };
    }
}
