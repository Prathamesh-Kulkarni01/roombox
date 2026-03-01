'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword } from "firebase/auth"
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

export default function SignupPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { isLoading: appLoading, currentUser } = useAppSelector((state) => ({
    isLoading: state.app.isLoading,
    currentUser: state.user.currentUser,
  }));

  const [isSigningIn, setIsSigningIn] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const loading = appLoading || isSigningIn;

  const allowedDashboardRoles: UserRole[] = ['owner', 'manager', 'cook', 'cleaner', 'security', 'admin'];

  useEffect(() => {
    if (!appLoading && currentUser) {
      if (currentUser.role === 'tenant') {
        router.replace('/tenants/my-pg');
      } else if (allowedDashboardRoles.includes(currentUser.role)) {
        router.replace('/dashboard');
      } else if (currentUser.role === 'unassigned') {
        router.replace('/complete-profile');
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
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;

    if (!password || password.length < 6) {
      toast({
        variant: "destructive",
        title: "Password Missing or Weak",
        description: "Please enter a password with at least 6 characters.",
      });
      return;
    }

    setIsSigningIn(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      toast({ title: 'Welcome!', description: "Account created successfully." });
    } catch (error: any) {
      console.error("Password Auth Error:", error);
      toast({
        variant: "destructive",
        title: "Sign Up Failed",
        description: error.message || "Invalid email or password.",
      });
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!auth) return;
    setIsSigningIn(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      toast({ title: 'Welcome!', description: "Account created successfully." });
    } catch (error: any) {
      console.error("Google Sign-In Error:", error);
      if (error.code !== 'auth/popup-closed-by-user') {
        toast({
          variant: "destructive",
          title: "Google Sign-Up Failed",
          description: error.message || "An error occurred.",
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
          <CardTitle className="text-2xl pt-4">Create an Account</CardTitle>
          <CardDescription>
            Join RentSutra to manage your properties easily.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <form onSubmit={handleEmailSignUp} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="name@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="Min 6 characters" required value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} minLength={6} />
            </div>

            <Button type="submit" className="w-full" disabled={loading || !email || !password}>
              {isSigningIn ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Sign Up
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">OR</span></div>
          </div>

          <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={loading}>
            {isSigningIn ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon className="mr-2 h-4 w-4" />}
            Sign Up with Google
          </Button>

          <div className="mt-4 text-center text-sm">
            Already have an account?{" "}
            <Link href="/login" className="underline underline-offset-4 hover:text-primary">
              Log in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
