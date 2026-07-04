import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { isEnterpriseIsolated } from "@/lib/enterprise/isolation";
import { sanitizeClientConfig } from "@/lib/enterprise/tenant-config-public";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const ownerId = url.searchParams.get('ownerId');

    if (!ownerId) {
      return NextResponse.json({ error: "Missing ownerId parameter" }, { status: 400 });
    }

    const adminDb = await getAdminDb();
    const ownerDoc = await adminDb.collection('users').doc(ownerId).get();

    if (!ownerDoc.exists) {
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
    console.error("[tenant-config/by-owner] API Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
