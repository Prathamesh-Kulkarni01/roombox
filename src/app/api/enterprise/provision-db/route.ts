 
'use server'

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveTenant } from '@/lib/tenantResolver';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { google } from 'googleapis';

const requestSchema = z.object({
	email: z.string().email(),
	projectId: z.string().optional(),
	databaseId: z.union([
		z.literal('(default)'),
		z.string().regex(/^[a-zA-Z0-9-]{4,63}$/).transform(v => v.toLowerCase())
	]).optional(),
	locationId: z.string().optional(), // e.g., "nam5"
	clientConfig: z.object({
		apiKey: z.string(),
		authDomain: z.string(),
		projectId: z.string(),
		storageBucket: z.string().optional(),
		messagingSenderId: z.string().optional(),
		appId: z.string().optional(),
		measurementId: z.string().optional(),
	}).optional(),
});

async function createSecondaryDatabaseIfPossible(
	projectId: string,
	databaseId: string,
	locationId: string = 'us-central1',
): Promise<{ created: boolean; error?: string }> {
	try {
		// Requires the service to run with a service account that has the Datastore scope
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

		const auth = new google.auth.GoogleAuth({
			credentials,
			scopes: ['https://www.googleapis.com/auth/datastore'],
		});
		const client = await auth.getClient();
		const firestoreAdmin = google.firestore({ version: 'v1', auth: client as any });

		// Attempt to create the database
		await (firestoreAdmin.projects.databases.create as any)({
			parent: `projects/${projectId}`,
			databaseId,
			requestBody: {
				locationId,
				type: 'FIRESTORE_NATIVE',
			},
		});
		return { created: true };
	} catch (err: any) {
		// If already exists, we consider it fine to proceed
		if (err?.code === 409 || err?.errors?.[0]?.reason === 'alreadyExists') {
			return { created: false };
		}
		return { created: false, error: err?.message || 'Failed to create database' };
	}
}

export async function POST(req: NextRequest) {
	try {
		const body = await req.json();
		console.log('[provision-db] incoming payload keys:', Object.keys(body || {}));
		const parsed = requestSchema.safeParse(body);
		if (!parsed.success) {
			console.error('[provision-db] zod issues:', parsed.error.issues);
			return NextResponse.json({ success: false, error: 'Invalid payload', issues: parsed.error.issues }, { status: 400 });
		}

		const { email, projectId: inputProjectId, databaseId: inputDbId, locationId, clientConfig } = parsed.data;
		const { db: adminDb } = await resolveTenant(req);
		const userss = await adminDb.collection('users').get();

		if (userss.empty) {
		  console.log('No users found.');
		} else {
			console.log('Users.');
		}
		// Find owner by email in main users collection
		const usersSnap = await adminDb.collection('users').where('email', '==', email).get();
		if (usersSnap.empty) {
			return NextResponse.json({ success: false, error: 'Owner not found' }, { status: 404 });
		}
		const userDoc = usersSnap.docs[0];
		const user = userDoc.data();
		if (user.role !== 'owner') {
			return NextResponse.json({ success: false, error: 'User is not an owner' }, { status: 400 });
		}

		// Determine project and database IDs
		const projectId = inputProjectId || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
		if (!projectId) {
			return NextResponse.json({ success: false, error: 'Project ID is required' }, { status: 400 });
		}
		const dbId = inputDbId || `owner-${userDoc.id}`.toLowerCase();

		// Best-effort: Try to create the secondary database (same project multi-database)
		const provisionResult = await createSecondaryDatabaseIfPossible(projectId, dbId, locationId);

		// Preserve existing oauthTokens if any to prevent wiping out Google Auth credentials
		const currentDoc = await adminDb.collection('users').doc(userDoc.id).get();
		const existingOauthTokens = currentDoc.data()?.subscription?.enterpriseProject?.oauthTokens;

		// Attach to owner subscription
		await adminDb.collection('users').doc(userDoc.id).update({
			'subscription.enterpriseProject': { 
				projectId, 
				databaseId: dbId, 
				clientConfig: clientConfig || null,
				...(existingOauthTokens ? { oauthTokens: existingOauthTokens } : {})
			},
			'subscription.planId': 'enterprise',
			'subscription.status': 'active',
		});

		return NextResponse.json({
			success: true,
			projectId,
			databaseId: dbId,
			provisioned: provisionResult.created,
			warning: provisionResult.error,
		});
	} catch (error: any) {
		console.error('[provision-db] unexpected error:', error);
		return NextResponse.json({ success: false, error: error.message || 'Internal error' }, { status: 500 });
	}
} 