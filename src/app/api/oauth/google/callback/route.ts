
import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { doc, updateDoc } from 'firebase/firestore';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state'); // The user ID we passed
  
  if (!code || !state) {
    return NextResponse.redirect(new URL('/dashboard/enterprise?error=auth_failed', req.url));
  }
  
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/google/callback`
  );

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    
    // For this flow, we assume the user has granted access to their intended project.
    // A more advanced implementation might involve using the discovery API to get the project ID.
    // Here, we'll simulate that by retrieving a project ID from the authenticated session, but
    // for this example, we will assume a project ID is obtained and stored.
    // Let's assume the user's project ID is what we need to store, and for the sake of this demo,
    // we'll get it from our main app's config as a placeholder.
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (!projectId) {
        throw new Error("Could not determine the target project ID.");
    }
    const databaseId = '(default)'; // Default database ID in a Firebase project

    const adminDb = await getAdminDb(); // Connect to our main admin DB to update the user
    const userDocRef = doc(adminDb, 'users', state);
    
    // Storing the project details and upgrading the plan
    await updateDoc(userDocRef, {
      'subscription.enterpriseProject': {
        projectId: projectId,
        databaseId: databaseId,
      },
       'subscription.planId': 'enterprise', // Upgrade them to enterprise
       'subscription.status': 'active', // Ensure their subscription is active
    });

    return NextResponse.redirect(new URL('/dashboard?onboarding=success', req.url));

  } catch (error: any) {
    console.error('OAuth callback error:', error.message);
    return NextResponse.redirect(new URL('/dashboard/enterprise?error=connection_failed', req.url));
  }
}
