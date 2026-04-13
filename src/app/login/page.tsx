/**
 * LOGIN PAGE (Adaptive Auth)
 * Changes:
 * - Shifted to Identity-First (Phone entry first).
 * - Adaptive challenges (Password / OTP / Invite Code).
 * - Anti-enumeration: Generic loading/error states.
 * - Unified Staff/Tenant flow.
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
import { auth } from "@/lib/firebase"
import { Loader2, ArrowRight, ChevronLeft, ShieldCheck, Mail, Phone, Lock } from 'lucide-react'
import { useAppSelector } from '@/lib/hooks'
import { signInWithEmailAndPassword, signInWithCustomToken, GoogleAuthProvider, signInWithPopup } from "firebase/auth"

type LoginStage = 'IDENTITY' | 'CHALLENGE' | 'SWITCH_CONTEXT';
type ChallengeType = 'PASSWORD_OR_OTP' | 'INVITE_CODE';

import { RoleContextSwitcher } from '@/components/auth/RoleContextSwitcher';

export default function LoginPage() {
  const router = useRouter()
  const { toast } = useToast()
  const appLoading = useAppSelector((state) => state.app.isLoading);
  const currentUser = useAppSelector((state) => state.user.currentUser);

  // Flow State
  const [stage, setStage] = useState<LoginStage>('IDENTITY');
  const [challengeType, setChallengeType] = useState<ChallengeType>('PASSWORD_OR_OTP');
  const [authMethod, setAuthMethod] = useState<'PASSWORD' | 'OTP'>('PASSWORD');
  const [isProcessing, setIsProcessing] = useState(false);

  // Inputs
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [waitingForOtp, setWaitingForOtp] = useState(false);

  // Profiles for switcher
  const [showSwitcher, setShowSwitcher] = useState(false);

  // Owner Fallback State
  const [isOwnerLogin, setIsOwnerLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');

  const isLoading = appLoading || isProcessing;

  useEffect(() => {
    if (stage === 'SWITCH_CONTEXT') return; // Don't redirect if we are switching

    if (currentUser?.role && currentUser.role !== 'unassigned') {
      // Check for multi-role
      const hasMultiple = (currentUser.activeTenancies?.length || 0) + (currentUser.activeStaffProfiles?.length || 0) > 1;
      
      if (hasMultiple && !showSwitcher) {
        setStage('SWITCH_CONTEXT');
        setShowSwitcher(true);
        return;
      }

      if (currentUser.role === 'tenant') {
        router.replace('/tenants/my-pg');
      } else {
        router.replace('/dashboard');
      }
    }
  }, [currentUser, router, stage, showSwitcher]);

  // --- STEP 1: IDENTITY CHECK ---
  const handleIdentityCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length < 10) {
      toast({ variant: 'destructive', title: 'Invalid Phone', description: 'Please enter a valid 10-digit phone number.' });
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch('/api/auth/check-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Failed to check account state');

      setChallengeType(data.method || 'PASSWORD_OR_OTP');
      setStage('CHALLENGE');
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  // --- STEP 2: PASSWORD SIGN IN ---
  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    setIsProcessing(true);
    try {
      const loginId = `${phone.replace(/\D/g, '').slice(-10)}@roombox.app`;
      await signInWithEmailAndPassword(auth!, loginId, password);
      // Let useEffect handle redirect/switching
    } catch (err: any) {
        let msg = 'Invalid password. Please try again.';
        if (err.code === 'auth/user-not-found') msg = 'Account not found. Use setup code if new.';
        toast({ variant: 'destructive', title: 'Login Failed', description: msg });
        setIsProcessing(false);
    }
  };

  // --- STEP 2: OTP / INVITE CODE SIGN IN ---
  const handleSendOtp = async () => {
    setIsProcessing(true);
    try {
        const res = await fetch('/api/auth/otp/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        
        setWaitingForOtp(true);
        toast({ title: 'OTP Sent', description: 'Check your messages for the 6-digit code.' });
    } catch (err: any) {
        toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
        setIsProcessing(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) return;

    setIsProcessing(true);
    try {
        const res = await fetch('/api/auth/otp/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, otp })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        await signInWithCustomToken(auth!, data.customToken);
    } catch (err: any) {
        toast({ variant: 'destructive', title: 'Verification Failed', description: err.message });
        setOtp(''); // Reset on failure
        setIsProcessing(false);
    }
  };

  const handleContextSelect = async (role: string, pgId: string) => {
    setIsProcessing(true);
    try {
        const res = await fetch('/api/auth/switch-context', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetRole: role, targetPgId: pgId })
        });
        
        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Failed to switch context');
        }

        // Force reload to apply new claims
        window.location.reload();
    } catch (err: any) {
        toast({ variant: 'destructive', title: 'Switch Failed', description: err.message });
        setIsProcessing(false);
    }
  };

  // --- OWNER FLOWS ---
  const handleGoogleSignIn = async () => {
      setIsProcessing(true);
      try {
          const provider = new GoogleAuthProvider();
          await signInWithPopup(auth!, provider);
          // useEffect handles redirection
      } catch (err: any) {
          if (err.code !== 'auth/popup-closed-by-user') {
            toast({ variant: 'destructive', title: 'Google Login Failed', description: err.message });
          }
          setIsProcessing(false);
      }
  };

  const handleOwnerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      await signInWithEmailAndPassword(auth!, email, ownerPassword);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
      setIsProcessing(false);
    }
  };

  if (isOwnerLogin) {
      return (
          <div className="flex items-center justify-center min-h-[85vh] p-4">
              <Card className="w-full max-w-sm border-primary/20 shadow-2xl">
                  <CardHeader className="text-center space-y-1">
                      <div className="mx-auto bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-2">
                        <Lock className="w-6 h-6 text-primary" />
                      </div>
                      <CardTitle className="text-2xl font-bold">Owner Portal</CardTitle>
                      <CardDescription>Enter your email to manage properties</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4">
                      <form onSubmit={handleOwnerLogin} className="grid gap-4">
                         <div className="grid gap-2">
                            <Label htmlFor="email">Email Address</Label>
                            <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required disabled={isLoading} />
                         </div>
                         <div className="grid gap-2">
                            <Label htmlFor="owner-pass">Password</Label>
                            <Input id="owner-pass" type="password" value={ownerPassword} onChange={e => setOwnerPassword(e.target.value)} required disabled={isLoading} />
                         </div>
                         <Button type="submit" className="w-full h-11" disabled={isLoading}>
                             {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                             Log In with Password
                         </Button>
                      </form>
                      
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                        <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground font-medium">Or continue with</span></div>
                      </div>

                      <Button variant="outline" type="button" className="w-full h-11 font-semibold" onClick={handleGoogleSignIn} disabled={isLoading}>
                        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        Google Account
                      </Button>

                      <Button variant="ghost" className="text-xs h-9" onClick={() => setIsOwnerLogin(false)}>
                          <ChevronLeft className="mr-2 h-4 w-4" /> Back to Resident Login
                      </Button>
                  </CardContent>
              </Card>
          </div>
      )
  }

  return (
    <div className="flex items-center justify-center min-h-[85vh] bg-background p-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background">
      <Card className="w-full max-w-[400px] border-primary/10 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.1)] backdrop-blur-sm bg-card/95">
        <CardHeader className="text-center pb-8 pt-8">
            <div className="mx-auto bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center mb-5 rotate-3 shadow-inner">
                <ShieldCheck className="w-8 h-8 text-primary" />
            </div>
          <CardTitle className="text-3xl font-extrabold tracking-tight">RentSutra</CardTitle>
          <CardDescription className="text-base">
            {stage === 'IDENTITY' ? 'Experience your digital PG life' : 
             stage === 'SWITCH_CONTEXT' ? 'Pick a profile to continue' :
             'Welcome back, authenticate to continue'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {stage === 'IDENTITY' ? (
            <form onSubmit={handleIdentityCheck} className="grid gap-6">
              <div className="grid gap-3">
                <Label htmlFor="phone" className="text-sm font-semibold flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" /> Phone Number
                </Label>
                <div className="relative group">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium border-r pr-3">+91</span>
                    <Input id="phone" type="tel" placeholder="9876543210" required className="pl-14 h-12 text-lg font-medium tracking-wide focus-visible:ring-primary/20" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0,10))} disabled={isLoading} />
                </div>
                <p className="text-[11px] text-muted-foreground text-center">Enter the number shared with your property owner.</p>
              </div>

              <Button type="submit" className="w-full h-12 text-md font-bold group shadow-lg shadow-primary/10" disabled={isLoading || phone.length < 10}>
                {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                Next <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>

              <div className="flex flex-col gap-3 mt-4">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center px-4"><span className="w-full border-t border-border/50" /></div>
                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-3 text-muted-foreground font-medium">Owner & Management Access</span></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                      <Button type="button" variant="outline" className="h-10 text-[11px] font-bold hover:bg-primary/5 hover:text-primary transition-colors px-1" onClick={() => setIsOwnerLogin(true)} disabled={isLoading}>
                        <Mail className="mr-1.5 h-3.5 w-3.5" /> Owner Email
                      </Button>
                      <Button type="button" variant="outline" className="h-10 text-[11px] font-bold hover:bg-primary/5 hover:text-primary transition-colors px-1" onClick={handleGoogleSignIn} disabled={isLoading}>
                        <svg className="mr-1.5 h-3.5 w-3.5" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        Owner Google
                      </Button>
                  </div>
              </div>
            </form>
          ) : stage === 'SWITCH_CONTEXT' ? (
            <RoleContextSwitcher user={currentUser} onSelect={handleContextSelect} isProcessing={isProcessing} />
          ) : (
            <div className="grid gap-6">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Phone Number</span>
                        <span className="text-lg font-bold text-primary">{phone}</span>
                    </div>
                    <Button variant="ghost" size="sm" className="h-8 text-xs font-bold text-muted-foreground hover:bg-primary/5 hover:text-primary" onClick={() => { setStage('IDENTITY'); setWaitingForOtp(false); setOtp(''); }}>
                        <ChevronLeft className="w-3 h-3 mr-1" /> Edit
                    </Button>
                </div>

                {challengeType === 'INVITE_CODE' ? (
                   <form onSubmit={handleVerifyCode} className="grid gap-6">
                        <div className="grid gap-3">
                            <Label htmlFor="invite-code" className="text-sm font-semibold">Your Invitation Code</Label>
                            <Input id="invite-code" type="text" placeholder="6-digit code" required maxLength={6} className="h-12 text-center text-2xl font-mono tracking-[0.5em] focus:tracking-[0.8em] transition-all" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} disabled={isLoading} />
                            <p className="text-[11px] text-muted-foreground italic text-center">This code was shared by your manager for setup.</p>
                        </div>
                        <Button type="submit" className="w-full h-12 text-md font-bold shadow-lg" disabled={isLoading || otp.length !== 6}>
                            {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                            Verify & Join Property
                        </Button>
                   </form>
                ) : (
                    <>
                    {authMethod === 'PASSWORD' ? (
                        <form onSubmit={handlePasswordSignIn} className="grid gap-6">
                            <div className="grid gap-3">
                                <Label htmlFor="pass" className="text-sm font-semibold">Password</Label>
                                <Input id="pass" type="password" placeholder="Enter your password" required className="h-12 focus-visible:ring-primary/20" value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading} />
                                <button type="button" className="text-xs font-bold text-primary hover:underline text-left w-fit" onClick={() => setAuthMethod('OTP')} disabled={isLoading}>Forgot? Use OTP Login</button>
                            </div>
                            <Button type="submit" className="w-full h-12 text-md font-bold shadow-lg shadow-primary/10" disabled={isLoading || !password}>
                                {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                                Sign In
                            </Button>
                            <Button variant="link" className="text-xs h-auto p-0 font-semibold" onClick={() => setAuthMethod('OTP')} disabled={isLoading}>I prefer login via OTP</Button>
                        </form>
                    ) : (
                        <div className="grid gap-6">
                            {!waitingForOtp ? (
                                <div className="grid gap-4">
                                     <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
                                        <p className="text-xs text-center text-muted-foreground leading-relaxed">Security Check: We will send a 6-digit code via SMS to verify your identity.</p>
                                     </div>
                                     <Button onClick={handleSendOtp} className="w-full h-12 text-md font-bold shadow-lg" disabled={isLoading}>
                                        {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                                        Get One-Time Code
                                     </Button>
                                     <Button variant="link" className="text-xs h-auto p-0 font-semibold" onClick={() => setAuthMethod('PASSWORD')} disabled={isLoading}>Back to Password Login</Button>
                                </div>
                            ) : (
                                <form onSubmit={handleVerifyCode} className="grid gap-6">
                                    <div className="grid gap-3">
                                        <Label htmlFor="otp-verify" className="text-sm font-semibold">One-Time Code (OTP)</Label>
                                        <Input id="otp-verify" type="text" placeholder="6-digit code" required maxLength={6} className="h-12 text-center text-2xl font-mono tracking-[0.5em] transition-all" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} disabled={isLoading} />
                                        <div className="flex justify-between items-center px-1">
                                            <button type="button" className="text-[11px] font-bold text-muted-foreground hover:text-primary" onClick={handleSendOtp} disabled={isLoading}>Resend Code</button>
                                            <button type="button" className="text-[11px] font-bold text-primary" onClick={() => setWaitingForOtp(false)} disabled={isLoading}>Change Method</button>
                                        </div>
                                    </div>
                                    <Button type="submit" className="w-full h-12 text-md font-bold shadow-lg" disabled={isLoading || otp.length !== 6}>
                                        {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                                        Verify & Sign In
                                    </Button>
                                </form>
                            )}
                        </div>
                    )}
                    </>
                )}
            </div>
          )}
        </CardContent>
      </Card>
      {/* Background Blobs for Premium Look */}
      <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/5 blur-[120px] rounded-full -z-10 animate-pulse-slow"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[120px] rounded-full -z-10 animate-pulse-slow delay-1000"></div>
    </div>
  )
}


