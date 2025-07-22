
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { GoogleAuthProvider, signInWithPopup, sendSignInLinkToEmail } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { Loader2 } from 'lucide-react'
import { useAppSelector } from '@/lib/hooks'
import { Skeleton } from '@/components/ui/skeleton'
import type { UserRole } from '@/lib/types'

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
  const { toast } = useToast()
  const { isLoading: appLoading, currentUser } = useAppSelector((state) => ({
    isLoading: state.app.isLoading,
    currentUser: state.user.currentUser,
  }));

  const [isSigningIn, setIsSigningIn] = useState(false)
  const [email, setEmail] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [isSendingLink, setIsSendingLink] = useState(false)
  
  const loading = appLoading || isSigningIn || isSendingLink;

  const allowedDashboardRoles: UserRole[] = ['owner', 'manager', 'cook', 'cleaner', 'security'];

  useEffect(() => {
    if (!appLoading && currentUser) {
      if (currentUser.role === 'tenant') {
        router.replace('/tenants/my-pg');
      } else if (allowedDashboardRoles.includes(currentUser.role)) {
        router.replace('/dashboard');
      }
    }
  }, [appLoading, currentUser, router, allowedDashboardRoles]);

  if (appLoading || currentUser) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-56px)] bg-background p-4">
        <Card className="w-full max-w-sm">
            <CardHeader className="text-center">
                <Skeleton className="h-7 w-32 mx-auto" />
                <Skeleton className="h-5 w-48 mx-auto mt-2" />
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                 <Skeleton className="h-5 w-16" />
                 <Skeleton className="h-10 w-full" />
              </div>
              <Skeleton className="h-10 w-full" />
              <div className="relative">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">OR</span></div>
              </div>
              <Skeleton className="h-10 w-full" />
            </CardContent>
        </Card>
      </div>
    );
  }


  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    setIsSendingLink(true);
    const actionCodeSettings = {
      url: `${window.location.origin}/login/verify`,
      handleCodeInApp: true,
    };
    try {
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', email);
      setEmailSent(true);
    } catch (error: any) {
      console.error("Email Sign-In Error:", error);
      toast({
        variant: "destructive",
        title: "Email Sign-In Failed",
        description: "Could not send sign-in link. Please check the email and try again.",
      });
    } finally {
      setIsSendingLink(false);
    }
  };


  const handleGoogleSignIn = async () => {
    if (!auth) return;
    setIsSigningIn(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      // The user state change is handled by the onAuthStateChanged listener in StoreProvider
      // which will then trigger the redirection useEffect.
      toast({
        title: 'Welcome!',
        description: "You've been signed in successfully.",
      });
    } catch (error: any) {
      console.error("Google Sign-In Error:", error);
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
                <CardTitle className="text-2xl pt-4">Welcome</CardTitle>
                <CardDescription>
                   Sign in or create an account to continue.
                </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
                 {emailSent ? (
                    <div className="text-center p-4 bg-muted rounded-md">
                        <h3 className="font-semibold">Check your email</h3>
                        <p className="text-sm text-muted-foreground">A sign-in link has been sent to <strong>{email}</strong>. Click the link to log in.</p>
                    </div>
                ) : (
                    <form onSubmit={handleEmailSignIn} className="grid gap-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" placeholder="name@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} />
                        <Button type="submit" className="w-full" disabled={loading || !email}>
                            {isSendingLink ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Continue with Email
                        </Button>
                    </form>
                )}
                
                <div className="relative">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">OR</span></div>
                </div>

                <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={loading}>
                    {isSigningIn ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon className="mr-2 h-4 w-4" />}
                    Sign in with Google
                </Button>
            </CardContent>
        </Card>
    </div>
  )
}
