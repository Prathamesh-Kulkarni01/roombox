
import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { Firestore } from 'firebase-admin/firestore';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const rawState = searchParams.get('state'); // base64 encoded JSON
  
  if (!code || !rawState) {
    return NextResponse.redirect(new URL('/dashboard/enterprise?error=auth_failed', req.url));
  }
  
  const origin = new URL(req.url).origin;
  const redirectUri = `${origin}/api/oauth/google/callback`;

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );

  let ownerId: string | null = null;
  let projectId: string | null = null;
  let databaseId: string | null = null;
  let stepError: string | null = null;

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Parse state
    const state = JSON.parse(Buffer.from(rawState, 'base64').toString('utf-8')) as {
      ownerId: string | null;
      projectId: string | null;
      databaseId: string | null;
    };
    ownerId = state.ownerId;
    projectId = state.projectId; // REQUIRED from Option B UI
    databaseId = state.databaseId || '(default)';

    if (!ownerId) throw new Error('owner_missing');
    if (!projectId) throw new Error('project_missing');

    // Use Firebase Management API to create/get a Web App and fetch client config
    const firebase = google.firebase('v1beta1');
    const parent = `projects/${projectId}`;

    let webAppConfig: any | null = null;
    try {
      const createRes = await firebase.projects.webApps.create({
        parent,
        requestBody: { displayName: `RentSutra App for ${ownerId}` },
        auth: oauth2Client,
      } as any);
      if (createRes.data.name) {
        const cfgRes = await firebase.projects.webApps.getConfig({ name: `${createRes.data.name}/config`, auth: oauth2Client } as any);
        webAppConfig = cfgRes.data;
      }
    } catch (e: any) {
      try {
        const listRes = await firebase.projects.webApps.list({ parent, pageSize: 1, auth: oauth2Client } as any);
        const first = listRes.data.apps && listRes.data.apps[0];
        if (first?.name) {
          const cfgRes = await firebase.projects.webApps.getConfig({ name: `${first.name}/config`, auth: oauth2Client } as any);
          webAppConfig = cfgRes.data;
        }
      } catch (e2: any) {
        stepError = e2?.message || 'webapp_config_failed';
      }
    }

    // Optionally: create secondary Firestore DB if requested and not default
    if (databaseId !== '(default)') {
      try {
        const firestoreAdmin = google.firestore({ version: 'v1', auth: oauth2Client });
        await firestoreAdmin.projects.databases.create({
          parent: `projects/${projectId}`,
          requestBody: { databaseId, locationId: 'nam5', type: 'FIRESTORE_NATIVE' },
        });
      } catch (e: any) {
        // ignore already exists; capture other errors
        if (!(e?.code === 409)) {
          stepError = stepError || e?.message || 'db_create_failed';
        }
      }
    }

    // Save to our main admin DB regardless of clientConfig success, so Option A can still be used
    const adminDb: Firestore = await getAdminDb();
    await adminDb.collection('users').doc(ownerId).update({
      'subscription.enterpriseProject': {
        projectId,
        databaseId,
        clientConfig: webAppConfig || null,
      },
      'subscription.planId': 'enterprise',
      'subscription.status': 'active',
    });

    const qs = stepError ? `onboarding=partial&warning=${encodeURIComponent(stepError)}` : 'onboarding=success';
    return NextResponse.redirect(new URL(`/dashboard/enterprise?${qs}`, req.url));

  } catch (error: any) {
    const msg = error?.message || 'connection_failed';
    return NextResponse.redirect(new URL(`/dashboard/enterprise?error=${encodeURIComponent(msg)}`, req.url));
  }
}
