
'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth'
import { auth, isFirebaseConfigured } from '@/lib/firebase'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Loader2, AlertCircle } from 'lucide-react'

function VerifyLogin() {
    const router = useRouter()
    const { toast } = useToast()
    const [error, setError] = useState<string | null>(null)
    const [message, setMessage] = useState("Verifying your login link...")

    useEffect(() => {
        const verifyLink = async () => {
            if (!isFirebaseConfigured() || !auth) {
                 setError("Firebase is not configured on this client. Cannot verify email link.")
                 return;
            }

            if (isSignInWithEmailLink(auth, window.location.href)) {
                let email = window.localStorage.getItem('emailForSignIn');
                if (!email) {
                    email = window.prompt('For security, please re-enter your email address to complete sign-in.');
                }
                
                if (!email) {
                    setError("Email address is required to complete sign-in. Please return to the login page and try again.");
                    return;
                }

                try {
                    setMessage("Signing you in securely...");
                    await signInWithEmailLink(auth, email, window.location.href);
                    window.localStorage.removeItem('emailForSignIn');
                    
                    // The user is now signed in. The AuthHandler in StoreProvider will
                    // detect this, run initializeUser, and handle redirection.
                    toast({
                      title: 'Success!',
                      description: 'You have been signed in. Redirecting...',
                    });
                    // A general push to root is better, AuthHandler will sort out the correct destination.
                    router.push('/');
                } catch (err: any) {
                    console.error(err);
                    setError("Failed to sign in. The link may be invalid or expired. Please try again.");
                }
            } else {
                setError("This does not appear to be a valid sign-in link.");
            }
        }
        
        verifyLink();

    }, [router, toast]);
    
    // The redirect is handled by the root layout's AuthHandler observing the auth state.
    // This component just shows the status of the link verification.

    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-56px)] text-center p-4">
            {error ? (
                <>
                    <AlertCircle className="w-16 h-16 text-destructive mb-4" />
                    <h1 className="text-2xl font-bold mb-2">Authentication Failed</h1>
                    <p className="text-muted-foreground mb-6 max-w-sm">{error}</p>
                    <Button onClick={() => router.push('/login')}>Go to Login</Button>
                </>
            ) : (
                <>
                    <Loader2 className="w-16 h-16 text-primary animate-spin mb-4" />
                    <h1 className="text-2xl font-bold mb-2">{message}</h1>
                    <p className="text-muted-foreground">Please wait while we securely sign you in.</p>
                </>
            )}
        </div>
    )
}

export default function VerifyLoginPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <VerifyLogin />
        </Suspense>
    )
}
