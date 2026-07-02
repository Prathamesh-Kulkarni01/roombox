import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { isEnterpriseIsolated } from "@/lib/enterprise/isolation";
import { sanitizeClientConfig } from "@/lib/enterprise/tenant-config-public";
import type { DocumentSnapshot } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const domain = url.searchParams.get('domain');

    if (!domain) {
      return NextResponse.json({ error: "Missing domain parameter" }, { status: 400 });
    }

    const hostname = domain.split(':')[0].toLowerCase();
    const adminDb = await getAdminDb();

    let ownerDoc: DocumentSnapshot | null = null;

    const customDomainQuery = await adminDb.collection('users')
      .where('subscription.enterpriseProject.customDomain', '==', hostname)
      .limit(1)
      .get();

    if (!customDomainQuery.empty) {
      ownerDoc = customDomainQuery.docs[0];
    }

    if (!ownerDoc) {
      const baseDomain = process.env.NEXT_PUBLIC_APP_URL
        ? new URL(process.env.NEXT_PUBLIC_APP_URL).hostname
        : 'rentsutra.in';

      if (hostname !== baseDomain && hostname.endsWith(`.${baseDomain}`)) {
        const subdomain = hostname.replace(`.${baseDomain}`, '');
        const { getOwnerIdFromSubdomain } = await import('@/lib/actions/siteActions');
        const ownerId = await getOwnerIdFromSubdomain(subdomain);

        if (ownerId) {
          const snap = await adminDb.collection('users').doc(ownerId).get();
          if (snap.exists) {
            ownerDoc = snap;
          }
        }
      }
    }

    if (!ownerDoc?.exists) {
      return NextResponse.json({ isEnterprise: false });
    }

    const ownerData = ownerDoc.data() as Record<string, unknown>;
    if (!isEnterpriseIsolated(ownerData)) {
      return NextResponse.json({ isEnterprise: false });
    }

    const subscription = ownerData.subscription as Record<string, unknown> | undefined;
    const project = subscription?.enterpriseProject as Record<string, unknown> | undefined;
    const clientConfig = project?.clientConfig as Record<string, unknown> | undefined;
    const sanitizedConfig = clientConfig ? sanitizeClientConfig(clientConfig) : null;

    if (!sanitizedConfig) {
      return NextResponse.json({
        isEnterprise: true,
        clientConfig: null,
        databaseId: project?.databaseId ?? null,
        message: 'Enterprise database connected. Complete Firebase web app setup to enable subdomain login.',
      });
    }

    return NextResponse.json({
      isEnterprise: true,
      clientConfig: sanitizedConfig,
      databaseId: project?.databaseId ?? '(default)',
    });
  } catch (error) {
    console.error("[tenant-config] API Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
