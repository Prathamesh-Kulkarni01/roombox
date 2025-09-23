
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

    // Use the authorized client to get the project ID
    const cloudresourcemanager = google.cloudresourcemanager('v1');
    const projectResponse = await cloudresourcemanager.projects.list({ auth: oauth2Client });
    
    // In a real scenario, you'd let the user select from a list if they have multiple projects
    // For now, we'll assume the first one they have access to is the one they intended.
    if (!projectResponse.data.projects || projectResponse.data.projects.length === 0) {
        throw new Error("No Google Cloud projects found for this user.");
    }
    
    const projectId = projectResponse.data.projects[0].projectId;
    // We assume the database ID is the same as the project ID or '(default)'
    // In a more complex setup, you might need to query for this as well.
    const databaseId = '(default)'; 

    const adminDb = await getAdminDb();
    const userDocRef = doc(adminDb, 'users', state);
    
    await updateDoc(userDocRef, {
      'subscription.enterpriseProject': {
        projectId: projectId,
        databaseId: databaseId,
        // We would securely store the refresh_token here, likely encrypted.
        // For this example, we are not storing the token to keep it simple.
      },
       'subscription.planId': 'enterprise', // Upgrade them to enterprise
    });

    return NextResponse.redirect(new URL('/dashboard', req.url));

  } catch (error: any) {
    console.error('OAuth callback error:', error.message);
    return NextResponse.redirect(new URL('/dashboard/enterprise?error=connection_failed', req.url));
  }
}
