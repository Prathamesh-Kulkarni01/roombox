/**
 * LOGIN PAGE
 * Changes:
 * - Fixed redirect loops by properly checking for auth state.
 * - Added error handling for Firebase login.
 * - Integrated with Playwright for automated auth setup.
 */
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { GoogleAuthProvider, signInWithPopup, sendSignInLinkToEmail, signInWithEmailAndPassword, signInWithCustomToken } from "firebase/auth"
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

const allowedDashboardRoles: UserRole[] = ['owner', 'manager', 'cook', 'cleaner', 'security', 'admin', 'other'];

export default function LoginPage() {
  const router = useRouter()
  const { toast } = useToast()
  const appLoading = useAppSelector((state) => state.app.isLoading);
  const currentUser = useAppSelector((state) => state.user.currentUser);

  const [isSigningIn, setIsSigningIn] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [tenantPassword, setTenantPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [waitingForOtp, setWaitingForOtp] = useState(false)
  const [tenantLoginMode, setTenantLoginMode] = useState<'otp' | 'password'>('password')

  const [activeTab, setActiveTab] = useState('tenant')

  const loading = appLoading || isSigningIn;

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
  }, [appLoading, currentUser, router]);

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

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;

    if (!password) {
      toast({
        variant: "destructive",
        title: "Password Missing",
        description: "Please enter your password. If you don't have one, please sign up.",
      });
      return;
    }

    setIsSigningIn(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({ title: 'Welcome Back!', description: "You've been signed in successfully." });
    } catch (error: any) {
      console.error("Password Auth Error:", error);
      toast({
        variant: "destructive",
        title: "Log In Failed",
        description: error.message || "Invalid email or password.",
      });
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleTenantPasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;

    if (!tenantPassword) {
      toast({
        variant: "destructive",
        title: "Password Missing",
        description: "Please enter your password.",
      });
      return;
    }

    setIsSigningIn(true);
    try {
      // Logic for staff/tenant: could be email or phone
      let loginId = phone;
      if (phone && !phone.includes('@')) {
        // Map phone to internal email: 1234567890@roombox.app
        const cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.length >= 10) {
            loginId = `${cleanPhone.slice(-10)}@roombox.app`;
        }
      }

      await signInWithEmailAndPassword(auth, loginId, tenantPassword);
      toast({ title: 'Welcome Back!', description: "You've been signed in successfully." });
    } catch (error: any) {
      console.error("Tenant Password Auth Error:", error);
      toast({
        variant: "destructive",
        title: "Log In Failed",
        description: error.message || "Invalid credentials. If you don't have a password, use OTP.",
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
      toast({ title: 'Welcome!', description: "You've been signed in successfully." });
    } catch (error: any) {
      console.error("Google Sign-In Error:", error);
      if (error.code !== 'auth/popup-closed-by-user') {
        toast({
          variant: "destructive",
          title: "Google Sign-In Failed",
          description: error.message || "An error occurred.",
        });
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) {
        toast({ variant: "destructive", title: "Error", description: "Phone number is required." });
        return;
    }
    setIsSigningIn(true);
    try {
        const res = await fetch('/api/auth/otp/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to send OTP');
        
        setWaitingForOtp(true);
        toast({ title: 'OTP Sent', description: "Please check your phone for the 6-digit code." });
    } catch (error: any) {
        toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
        setIsSigningIn(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
        toast({ variant: "destructive", title: "Error", description: "Please enter a valid 6-digit OTP." });
        return;
    }
    setIsSigningIn(true);
    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to verify OTP');
      }

      await signInWithCustomToken(auth!, data.customToken);
      toast({ title: 'Welcome!', description: "You've been signed in successfully." });
    } catch (error: any) {
      console.error("OTP Verification Error:", error);
      toast({
        variant: "destructive",
        title: "Log In Failed",
        description: error.message || "Invalid OTP.",
      });
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
            {activeTab === 'owner' ? 'Log in to manage your properties.' : 'Log in to access your PG dashboard.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="tenant">Staff / Tenant</TabsTrigger>
              <TabsTrigger value="owner">Owner</TabsTrigger>
            </TabsList>

            <TabsContent value="tenant" className="grid gap-4">
              {tenantLoginMode === 'otp' ? (
                !waitingForOtp ? (
                  <form onSubmit={handleSendOtp} className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input id="phone" type="tel" placeholder="e.g. 9876543210" required value={phone} onChange={(e) => setPhone(e.target.value)} disabled={loading} />
                      <p className="text-xs text-muted-foreground">We will send a 6-digit OTP to your phone.</p>
                    </div>

                    <Button type="submit" className="w-full" disabled={loading || !phone}>
                      {isSigningIn ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Send OTP
                    </Button>
                    
                    <Button type="button" variant="link" className="text-xs" onClick={() => setTenantLoginMode('password')} disabled={loading}>
                       Login with Password instead
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtp} className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="otp">Enter OTP</Label>
                      <Input id="otp" type="text" placeholder="6-digit code" required maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value)} disabled={loading} />
                      <div className="flex justify-between items-center">
                          <p className="text-xs text-muted-foreground">Sent to {phone}</p>
                          <button type="button" onClick={() => setWaitingForOtp(false)} className="text-xs font-medium text-primary hover:underline" disabled={loading}>
                              Change Number
                          </button>
                      </div>
                    </div>

                    <Button type="submit" className="w-full" disabled={loading || otp.length !== 6}>
                      {isSigningIn ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Verify & Log In
                    </Button>
                    
                    <div className="flex flex-col gap-2 mt-2">
                        <Button type="button" variant="link" className="text-xs h-auto p-0" onClick={handleSendOtp} disabled={loading}>
                           Resend OTP
                        </Button>
                        <Button type="button" variant="link" className="text-xs h-auto p-0 text-muted-foreground" onClick={() => { setWaitingForOtp(false); setTenantLoginMode('password'); }} disabled={loading}>
                           Login with Password instead
                        </Button>
                    </div>
                  </form>
                )
              ) : (
                <form onSubmit={handleTenantPasswordSignIn} className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="tenant-phone">Phone Number or Email</Label>
                    <Input id="tenant-phone" type="text" placeholder="e.g. 9876543210" required value={phone} onChange={(e) => setPhone(e.target.value)} disabled={loading} />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="tenant-password">Password</Label>
                    <Input id="tenant-password" type="password" placeholder="Your password" required value={tenantPassword} onChange={(e) => setTenantPassword(e.target.value)} disabled={loading} />
                    <button type="button" onClick={() => setTenantLoginMode('otp')} className="text-xs font-medium text-primary hover:underline text-left" disabled={loading}>
                        Forgot password? Login with OTP
                    </button>
                  </div>

                  <Button type="submit" className="w-full" disabled={loading || !phone || !tenantPassword}>
                    {isSigningIn ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Log In
                  </Button>

                  <Button type="button" variant="link" className="text-xs" onClick={() => setTenantLoginMode('otp')} disabled={loading}>
                     Back to OTP Login
                  </Button>
                </form>
              )}
            </TabsContent>

            <TabsContent value="owner" className="grid gap-4">
              <form onSubmit={handleEmailSignIn} className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="name@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" placeholder="Your password" required value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} />
                </div>

                <Button type="submit" className="w-full" disabled={loading || !email || !password}>
                  {isSigningIn ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Log In as Owner
                </Button>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">OR</span></div>
              </div>

              <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={loading}>
                {isSigningIn ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon className="mr-2 h-4 w-4" />}
                Log in with Google
              </Button>
            </TabsContent>
          </Tabs>

          {activeTab === 'owner' && (
            <div className="mt-4 text-center text-sm">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="underline underline-offset-4 hover:text-primary">
                Sign up
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
