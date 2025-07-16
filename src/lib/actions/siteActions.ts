
'use server'

import { revalidatePath } from 'next/cache'
import { db } from '../firebase'
import { doc, setDoc, getDoc, getDocs, query, where, deleteDoc, updateDoc } from 'firebase/firestore'
import { z } from 'zod'
import { collection } from 'firebase/firestore'
import type { PG, User } from '../types'

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

const websiteConfigSchema = z.object({
  subdomain: z.string().min(3).regex(/^[a-z0-9-]+$/),
  ownerId: z.string(),
  siteTitle: z.string().min(5),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email().optional(),
  listedPgs: z.array(z.string()).min(1),
  status: z.enum(['published', 'draft', 'suspended']).optional(),
  heroHeadline: z.string().optional(),
  heroSubtext: z.string().optional(),
  aboutTitle: z.string().optional(),
  aboutDescription: z.string().optional(),
  featuresTitle: z.string().optional(),
  featuresDescription: z.string().optional(),
  features: z.array(featureSchema).optional(),
  faqs: z.array(faqSchema).optional(),
  testimonials: z.array(testimonialSchema).optional(),
});

export type SiteConfig = z.infer<typeof websiteConfigSchema>;

export async function saveSiteConfig(config: SiteConfig & { existingSubdomain?: string | null }) {
    try {
        const { existingSubdomain, ...newConfig } = config;
        const validatedConfig = websiteConfigSchema.parse(newConfig);

        if (!db) {
             throw new Error("Firestore is not initialized.");
        }
        
        if (!existingSubdomain || existingSubdomain !== validatedConfig.subdomain) {
            const existingSiteDocRef = doc(db, 'sites', validatedConfig.subdomain);
            const existingSiteDoc = await getDoc(existingSiteDocRef);
            if (existingSiteDoc.exists()) {
                return { success: false, error: "This subdomain is already taken. Please choose another.", errorField: 'subdomain' };
            }
        }
        
        const siteDocRef = doc(db, 'sites', validatedConfig.subdomain);
        await setDoc(siteDocRef, validatedConfig, { merge: true });

        revalidatePath(`/site/${validatedConfig.subdomain}`);
        if(existingSubdomain && validatedConfig.subdomain !== existingSubdomain) {
            revalidatePath(`/site/${existingSubdomain}`);
        }
        
        return { success: true, config: validatedConfig };
    } catch (error) {
        if (error instanceof z.ZodError) {
            console.error("Zod validation error:", error.errors);
            return { success: false, error: "Invalid data provided. Please check all fields." };
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

export async function updateSiteStatus(subdomain: string, status: 'published' | 'suspended') {
     if (!db) {
        return { success: false, error: "Database not connected." };
    }
    try {
        const siteDocRef = doc(db, 'sites', subdomain);
        await updateDoc(siteDocRef, { status });
        revalidatePath(`/site/${subdomain}`);
        const updatedDoc = await getDoc(siteDocRef);
        return { success: true, config: updatedDoc.data() as SiteConfig };
    } catch (error) {
        console.error("Error updating site status:", error);
        return { success: false, error: "Failed to update site status." };
    }
}


export async function getSiteData(subdomain: string, isPreview: boolean = false) {
    if (!db) return null;

    const siteDocRef = doc(db, 'sites', subdomain);
    const siteDoc = await getDoc(siteDocRef);

    if (!siteDoc.exists()) {
        return null;
    }
    const siteConfig = siteDoc.data() as SiteConfig;

    if (siteConfig.status !== 'published' && !isPreview) {
        return { status: siteConfig.status, pgs: [], siteConfig: siteConfig, owner: null };
    }

    const ownerDocRef = doc(db, 'users', siteConfig.ownerId);
    const ownerDoc = await getDoc(ownerDocRef);
    const owner = ownerDoc.exists() ? ownerDoc.data() as User : null;


    if (siteConfig.listedPgs.length === 0) {
        return { pgs: [], siteConfig, owner, status: siteConfig.status };
    }

    const pgsQuery = query(
        collection(db, 'users_data', siteConfig.ownerId, 'pgs'),
        where('id', 'in', siteConfig.listedPgs)
    );
    const pgsSnapshot = await getDocs(pgsQuery);
    const pgs = pgsSnapshot.docs.map(doc => doc.data() as PG);

    return { pgs, siteConfig, owner, status: siteConfig.status };
}
