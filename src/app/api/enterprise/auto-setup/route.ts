import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getVerifiedOwnerId } from '@/lib/auth-server';
import { badRequest, serverError, unauthorized } from '@/lib/api/apiError';
import { getAdminDb, selectOwnerDataAdminDb } from '@/lib/firebaseAdmin';
import { decryptTokens } from '@/lib/encryption';

const fs = require('fs');
const path = require('path');

// Enterprise rules: always use the dedicated enterprise rules file.
// This is purpose-built for isolated custom databases — never push the main
// firestore.rules which contains unrelated collections (waitlist, community_posts, etc.)
const FALLBACK_FIRESTORE_RULES = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuth() { return request.auth != null; }
    function isOwner(ownerId) { return isAuth() && request.auth.uid == ownerId; }
    function isStaffOf(ownerId) {
      return isAuth()
        && request.auth.token.get('ownerId', '') == ownerId
        && request.auth.token.get('role', '') in ['manager', 'cleaner', 'cook', 'security', 'staff', 'other'];
    }
    function isTenantOf(ownerId) {
      return isAuth()
        && request.auth.token.get('ownerId', '') == ownerId
        && request.auth.token.get('role', '') == 'tenant';
    }
    function isAssignedToPg(pgId) { return pgId in request.auth.token.get('pgs', []); }

    match /users_data/{ownerId}/{collectionName}/{docId} {
      allow read, write: if collectionName == 'connection_tests';
      allow read, write: if isOwner(ownerId);
      allow read, write: if isStaffOf(ownerId) && (
        collectionName == 'chargeTemplates' ||
        (collectionName == 'pgs' && isAssignedToPg(docId)) ||
        (resource.data.get('pgId', '__none__') != '__none__' && isAssignedToPg(resource.data.pgId)) ||
        (request.resource.data.get('pgId', '__none__') != '__none__' && isAssignedToPg(request.resource.data.pgId)) ||
        (collectionName == 'staff' && (
          resource.data.get('pgIds', []).hasAny(request.auth.token.get('pgs', [])) ||
          request.resource.data.get('pgIds', []).hasAny(request.auth.token.get('pgs', []))
        ))
      );
      allow list: if isStaffOf(ownerId) && (
        collectionName == 'chargeTemplates' ||
        (request.query.filters.get('pgId', null) != null && request.auth.token.get('pgs', []).hasAll(request.query.filters.pgId))
      );
      allow get: if isTenantOf(ownerId) && (
        (collectionName == 'guests' && resource.data.get('guestId', '') == request.auth.token.get('guestId', '')) ||
        (collectionName == 'pgs' && docId == request.auth.token.get('pgId', '')) ||
        (collectionName == 'complaints' && resource.data.get('guestId', '') == request.auth.token.get('guestId', ''))
      );
      allow list: if isTenantOf(ownerId) && (
        (collectionName == 'complaints' && request.query.filters.get('guestId', '') == request.auth.token.get('guestId', ''))
      );
      allow create: if isTenantOf(ownerId) && collectionName == 'complaints' &&
        request.resource.data.get('guestId', '') == request.auth.token.get('guestId', '');
    }

    match /users_data/{ownerId}/pgs/{pgId}/{subCollection}/{subId} {
      allow read, write: if isOwner(ownerId);
      allow read, write: if isStaffOf(ownerId) && isAssignedToPg(pgId);
      allow read: if isTenantOf(ownerId) && request.auth.token.get('pgId', '') == pgId;
    }

    match /magic_links/{tokenId} {
      allow read: if true;
      allow write: if false;
    }

    match /sites/{subdomain} { allow read: if true; allow write: if false; }
    match /pwa_configs/{ownerId} { allow read: if true; allow write: if false; }

    match /activity_logs/{logId} {
      allow read: if isAuth() && (
        request.auth.uid == resource.data.get('ownerId', '') ||
        request.auth.token.get('ownerId', '') == resource.data.get('ownerId', '')
      );
      allow write: if false;
    }

    match /{document=**} { allow read, write: if false; }
  }
}`;

let FIRESTORE_RULES = FALLBACK_FIRESTORE_RULES;
try {
  // Always prefer the dedicated enterprise rules file over the main firestore.rules
  const enterpriseRulesPath = path.resolve(process.cwd(), 'firestore.enterprise.rules');
  const mainRulesPath = path.resolve(process.cwd(), 'firestore.rules');
  if (fs.existsSync(enterpriseRulesPath)) {
    FIRESTORE_RULES = fs.readFileSync(enterpriseRulesPath, 'utf8');
    console.log('[auto-setup] Using dedicated enterprise rules from firestore.enterprise.rules');
  } else if (fs.existsSync(mainRulesPath)) {
    // Legacy fallback: inject magic_links into main rules if enterprise file missing
    const mainRules = fs.readFileSync(mainRulesPath, 'utf8');
    if (mainRules.includes('match /{document=**} {') && !mainRules.includes('match /magic_links/{tokenId}')) {
      FIRESTORE_RULES = mainRules.replace(
        'match /{document=**} {',
        'match /magic_links/{tokenId} { allow read: if true; allow write: if false; }\n\n    match /{document=**} {'
      );
    } else {
      FIRESTORE_RULES = mainRules;
    }
    console.warn('[auto-setup] firestore.enterprise.rules not found, using main firestore.rules as fallback.');
  }
} catch (e) {
  console.warn('[auto-setup] Could not read rules files, using inline fallback.');
}


const REQUIRED_INDEXES = [
  { collectionGroup: "community_posts", fields: [{ fieldPath: "pgId", order: "ASCENDING" }, { fieldPath: "date", order: "DESCENDING" }] },
  { collectionGroup: "community_posts", fields: [{ fieldPath: "pgId", order: "ASCENDING" }, { fieldPath: "type", order: "ASCENDING" }, { fieldPath: "date", order: "DESCENDING" }] },
  { collectionGroup: "meter_readings", fields: [{ fieldPath: "pgId", order: "ASCENDING" }, { fieldPath: "readingDate", order: "DESCENDING" }] },
  { collectionGroup: "staff_advances", fields: [{ fieldPath: "staffId", order: "ASCENDING" }, { fieldPath: "date", order: "DESCENDING" }] },
  { collectionGroup: "staff_payrolls", fields: [{ fieldPath: "staffId", order: "ASCENDING" }, { fieldPath: "month", order: "DESCENDING" }] },
  { collectionGroup: "refund_records", fields: [{ fieldPath: "pgId", order: "ASCENDING" }, { fieldPath: "refundDate", order: "DESCENDING" }] },
  { collectionGroup: "activity_logs", fields: [{ fieldPath: "ownerId", order: "ASCENDING" }, { fieldPath: "timestamp", order: "DESCENDING" }] }
];

export async function POST(req: NextRequest) {
  const { ownerId, error: authError } = await getVerifiedOwnerId(req);
  if (!ownerId) return unauthorized(authError);

  try {
    const body = await req.json();
    const { projectId: rawProjectId, databaseId: rawDatabaseId = '(default)', action } = body;
    const projectId = rawProjectId?.trim();
    const databaseId = rawDatabaseId?.trim() || '(default)';

    if (!projectId) return badRequest('projectId is required.');

    const adminDb = await getAdminDb();
    const ownerSnap = await adminDb.collection('users').doc(ownerId).get();
    const ownerData = ownerSnap.data();
    const oauthTokens = ownerData?.subscription?.enterpriseProject?.oauthTokens;

    let authClient: any;
    console.log('[auto-setup] ownerId:', ownerId, 'has oauthTokens:', !!oauthTokens);

    // HYBRID SERVICE ACCOUNT DELEGATION (V3 Approach)
    // We use the central service account which was granted roles/owner on the target project,
    // instead of relying on limited user OAuth tokens.
    if (true) {
      // Initialize Google Auth using RentSutra service account credentials
      // Note: The owner must add our service account email as Datastore/Firebase Owner in their GCP IAM console.
      const projectIdEnv = process.env.FIREBASE_PROJECT_ID;
      const clientEmailEnv = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKeyEnv = process.env.FIREBASE_PRIVATE_KEY;
      const legacyConfigEnv = process.env.FIREBASE_ADMIN_SDK_CONFIG;

      let credentials: any = undefined;
      if (clientEmailEnv && privateKeyEnv) {
        credentials = {
          type: 'service_account',
          client_email: clientEmailEnv,
          private_key: privateKeyEnv.replace(/\\n/g, '\n').replace(/"/g, ''),
          project_id: projectIdEnv
        };
      } else if (legacyConfigEnv) {
        try {
          credentials = JSON.parse(legacyConfigEnv);
        } catch {}
      } else {
        // Try to load service-account.json from root for local development
        try {
          const fs = require('fs');
          const path = require('path');
          const saPath = path.resolve(process.cwd(), 'service-account.json');
          if (fs.existsSync(saPath)) {
            credentials = JSON.parse(fs.readFileSync(saPath, 'utf8'));
          }
        } catch {}
      }

      console.log('[auto-setup] Falling back to service account:', credentials?.client_email || 'none found');
      
      const jwtClient = new google.auth.JWT({
        email: credentials.client_email,
        key: credentials.private_key,
        scopes: [
          'https://www.googleapis.com/auth/cloud-platform',
          'https://www.googleapis.com/auth/datastore',
          'https://www.googleapis.com/auth/firebase'
        ]
      });
      
      // Attempt to authorize to fail early if credentials are bad
      try {
        await jwtClient.authorize();
        console.log('[auto-setup] JWT Client authorized successfully. Injecting raw token.');
        
        // Next.js bundling sometimes breaks googleapis auth object instanceof checks.
        // Bypassing it by directly injecting the raw Bearer token into global headers.
        const token = jwtClient.credentials.access_token;
        if (token) {
          google.options({
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
        }
      } catch (e) {
        console.error('[auto-setup] Failed to authorize JWT client:', e);
      }
      
      authClient = jwtClient;
    }

    if (action === 'setup') {
      const results = {
        rules: { success: false, error: null as string | null },
        indexes: [] as Array<{ collection: string; success: boolean; error: string | null }>,
        domains: { success: false, error: null as string | null }
      };

      // 0. Enable Identity Toolkit API (Firebase Auth)
      try {
        const serviceusage = google.serviceusage({ version: 'v1' });
        await serviceusage.services.enable({
          name: `projects/${projectId}/services/identitytoolkit.googleapis.com`
        });
        console.log('[auto-setup] Identity Toolkit API enabled automatically for', projectId);
      } catch (apiErr: any) {
        console.warn('[auto-setup] Could not enable Identity Toolkit API automatically:', apiErr.message);
      }

      // 1. Deploy Firestore Security Rules
      try {
        const rules = google.firebaserules({ version: 'v1' });
        const createRes = await rules.projects.rulesets.create({
          name: `projects/${projectId}`,
          requestBody: {
            source: {
              files: [
                {
                  name: 'firestore.rules',
                  content: FIRESTORE_RULES
                }
              ]
            }
          }
        });

        if (createRes.data.name) {
          const releaseName = databaseId && databaseId !== '(default)'
            ? `projects/${projectId}/releases/cloud.firestore/${databaseId}`
            : `projects/${projectId}/releases/cloud.firestore`;
            
          try {
            await (rules.projects.releases.patch as any)({
              name: releaseName,
              updateMask: 'rulesetName',
              requestBody: {
                release: {
                  name: releaseName,
                  rulesetName: createRes.data.name
                }
              }
            });
          } catch (patchErr: any) {
            if (patchErr.status === 404 || patchErr.code === 404 || patchErr.message?.toLowerCase().includes('not found')) {
              // Create the release if it doesn't exist
              await (rules.projects.releases.create as any)({
                name: `projects/${projectId}`, // The parent
                requestBody: {
                  name: releaseName,
                  rulesetName: createRes.data.name
                }
              });
            } else {
              throw patchErr;
            }
          }
          results.rules.success = true;
        }
      } catch (err: any) {
        results.rules.error = err.message || String(err);
      }

      // 2. Create Composite Indexes
      const firestoreAdmin = google.firestore({ version: 'v1' });
      for (const idx of REQUIRED_INDEXES) {
        try {
          await firestoreAdmin.projects.databases.collectionGroups.indexes.create({
            parent: `projects/${projectId}/databases/${databaseId}/collectionGroups/${idx.collectionGroup}`,
            requestBody: {
              queryScope: 'COLLECTION',
              fields: idx.fields
            }
          });
          results.indexes.push({ collection: idx.collectionGroup, success: true, error: null });
        } catch (err: any) {
          // Ignore if index already exists (code 409)
          if (err.status === 409 || err.code === 409 || err.message?.includes('already exists')) {
            results.indexes.push({ collection: idx.collectionGroup, success: true, error: 'Already exists' });
          } else {
            results.indexes.push({ collection: idx.collectionGroup, success: false, error: err.message || String(err) });
          }
        }
      }

      // 3. Configure Authorized Domain (rentsutra.in, localhost, and owner's subdomains) via Identity Toolkit API
      try {
        const identity = google.identitytoolkit({ version: 'v2' });
        
        const pgsSnap = await adminDb.collection('users_data').doc(ownerId).collection('pgs').get();
        const subdomains = pgsSnap.docs.map(doc => doc.data().subdomain).filter(Boolean);
        
        const authorizedDomains = [
          'localhost', 
          'rentsutra.in',
          'dev.rentsutra.in',
          'staging.rentsutra.in'
        ];
        
        subdomains.forEach(sub => {
          authorizedDomains.push(`${sub}.rentsutra.in`);
          authorizedDomains.push(`${sub}.dev.rentsutra.in`);
          authorizedDomains.push(`${sub}.staging.rentsutra.in`);
        });

        // If the owner has a custom top-level domain
        const customDomain = ownerData?.subscription?.enterpriseProject?.customDomain;
        if (customDomain) {
          authorizedDomains.push(customDomain);
        }

        const uniqueDomains = Array.from(new Set(authorizedDomains));
        console.log('[auto-setup] Authorizing domains:', uniqueDomains);

        await identity.projects.updateConfig({
          name: `projects/${projectId}/config`,
          updateMask: 'authorizedDomains',
          requestBody: {
            authorizedDomains: uniqueDomains
          }
        });
        results.domains.success = true;
      } catch (err: any) {
        if (err.status === 404 || err.code === 404 || err.message?.includes('CONFIGURATION_NOT_FOUND')) {
          console.warn('[auto-setup] Identity Toolkit configuration not found. Skipping domain authorization.');
          results.domains.success = true; // Treat as soft-success so it doesn't block setup
        } else {
          results.domains.error = err.message || String(err);
        }
      }

      const failedIndexes = results.indexes.filter(idx => !idx.success);
      const hasErrors = !results.rules.success || !results.domains.success || failedIndexes.length > 0;
      
      if (hasErrors) {
        const errors: string[] = [];
        if (!results.rules.success) errors.push(`Security Rules: ${results.rules.error}`);
        if (!results.domains.success) errors.push(`Auth Domains: ${results.domains.error}`);
        if (failedIndexes.length > 0) {
          errors.push(`Indexes: ${failedIndexes.map(f => `${f.collection} (${f.error})`).join(', ')}`);
        }
        return NextResponse.json({ 
          success: false, 
          error: `Auto-setup failed: ${errors.join(' | ')}`,
          results
        });
      }

      return NextResponse.json({ success: true, results });
    }

    if (action === 'verify') {
      const status = {
        rules: { status: 'UNKNOWN', ruleset: null as string | null },
        indexes: [] as Array<{ collection: string; fields: string; status: string }>,
        domains: [] as string[]
      };

      // 1. Fetch current active Security Rules
      try {
        const rules = google.firebaserules({ version: 'v1', auth: authClient as any });
        const releaseName = databaseId && databaseId !== '(default)' 
          ? `projects/${projectId}/releases/cloud.firestore/${databaseId}` 
          : `projects/${projectId}/releases/cloud.firestore`;
        const release = await rules.projects.releases.get({
          name: releaseName
        });
        status.rules.status = release.data.rulesetName ? 'DEPLOYED' : 'MISSING';
        status.rules.ruleset = release.data.rulesetName || null;
      } catch (err) {
        status.rules.status = 'ERROR (No access)';
      }

      // 2. Fetch composite indexes state
      try {
        const firestoreAdmin = google.firestore({ version: 'v1' });
        const uniqueColGroups = Array.from(new Set(REQUIRED_INDEXES.map(idx => idx.collectionGroup)));
        const groupIndexesMap: Record<string, any[]> = {};

        for (const colGroup of uniqueColGroups) {
          try {
            const indexesRes = await firestoreAdmin.projects.databases.collectionGroups.indexes.list({
              parent: `projects/${projectId}/databases/${databaseId}/collectionGroups/${colGroup}`
            });
            groupIndexesMap[colGroup] = indexesRes.data.indexes || [];
          } catch (err) {
            groupIndexesMap[colGroup] = [];
          }
        }

        for (const idx of REQUIRED_INDEXES) {
          const existing = groupIndexesMap[idx.collectionGroup] || [];
          const isMatched = existing.some(item => {
            if (!item.fields || item.fields.length !== idx.fields.length) return false;
            return idx.fields.every((f, i) => {
              const ef = item.fields[i];
              return ef.fieldPath === f.fieldPath && (ef.order === f.order || ef.arrayConfig === (f as any).arrayConfig);
            });
          });

          status.indexes.push({
            collection: idx.collectionGroup,
            fields: idx.fields.map(f => `${f.fieldPath} (${f.order || 'ARRAY'})`).join(' + '),
            status: isMatched ? 'CONFIGURED' : 'MISSING'
          });
        }
      } catch (err) {
        // Fallback if index list fails entirely
        for (const idx of REQUIRED_INDEXES) {
          status.indexes.push({
            collection: idx.collectionGroup,
            fields: idx.fields.map(f => `${f.fieldPath} (${f.order || 'ARRAY'})`).join(' + '),
            status: 'ERROR (No access)'
          });
        }
      }

      // 3. Fetch Auth configurations
      try {
        const identity = google.identitytoolkit({ version: 'v2', auth: authClient as any });
        const config = await identity.projects.getConfig({
          name: `projects/${projectId}/config`
        });
        status.domains = config.data.authorizedDomains || [];
      } catch (err) {
        status.domains = [];
      }

      // 4. Verify sharded database document counts and schema health status
      const schema = { status: 'UNKNOWN', documentCount: 0 };
      try {
        const targetDb = await selectOwnerDataAdminDb(ownerId);
        const guestsSnap = await targetDb.collection('users_data').doc(ownerId).collection('guests').limit(20).get();
        if (!guestsSnap.empty) {
          schema.documentCount = guestsSnap.size;
          const versions = guestsSnap.docs.map(d => d.data().schemaVersion || 1);
          const allLatest = versions.every(v => v >= 2);
          schema.status = allLatest ? 'LATEST (v2)' : 'OUTDATED (v1)';
        } else {
          schema.status = 'NO DATA';
        }
      } catch (err) {
        schema.status = 'ERROR (No access)';
      }

      return NextResponse.json({ success: true, status: { ...status, schema } });
    }

    return badRequest('Invalid action.');
  } catch (error: any) {
    return serverError(error, 'POST /api/enterprise/auto-setup');
  }
}
