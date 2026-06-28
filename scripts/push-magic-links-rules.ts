/**
 * One-time script: push updated Firestore rules (adds magic_links collection)
 * to every owner that has a custom enterprise Firebase project configured.
 *
 * Usage (run from project root):
 *   npx env-cmd -f .env.production npx ts-node --project scripts/tsconfig.json \
 *     -r tsconfig-paths/register scripts/push-magic-links-rules.ts
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { google } from 'googleapis';
import crypto from 'crypto';

// ─── Encryption helpers (mirrors src/lib/encryption.ts) ───────────────────

const ENCRYPTION_KEY_RAW =
  process.env.TOKEN_ENCRYPTION_KEY ||
  process.env.FIREBASE_PRIVATE_KEY ||
  'rentsutra-default-encryption-fallback-key-32chars!';

function getEncryptionKey(): Buffer {
  return crypto.createHash('sha256').update(ENCRYPTION_KEY_RAW).digest();
}

function decrypt(encryptedData: string): string {
  if (!encryptedData) return encryptedData;
  try {
    const parts = encryptedData.split(':');
    if (parts.length !== 3) return encryptedData;
    const [ivHex, authTagHex, encryptedText] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return encryptedData;
  }
}

function decryptTokens(tokens: any): any {
  if (!tokens) return tokens;
  const result = { ...tokens };
  if (typeof result.access_token === 'string') result.access_token = decrypt(result.access_token);
  if (typeof result.refresh_token === 'string') result.refresh_token = decrypt(result.refresh_token);
  return result;
}

// ─── Updated Firestore rules (adds magic_links) ────────────────────────────

const UPDATED_RULES = `rules_version = '2';
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

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  // Initialise central admin SDK
  const fbProjectId = process.env.FIREBASE_PROJECT_ID!;
  const fbClientEmail = process.env.FIREBASE_CLIENT_EMAIL!;
  const fbPrivateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n').replace(/"/g, '');

  const app = initializeApp({
    credential: cert({ projectId: fbProjectId, clientEmail: fbClientEmail, privateKey: fbPrivateKey }),
    projectId: fbProjectId,
  });

  const db = getFirestore(app);

  // Find all users with a custom enterprise project
  const usersSnap = await db
    .collection('users')
    .where('subscription.enterpriseProject', '!=', null)
    .get();

  console.log(`Found ${usersSnap.size} owner(s) with custom enterprise projects.`);

  for (const doc of usersSnap.docs) {
    const data = doc.data();
    const ownerId = doc.id;
    const ep = data?.subscription?.enterpriseProject;
    const projectId = ep?.projectId as string | undefined;
    const databaseId = (ep?.databaseId as string | undefined) || '(default)';
    const oauthTokens = ep?.oauthTokens;

    if (!projectId || !oauthTokens) {
      console.warn(`[${ownerId}] Skipping — missing projectId or oauthTokens.`);
      continue;
    }

    console.log(`\n[${ownerId}] Deploying rules to project: ${projectId} (db: ${databaseId})...`);

    try {
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
      );
      oauth2Client.setCredentials(decryptTokens(oauthTokens));

      const rulesApi = google.firebaserules({ version: 'v1', auth: oauth2Client as any });

      // 1. Create new ruleset
      const createRes = await rulesApi.projects.rulesets.create({
        name: `projects/${projectId}`,
        requestBody: {
          source: {
            files: [{ name: 'firestore.rules', content: UPDATED_RULES }],
          },
        },
      });

      const rulesetName = createRes.data.name;
      if (!rulesetName) throw new Error('Ruleset creation returned no name.');

      // 2. Patch release to point to new ruleset
      const releaseName =
        databaseId && databaseId !== '(default)'
          ? `projects/${projectId}/releases/cloud.firestore/${databaseId}`
          : `projects/${projectId}/releases/cloud.firestore`;

      await (rulesApi.projects.releases as any).patch({
        name: releaseName,
        updateMask: 'rulesetName',
        requestBody: {
          release: { name: releaseName, rulesetName },
        },
      });

      console.log(`[${ownerId}] ✅ Rules deployed successfully (ruleset: ${rulesetName})`);
    } catch (err: any) {
      console.error(`[${ownerId}] ❌ Failed: ${err.message}`);
    }
  }

  console.log('\nDone.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
