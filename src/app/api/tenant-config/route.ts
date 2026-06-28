import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const url = new URL(req.url);
        const domain = url.searchParams.get('domain');

        if (!domain) {
            return NextResponse.json({ error: "Missing domain parameter" }, { status: 400 });
        }

        const adminDb = await getAdminDb();
        
        // Find owner by custom domain
        let ownerQuery = adminDb.collection('users')
            .where('subscription.enterpriseProject.customDomain', '==', domain)
            .limit(1);
            
        let snapshot = await ownerQuery.get();

        // If not found by custom domain, check if it matches a system subdomain
        if (snapshot.empty) {
            const hostname = domain.split(':')[0];
            const baseDomain = process.env.NEXT_PUBLIC_APP_URL ? new URL(process.env.NEXT_PUBLIC_APP_URL).hostname : 'rentsutra.in';
            
            if (hostname !== baseDomain && hostname.endsWith(`.${baseDomain}`)) {
                const subdomain = hostname.replace(`.${baseDomain}`, '');
                const { getOwnerIdFromSubdomain } = await import('@/lib/actions/siteActions');
                const ownerId = await getOwnerIdFromSubdomain(subdomain);
                
                if (ownerId) {
                    const ownerDoc = await adminDb.collection('users').doc(ownerId).get();
                    if (ownerDoc.exists) {
                        snapshot = { empty: false, docs: [ownerDoc] } as any;
                    }
                }
            }
        }

        if (snapshot.empty) {
            return NextResponse.json({ isEnterprise: false });
        }

        const ownerData = snapshot.docs[0].data();
        const enterpriseProject = ownerData?.subscription?.enterpriseProject;

        if (enterpriseProject && enterpriseProject.clientConfig) {
            return NextResponse.json({
                isEnterprise: true,
                ownerId: snapshot.docs[0].id,
                clientConfig: enterpriseProject.clientConfig,
                databaseId: enterpriseProject.databaseId
            });
        }

        return NextResponse.json({ isEnterprise: false });
    } catch (error) {
        console.error("[tenant-config] API Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
