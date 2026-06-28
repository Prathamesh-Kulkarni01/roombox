
import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { resolveTenant } from '@/lib/tenantResolver';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { Firestore } from 'firebase-admin/firestore';
import { encryptTokens } from '@/lib/encryption';

const DEFAULT_ENTERPRISE_RULES = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users_data/{ownerId}/{document=**} {
      allow read, write: if true;
    }
    match /magic_links/{tokenId} {
      allow read, write: if true;
    }
  }
}`;

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
    projectId = state.projectId ? state.projectId.trim() : null; // REQUIRED from Option B UI
    databaseId = state.databaseId ? state.databaseId.trim() : '(default)';

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
        try {
          const fs = require('fs');
          fs.writeFileSync('oauth-error-debug.json', JSON.stringify({
            error: e2?.message,
            stack: e2?.stack,
            response: e2?.response?.data,
            phase: 'webApps'
          }, null, 2));
        } catch {}
      }
    }

    // Optionally: create secondary Firestore DB if requested and not default
    if (databaseId !== '(default)') {
      try {
        const firestoreAdmin = google.firestore({ version: 'v1', auth: oauth2Client as any });
        await (firestoreAdmin.projects.databases.create as any)({
          parent: `projects/${projectId}`,
          databaseId,
          requestBody: { locationId: 'us-central1', type: 'FIRESTORE_NATIVE' },
        });
      } catch (e: any) {
        // ignore already exists; capture other errors
        if (!(e?.code === 409)) {
          stepError = stepError || e?.message || 'db_create_failed';
          try {
            const fs = require('fs');
            fs.writeFileSync('oauth-error-debug.json', JSON.stringify({
              error: e?.message,
              stack: e?.stack,
              response: e?.response?.data,
              phase: 'db_create'
            }, null, 2));
          } catch {}
        }
      }
    }

    // Attempt to deploy default security rules to the database so it's accessible
    try {
      const rulesApi = google.firebaserules({ version: 'v1', auth: oauth2Client as any });
      const createRes = await rulesApi.projects.rulesets.create({
        name: `projects/${projectId}`,
        requestBody: {
          source: {
            files: [{ name: 'firestore.rules', content: DEFAULT_ENTERPRISE_RULES }],
          },
        },
      });

      const rulesetName = createRes.data.name;
      if (rulesetName) {
        const releaseName = databaseId && databaseId !== '(default)'
          ? `projects/${projectId}/releases/cloud.firestore/${databaseId}`
          : `projects/${projectId}/releases/cloud.firestore`;

        await (rulesApi.projects.releases as any).patch({
          name: releaseName,
          updateMask: 'rulesetName',
          requestBody: {
            release: { name: releaseName, rulesetName },
          },
        });
        console.log(`[oauth-callback] Deployed default rules to ${releaseName}`);
      }
    } catch (e: any) {
      console.error('[oauth-callback] Failed to deploy default rules:', e?.message);
    }

    const cleanTokens: any = {};
    if (tokens.access_token) cleanTokens.access_token = tokens.access_token;
    if (tokens.refresh_token) cleanTokens.refresh_token = tokens.refresh_token;
    if (tokens.scope) cleanTokens.scope = tokens.scope;
    if (tokens.token_type) cleanTokens.token_type = tokens.token_type;
    if (tokens.expiry_date) cleanTokens.expiry_date = tokens.expiry_date;
    if (tokens.id_token) cleanTokens.id_token = tokens.id_token;

    console.log('[oauth-callback] ownerId:', ownerId, 'saving tokens keys:', Object.keys(cleanTokens));

    // Save to our main admin DB regardless of clientConfig success, so Option A can still be used
    // SECURITY: Encrypt access_token and refresh_token before storing in Firestore
    const encryptedTokens = encryptTokens(cleanTokens);
    const adminDb: Firestore = (await resolveTenant(req)).db;
    await adminDb.collection('users').doc(ownerId).update({
      'subscription.enterpriseProject': {
        projectId,
        databaseId,
        clientConfig: webAppConfig || null,
        oauthTokens: encryptedTokens,
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
