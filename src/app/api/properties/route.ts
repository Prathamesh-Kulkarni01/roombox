import { NextRequest, NextResponse } from 'next/server';
import { resolveTenant } from '@/platform/auth/server/tenant-resolver';
import { getAdminDb, selectOwnerDataAdminDb } from '@/lib/firebaseAdmin';
import { PropertyService } from '@/services/propertyService';
import { getVerifiedOwnerId } from '@/lib/auth-server';
import { badRequest, serverError, unauthorized } from '@/lib/api/apiError';
import { enforcePermission } from '@/lib/rbac-middleware';
import { uploadDataUriToStorage } from '@/lib/storage';

// GET /api/properties  — list all properties for authenticated owner
export async function GET(req: NextRequest) {
    const result = await enforcePermission(req, 'properties', 'view', 'GET /api/properties');
    if (!result.authorized) return result.response;
    const { ownerId } = result;

    try {
        const db = await selectOwnerDataAdminDb(ownerId);
        const buildings = await PropertyService.getBuildings(db, ownerId);
        const stats = await PropertyService.getBriefingStats(db, ownerId);
        return NextResponse.json({ success: true, buildings, stats });
    } catch (error: any) {
        return serverError(error, 'GET /api/properties');
    }
}

// POST /api/properties — create a new property for authenticated owner
export async function POST(req: NextRequest) {
    const result = await enforcePermission(req, 'properties', 'add', 'POST /api/properties');
    if (!result.authorized) return result.response;
    const { ownerId, plan, userId, name } = result;
    const performer = { userId, name: name || 'Unknown User' };

    try {
        const body = await req.json();
        const { ...propertyData } = body;

        if (!propertyData.name || !propertyData.location) {
            return badRequest('name and location are required');
        }

        const db = await selectOwnerDataAdminDb(ownerId);
        
        // Handle image uploads if any
        let imageUrls: string[] = [];
        if (propertyData.images && Array.isArray(propertyData.images)) {
            imageUrls = await Promise.all(
                propertyData.images.map(async (dataUri: string) => {
                    if (dataUri.startsWith('data:')) {
                        return await uploadDataUriToStorage(dataUri, `properties/${ownerId}`);
                    }
                    return dataUri;
                })
            );
        }

        let logoUrl = '';
        if (propertyData.logo && Array.isArray(propertyData.logo) && propertyData.logo.length > 0) {
            const dataUri = propertyData.logo[0];
            if (dataUri.startsWith('data:')) {
                logoUrl = await uploadDataUriToStorage(dataUri, `sites/${ownerId}/logo`);
            } else {
                logoUrl = dataUri;
            }
        }

        let iconUrl = '';
        if (propertyData.icon && Array.isArray(propertyData.icon) && propertyData.icon.length > 0) {
            const dataUri = propertyData.icon[0];
            if (dataUri.startsWith('data:')) {
                iconUrl = await uploadDataUriToStorage(dataUri, `sites/${ownerId}/icon`);
            } else {
                iconUrl = dataUri;
            }
        }

        const newPg = await PropertyService.createProperty(db, {
            ownerId,
            name: propertyData.name,
            location: propertyData.location,
            city: propertyData.city || 'N/A',
            gender: propertyData.gender || 'unisex',
            autoSetup: propertyData.autoSetup,
            floorCount: propertyData.floorCount,
            roomsPerFloor: propertyData.roomsPerFloor,
            bedsPerRoom: propertyData.bedsPerRoom,
            amenities: propertyData.amenities,
            images: imageUrls,
            planId: plan?.id,
            upiId: propertyData.upiId,
            payeeName: propertyData.payeeName,
            direct_upi_enabled: propertyData.direct_upi_enabled,
            online_payment_enabled: propertyData.online_payment_enabled,
            paymentMode: propertyData.paymentMode
        }, performer);

        // Update owner summary in main app DB using centralized logic
        try {
            const { db: appDb } = await resolveTenant(req);
            await PropertyService.syncPgSummary(db, appDb, ownerId);
        } catch (summaryErr) {
            console.warn('Could not update owner summary:', summaryErr);
        }

        // Auto-generate website if one doesn't exist
        try {
            const { getSiteConfigForOwner, saveSiteConfig } = await import('@/lib/actions/siteActions');
            const existingSite = await getSiteConfigForOwner(ownerId);
            
            if (!existingSite) {
                // Generate subdomain from user input or PG name
                let baseSubdomain = propertyData.subdomain || propertyData.appName?.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || propertyData.name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
                if (baseSubdomain.length < 3) baseSubdomain = `pg-${baseSubdomain}`.padEnd(4, '0');
                
                const siteTitle = propertyData.appName || `${propertyData.name}`;
                
                let attempt = 0;
                let isSaved = false;
                let currentSubdomain = baseSubdomain;
                
                while (!isSaved && attempt < 3) {
                    const result = await saveSiteConfig({
                        subdomain: currentSubdomain,
                        ownerId: ownerId,
                        siteTitle: siteTitle,
                        logoUrl: logoUrl || undefined,
                        faviconUrl: iconUrl || undefined,
                        listedPgs: [newPg.id],
                        status: 'published',
                        websiteStyle: 'classic',
                        themeColor: propertyData.themeColor || '#2563eb',
                        pwaBackgroundColor: '#ffffff',
                        pwaShortName: siteTitle.slice(0, 12),
                        heroHeadline: `Welcome to ${siteTitle}`,
                        heroSubtext: `The best place to stay in ${propertyData.city || 'town'}. Comfortable, secure, and affordable.`,
                        aboutTitle: 'About Us',
                        aboutDescription: 'We provide top quality accommodation with all the amenities you need for a comfortable stay.',
                        featuresTitle: 'Our Facilities',
                        featuresDescription: 'Everything you need for a comfortable stay.',
                        features: propertyData.amenities?.length > 0 ? propertyData.amenities.map((a: string) => ({ 
                            title: a.charAt(0).toUpperCase() + a.slice(1), 
                            description: 'High quality facility provided for all residents.' 
                        })) : [
                             { title: 'WiFi', description: 'High speed internet connection.' },
                             { title: 'Security', description: '24/7 security and surveillance.' }
                        ]
                    });
                    
                    if (result.success) {
                        isSaved = true;
                        console.log(`[Properties] Auto-created website for ${ownerId} at ${currentSubdomain}`);
                    } else if (result.errorField === 'subdomain') {
                        attempt++;
                        currentSubdomain = `${baseSubdomain}-${Math.floor(Math.random() * 10000)}`;
                    } else {
                        console.warn('[Properties] Failed to auto-create website due to validation:', result.error);
                        break;
                    }
                }
            }
        } catch (autoSiteErr) {
            console.warn('Could not auto-create website:', autoSiteErr);
        }

        return NextResponse.json({ success: true, pg: newPg }, { status: 201 });
    } catch (error: any) {
        return serverError(error, 'POST /api/properties');
    }
}

