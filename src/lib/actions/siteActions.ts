
'use server'

import { revalidatePath } from 'next/cache'
import { db } from '../firebase'
import { doc, setDoc, getDoc, getDocs, query, where, deleteDoc, updateDoc } from 'firebase/firestore'
import { z } from 'zod'
import { collection } from 'firebase/firestore'
import type { PG, User } from '../types'
import { getAdminDb, selectOwnerDataAdminDb } from '../firebaseAdmin'

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
    logoUrl: z.string().url().optional(),
    faviconUrl: z.string().url().optional(),
    themeColor: z.string().optional(),
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
    updatedAt: z.number().optional(),
});

export type SiteConfig = z.infer<typeof websiteConfigSchema>;

export async function saveSiteConfig(config: SiteConfig & { existingSubdomain?: string | null }) {
    try {
        const { existingSubdomain, ...newConfig } = config;
        const validatedConfig = websiteConfigSchema.parse(newConfig);

        const adminDb = await getAdminDb();

        if (!existingSubdomain || existingSubdomain !== validatedConfig.subdomain) {
            const existingSiteDoc = await adminDb.collection('sites').doc(validatedConfig.subdomain).get();
            if (existingSiteDoc.exists) {
                return { success: false, error: "This subdomain is already taken. Please choose another.", errorField: 'subdomain' };
            }
        }

        await adminDb.collection('sites').doc(validatedConfig.subdomain).set(validatedConfig, { merge: true });

        revalidatePath(`/site/${validatedConfig.subdomain}`);
        if (existingSubdomain && validatedConfig.subdomain !== existingSubdomain) {
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
    try {
        const adminDb = await getAdminDb();
        const snapshot = await adminDb.collection('sites').where('ownerId', '==', ownerId).get();
        if (snapshot.empty) {
            return null;
        }
        return snapshot.docs[0].data() as SiteConfig;
    } catch (error) {
        console.error("Error getting site config:", error);
        return null;
    }
}

export async function deleteSiteConfig(subdomain: string) {
    try {
        const adminDb = await getAdminDb();
        await adminDb.collection('sites').doc(subdomain).delete();
        revalidatePath(`/site/${subdomain}`);
        return { success: true };
    } catch (error) {
        console.error("Error deleting site config:", error);
        return { success: false, error: "Failed to delete the website." };
    }
}

export async function updateSiteStatus(subdomain: string, status: 'published' | 'suspended') {
    try {
        const adminDb = await getAdminDb();
        const siteDocRef = adminDb.collection('sites').doc(subdomain);
        await siteDocRef.update({ status });
        revalidatePath(`/site/${subdomain}`);
        const updatedDoc = await siteDocRef.get();
        return { success: true, config: updatedDoc.data() as SiteConfig };
    } catch (error) {
        console.error("Error updating site status:", error);
        return { success: false, error: "Failed to update site status." };
    }
}


export async function getSiteData(subdomain: string, isPreview: boolean = false) {
    try {
        const adminDb = await getAdminDb();

        const siteDoc = await adminDb.collection('sites').doc(subdomain).get();

        if (!siteDoc.exists) {
            return null;
        }
        const siteConfig = siteDoc.data() as SiteConfig;

        if (siteConfig.status !== 'published' && !isPreview) {
            return { status: siteConfig.status, pgs: [], siteConfig: siteConfig, owner: null };
        }

        const ownerDoc = await adminDb.collection('users').doc(siteConfig.ownerId).get();
        const owner = ownerDoc.exists ? ownerDoc.data() as User : null;

        if (!siteConfig.listedPgs || siteConfig.listedPgs.length === 0) {
            return { pgs: [], siteConfig, owner, status: siteConfig.status };
        }

        // Read PGs from owner's data DB
        const ownerDataDb = await selectOwnerDataAdminDb(siteConfig.ownerId);

        // Firestore 'in' query supports up to 30 items.
        const listedPgsFilter = siteConfig.listedPgs.slice(0, 30);
        if (listedPgsFilter.length === 0) return { pgs: [], siteConfig, owner, status: siteConfig.status };

        const pgsSnapshot = await ownerDataDb.collection('users_data').doc(siteConfig.ownerId).collection('pgs')
            .where('id', 'in', listedPgsFilter).get();

        const pgs = pgsSnapshot.docs.map(d => d.data() as PG);

        return { pgs, siteConfig, owner, status: siteConfig.status };
    } catch (error) {
        console.error("Error in getSiteData:", error);
        return null;
    }
}
