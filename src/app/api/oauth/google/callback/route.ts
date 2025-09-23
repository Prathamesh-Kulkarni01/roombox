
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

    // We don't need to list projects. The user grants permission to the project
    // associated with the account they logged in with. The service account
    // we use will have its permissions scoped to that project. We just need to store the project ID.
    // In a real-world scenario, you might want to verify the project exists or list it,
    // but for this architecture, we trust the user has selected the correct account.
    
    // For this to work, the owner's Google Cloud Project ID needs to be known.
    // We will assume for this flow that we get it from the environment,
    // or it's the same as the one our main service account is tied to.
    // A more advanced flow would let the user input this.
    // Let's assume the user's project ID is what we need to store. We will derive this from the auth context.
    // For this example, let's assume we can get the project ID from the authenticated session.
    // Since this is a serverless function, getting the specific user's GCP project is complex.
    // A more realistic flow is that the user enters their Project ID on our UI,
    // and the OAuth flow just grants our service account access to it.
    // Let's simulate that by taking the Project ID from our main config for now.
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (!projectId) {
        throw new Error("Could not determine the target project ID.");
    }
    const databaseId = '(default)'; 

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