// DELETE /api/properties?pgId=yyy — delete a property for authenticated owner
export async function DELETE(req: NextRequest) {
    const result = await enforcePermission(req, 'properties', 'delete', 'DELETE /api/properties');
    if (!result.authorized) return result.response;
    const { ownerId, userId, name } = result;
    const performer = { userId, name: name || 'Unknown User' };

    try {
        const pgId = req.nextUrl.searchParams.get('pgId');
        if (!pgId) return badRequest('pgId is required');

        const db = await selectOwnerDataAdminDb(ownerId);

        await PropertyService.deleteProperty(db, ownerId, pgId, performer);

        // Update owner summary using centralized logic
        try {
            const { db: appDb } = await resolveTenant(req);
            await PropertyService.syncPgSummary(db, appDb, ownerId);
        } catch (summaryErr) {
            console.warn('Could not update owner summary after delete:', summaryErr);
        }

        return NextResponse.json({ success: true, message: 'Property deleted successfully' });
    } catch (error: any) {
        return serverError(error, 'DELETE /api/properties');
    }
}

// PATCH /api/properties — update a property
export async function PATCH(req: NextRequest) {
    const result = await enforcePermission(req, 'properties', 'edit', 'PATCH /api/properties');
    if (!result.authorized) return result.response;
    const { ownerId, userId, name } = result;
    const performer = { userId, name: name || 'Unknown User' };

    try {
        const body = await req.json();
        const { pgId, updates } = body;

        if (!pgId || !updates) {
            return badRequest('pgId and updates are required');
        }

        const db = await selectOwnerDataAdminDb(ownerId);

        // Process any new image uploads (data URIs)
        if (updates.images && Array.isArray(updates.images)) {
            updates.images = await Promise.all(
                updates.images.map(async (dataUri: string) => {
                    if (dataUri.startsWith('data:')) {
                        return await uploadDataUriToStorage(dataUri, `properties/${ownerId}`);
                    }
                    return dataUri;
                })
            );
        }

        await PropertyService.updateProperty(db, ownerId, pgId, updates, performer);
        const updatedPg = (await db.collection('users_data').doc(ownerId).collection('pgs').doc(pgId).get()).data();

        return NextResponse.json({ success: true, pg: updatedPg });
    } catch (error: any) {
        return serverError(error, 'PATCH /api/properties');
    }
}
