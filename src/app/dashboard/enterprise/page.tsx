
'use client'

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Database, Link } from 'lucide-react';
import { useAppSelector } from '@/lib/hooks';

export default function EnterpriseOnboardingPage() {
    const { currentUser } = useAppSelector(state => state.user);

    const handleConnectProject = () => {
        // This would redirect to Google's OAuth consent screen
        const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
        const redirectUri = `${window.location.origin}/api/oauth/google/callback`;
        const scope = 'https://www.googleapis.com/auth/cloud-platform';
        const state = currentUser?.id; // Pass user ID for verification
        const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${state}&access_type=offline&prompt=consent`;
        
        window.location.href = oauthUrl;
    };

    return (
        <div className="container mx-auto py-10">
            <Card className="max-w-2xl mx-auto">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Database className="w-6 h-6 text-primary" />
                        Enterprise Setup: Connect Your Firebase Project
                    </CardTitle>
                    <CardDescription>
                        To ensure complete data privacy, you can run RentSutra on your own dedicated Firebase infrastructure.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <h3 className="font-semibold">How it Works:</h3>
                        <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                            <li>You create a new, empty Firebase project in your own Google Cloud account.</li>
                            <li>Click the "Connect Project" button below.</li>
                            <li>You will be redirected to a secure Google page to grant RentSutra limited, programmatic access to manage your database.</li>
                            <li>We will never see your private keys or have direct access to your data.</li>
                        </ol>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        This process ensures that your data remains under your control, in your own cloud environment, providing the highest level of security and privacy.
                    </p>
                    <Button className="w-full" onClick={handleConnectProject}>
                        <Link className="mr-2 h-4 w-4" />
                        Connect Your Firebase Project
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
