'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useData } from '@/context/data-provider'
import { useToast } from '@/hooks/use-toast'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { Loader2 } from 'lucide-react'

const GoogleIcon = (props: React.ComponentProps<'svg'>) => (
  <svg role="img" viewBox="0 0 24 24" {...props}>
    <path
      fill="currentColor"
      d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.02 1.02-2.6 1.98-4.66 1.98-3.56 0-6.47-2.91-6.47-6.47s2.91-6.47 6.47-6.47c1.94 0 3.32.73 4.31 1.76l2.35-2.35C19.05 3.32 16.2 2 12.48 2 7.18 2 3.13 5.96 3.13 11.25s4.05 9.25 9.35 9.25c3.21 0 5.7-1.09 7.6-3.05 2.03-2.03 2.54-5.02 2.54-7.61 0-.61-.05-1.19-.16-1.74z"
    />
  </svg>
);

export default function LoginPage() {
  const router = useRouter()
  const { handleSocialLogin, isLoading: isDataLoading } = useData()
  const { toast } = useToast()

  const [isSigningIn, setIsSigningIn] = useState(false)
  
  const loading = isDataLoading || isSigningIn

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const { role } = await handleSocialLogin(result.user);
      
      toast({
        title: 'Welcome!',
        description: "You've been signed in successfully.",
      });

      if (role === 'tenant') {
        router.push('/tenants/my-pg');
      } else {
        router.push('/dashboard');
      }

    } catch (error: any) {
      console.error("Google Sign-In Error:", error);
      // Don't show an error if the user just closes the popup
      if (error.code !== 'auth/popup-closed-by-user') {
        toast({
          variant: "destructive",
          title: "Google Sign-In Failed",
          description: "Could not sign in with Google. Please try again.",
        });
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-56px)] bg-background p-4">
        <Card className="w-full max-w-sm">
            <CardHeader className="text-center">
                <CardTitle className="text-2xl pt-4">Welcome Back</CardTitle>
                <CardDescription>
                   Sign in with your Google account to continue.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon className="mr-2 h-4 w-4" />}
                    Sign in with Google
                </Button>
            </CardContent>
        </Card>
    </div>
  )
}
