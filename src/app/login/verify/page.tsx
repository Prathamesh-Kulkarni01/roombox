
'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth'
import { auth, isFirebaseConfigured } from '@/lib/firebase'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Loader2, AlertCircle } from 'lucide-react'

function VerifyLogin() {
    const router = useRouter()
    const { toast } = useToast()
    const searchParams = useSearchParams();
    const [error, setError] = useState<string | null>(null)
    const [message, setMessage] = useState("Verifying your login link...")

    useEffect(() => {
        const verifyLink = async () => {
            if (!isFirebaseConfigured() || !auth) {
                 setError("Firebase is not configured on this client. Cannot verify email link.")
                 return;
            }

            const href = window.location.href;
            if (isSignInWithEmailLink(auth, href)) {
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
                    await signInWithEmailLink(auth, email, href);
                    window.localStorage.removeItem('emailForSignIn');
                    
                    toast({
                      title: 'Success!',
                      description: 'You have been signed in. Redirecting...',
                    });
                    
                    // The onAuthStateChanged listener will handle the final redirection after user initialization
                    // No need to explicitly push here.

                } catch (err: any) {
                    console.error(err);
                    setError("Failed to sign in. The link may be invalid or expired. Please try again.");
                }
            } else {
                setError("This does not appear to be a valid sign-in link.");
            }
        }
        
        verifyLink();

    }, [router, toast, searchParams]);
    
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
