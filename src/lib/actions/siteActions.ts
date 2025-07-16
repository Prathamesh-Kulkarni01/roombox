
'use server'

import { revalidatePath } from 'next/cache'
import { db } from '../firebase'
import { doc, setDoc, getDoc, getDocs, query, where, deleteDoc } from 'firebase/firestore'
import { z } from 'zod'

const websiteConfigSchema = z.object({
  subdomain: z.string().min(3).regex(/^[a-z0-9-]+$/),
  ownerId: z.string(),
  siteTitle: z.string().min(5),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email().optional(),
  listedPgs: z.array(z.string()).min(1),
});

export type SiteConfig = z.infer<typeof websiteConfigSchema>;

export async function saveSiteConfig(config: SiteConfig & { existingSubdomain?: string | null }) {
    try {
        const { existingSubdomain, ...newConfig } = config;
        const validatedConfig = websiteConfigSchema.parse(newConfig);

        if (!db) {
             throw new Error("Firestore is not initialized.");
        }
        
        // Check for subdomain uniqueness if it's new or has changed
        if (validatedConfig.subdomain !== existingSubdomain) {
            const existingSiteDocRef = doc(db, 'sites', validatedConfig.subdomain);
            const existingSiteDoc = await getDoc(existingSiteDocRef);
            if (existingSiteDoc.exists()) {
                return { success: false, error: "This subdomain is already taken. Please choose another.", errorField: 'subdomain' };
            }
        }
        
        // If the subdomain has changed, delete the old document
        if (existingSubdomain && validatedConfig.subdomain !== existingSubdomain) {
            const oldSiteDocRef = doc(db, 'sites', existingSubdomain);
            await deleteDoc(oldSiteDocRef);
        }

        const siteDocRef = doc(db, 'sites', validatedConfig.subdomain);
        await setDoc(siteDocRef, validatedConfig);

        revalidatePath(`/site/${validatedConfig.subdomain}`);
        if(existingSubdomain && validatedConfig.subdomain !== existingSubdomain) {
            revalidatePath(`/site/${existingSubdomain}`);
        }
        
        return { success: true, config: validatedConfig };
    } catch (error) {
        if (error instanceof z.ZodError) {
            return { success: false, error: "Invalid data provided." };
        }
        console.error("Error saving site config:", error);
        return { success: false, error: "An unexpected error occurred." };
    }
}

export async function getSiteConfigForOwner(ownerId: string): Promise<SiteConfig | null> {
    if (!db) return null;
    const q = query(collection(db, 'sites'), where('ownerId', '==', ownerId));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
        return null;
    }
    return querySnapshot.docs[0].data() as SiteConfig;
}

export async function deleteSiteConfig(subdomain: string) {
    if (!db) {
        return { success: false, error: "Database not connected." };
    }
    try {
        const siteDocRef = doc(db, 'sites', subdomain);
        await deleteDoc(siteDocRef);
        revalidatePath(`/site/${subdomain}`);
        return { success: true };
    } catch (error) {
        console.error("Error deleting site config:", error);
        return { success: false, error: "Failed to delete the website." };
    }
}
