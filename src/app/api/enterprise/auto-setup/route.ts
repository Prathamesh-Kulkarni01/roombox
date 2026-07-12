import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getVerifiedOwnerId } from '@/lib/auth-server';
import { badRequest, serverError, unauthorized } from '@/lib/api/apiError';
import { getAdminDb, selectOwnerDataAdminDb } from '@/lib/firebaseAdmin';
import { decryptTokens } from '@/lib/encryption';

const fs = require('fs');
const path = require('path');

// We try to read the main firestore.rules file at runtime if possible,
// but provide a robust fallback to ensure the custom DB is secure.
const FALLBACK_FIRESTORE_RULES = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuth() {
      return request.auth != null;
    }
    function isStaff(pgId) {
      return isAuth() && pgId in request.auth.token.get('pgs', []);
    }
    function isStaffRole() {
      return isAuth() && request.auth.token.role in ['manager', 'cleaner', 'cook', 'security', 'staff', 'other'];
    }
    function hasPermission(feature, action) {
      let perm = feature + ":" + action;
      return isAuth() && request.auth.token.permissions != null && perm in request.auth.token.permissions;
    }

    match /users/{userId} {
      allow read: if isAuth() && request.auth.uid == userId;
      allow create: if isAuth() && request.auth.uid == userId;
      allow update: if isAuth() && request.auth.uid == userId && (
        (resource.data.role == 'unassigned' && request.resource.data.role == 'owner') ||
        (!request.resource.data.diff(resource.data).affectedKeys()
          .hasAny(['role', 'permissions', 'ownerId', 'guestId', 'staffId', 'subscription', 'wallet', 'billingConfig', 'activeTenancies', 'activeStaffProfiles', 'lastActiveContext']))
      );
    }
    
    match /users_data/{ownerId}/{collectionName}/{docId} {
      allow read, write: if isAuth() && request.auth.uid == ownerId;
      
      allow read, write: if isAuth() && request.auth.token.ownerId == ownerId && isStaffRole() && (
        (collectionName == 'notifications' && (
          resource.data.targetId == request.auth.uid || 
          request.auth.token.get('pgs', []).hasAny([resource.data.targetId])
        )) ||
        collectionName == 'chargeTemplates' || 
        (collectionName == 'pgs' && isStaff(docId)) ||
        (resource.data.pgId != null && isStaff(resource.data.pgId)) ||
        (request.resource.data.pgId != null && isStaff(request.resource.data.pgId)) ||
        (collectionName == 'staff' && (
          (resource.data.pgIds != null && resource.data.pgIds.hasAny(request.auth.token.get('pgs', []))) ||
          (request.resource.data.pgIds != null && request.resource.data.pgIds.hasAny(request.auth.token.get('pgs', [])))
        ))
      );
      
      allow list: if isAuth() && request.auth.token.ownerId == ownerId && isStaffRole() && (
        (collectionName == 'notifications' && request.query.filters.targetId != null && 
          request.auth.token.get('pgs', []).concat([request.auth.uid]).hasAll(request.query.filters.targetId)) ||
        collectionName == 'chargeTemplates' ||
        (collectionName == 'pgs' && request.query.filters.__name__ != null && request.auth.token.get('pgs', []).hasAll(request.query.filters.__name__)) ||
        (request.query.filters.pgId != null && request.auth.token.get('pgs', []).hasAll(request.query.filters.pgId)) ||
        (collectionName == 'staff' && request.query.filters.pgIds != null && request.auth.token.get('pgs', []).hasAll(request.query.filters.pgIds))
      );
      
      allow get: if isAuth() && request.auth.token.role == 'tenant' && request.auth.token.ownerId == ownerId && (
        collectionName == 'guests' || 
        collectionName == 'pgs' || 
        collectionName == 'complaints' || 
        collectionName == 'expenses' || 
        collectionName == 'financial_events' || 
        collectionName == 'notifications'
      );
      
      allow list: if isAuth() && request.auth.token.role == 'tenant' && request.auth.token.ownerId == ownerId && (
        collectionName == 'complaints' || 
        collectionName == 'expenses' || 
        collectionName == 'financial_events' || 
        collectionName == 'notifications'
      );
    }
    
    match /activity_logs/{logId} {
      allow read, write: if isAuth() && (
        resource == null || 
        resource.data.ownerId == request.auth.uid || 
        request.resource.data.ownerId == request.auth.uid ||
        request.auth.token.ownerId != null
      );
    }

    match /magic_links/{tokenId} {
      allow read, write: if true;
    }
    
    match /{document=**} {
      allow read, write: if false;
    }
  }
}`;

let FIRESTORE_RULES = FALLBACK_FIRESTORE_RULES;
try {
  const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
  if (fs.existsSync(rulesPath)) {
    const mainRules = fs.readFileSync(rulesPath, 'utf8');
    // Inject magic_links rule before the final catch-all
    if (mainRules.includes('match /{document=**} {') && !mainRules.includes('match /magic_links/{tokenId}')) {
      FIRESTORE_RULES = mainRules.replace(
        'match /{document=**} {', 
        'match /magic_links/{tokenId} { allow read, write: if true; }\n\n    match /{document=**} {'
      );
    } else {
      FIRESTORE_RULES = mainRules;
    }
  }
} catch (e) {
  console.warn('Could not read main firestore.rules, using fallback.');
}

const REQUIRED_INDEXES = [
  { collectionGroup: "community_posts", fields: [{ fieldPath: "pgId", order: "ASCENDING" }, { fieldPath: "date", order: "DESCENDING" }] },
  { collectionGroup: "community_posts", fields: [{ fieldPath: "pgId", order: "ASCENDING" }, { fieldPath: "type", order: "ASCENDING" }, { fieldPath: "date", order: "DESCENDING" }] },
  { collectionGroup: "meter_readings", fields: [{ fieldPath: "pgId", order: "ASCENDING" }, { fieldPath: "readingDate", order: "DESCENDING" }] },
  { collectionGroup: "staff_advances", fields: [{ fieldPath: "staffId", order: "ASCENDING" }, { fieldPath: "date", order: "DESCENDING" }] },
  { collectionGroup: "staff_payrolls", fields: [{ fieldPath: "staffId", order: "ASCENDING" }, { fieldPath: "month", order: "DESCENDING" }] },
  { collectionGroup: "refund_records", fields: [{ fieldPath: "pgId", order: "ASCENDING" }, { fieldPath: "refundDate", order: "DESCENDING" }] }
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

    if (oauthTokens) {
      console.log('[auto-setup] Instantiating OAuth2 client for owner:', ownerId);
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
      );
      // SECURITY: Decrypt tokens before using them (they are encrypted at rest)
      oauth2Client.setCredentials(decryptTokens(oauthTokens));
      authClient = oauth2Client;
    } else {
      // Initialize Google Auth using RentSutra service account credentials
      // Note: The owner must add our service account email as Datastore/Firebase Owner in their GCP IAM console.
      const projectIdEnv = process.env.FIREBASE_PROJECT_ID;
      const clientEmailEnv = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKeyEnv = process.env.FIREBASE_PRIVATE_KEY;
      const legacyConfigEnv = process.env.FIREBASE_ADMIN_SDK_CONFIG;

      let credentials: any = undefined;
      if (clientEmailEnv && privateKeyEnv) {
        credentials = {
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
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: [
          'https://www.googleapis.com/auth/cloud-platform',
          'https://www.googleapis.com/auth/datastore',
          'https://www.googleapis.com/auth/firebase'
        ],
      });
      authClient = await auth.getClient();
    }

    if (action === 'setup') {
      const results = {
        rules: { success: false, error: null as string | null },
        indexes: [] as Array<{ collection: string; success: boolean; error: string | null }>,
        domains: { success: false, error: null as string | null }
      };

      // 1. Deploy Firestore Security Rules
      try {
        const rules = google.firebaserules({ version: 'v1', auth: authClient as any });
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
          results.rules.success = true;
        }
      } catch (err: any) {
        results.rules.error = err.message || String(err);
      }

      // 2. Create Composite Indexes
      const firestoreAdmin = google.firestore({ version: 'v1', auth: authClient as any });
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
        const identity = google.identitytoolkit({ version: 'v2', auth: authClient as any });
        
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
        results.domains.error = err.message || String(err);
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
        const firestoreAdmin = google.firestore({ version: 'v1', auth: authClient as any });
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
