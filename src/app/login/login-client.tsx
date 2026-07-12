"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  ChevronLeft,
  Lock,
} from "lucide-react";
import { useAppSelector } from "@/lib/hooks";
import {
  signInWithEmailAndPassword,
  signInWithCustomToken,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  GoogleAuthProvider,
  signInWithPopup,
  ConfirmationResult,
  createUserWithEmailAndPassword
} from "firebase/auth";
import { usePgBranding } from "@/context/branding-context";
import { useFirebaseTenant } from "@/platform/auth";
import { RoleContextSwitcher } from "@/components/auth/RoleContextSwitcher";

declare global {
  interface Window {
    recaptchaVerifier: any;
    grecaptcha: any;
  }
}

type LoginStage = "IDENTITY" | "CHALLENGE" | "SWITCH_CONTEXT";
type ChallengeType = "PASSWORD_OR_OTP" | "INVITE_CODE";

const GoogleIcon = (props: React.ComponentProps<'svg'>) => (
  <svg role="img" viewBox="0 0 24 24" {...props}>
    <path
      fill="currentColor"
      d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.02 1.02-2.6 1.98-4.66 1.98-3.56 0-6.47-2.91-6.47-6.47s2.91-6.47 6.47-6.47c1.94 0 3.32.73 4.31 1.76l2.35-2.35C19.05 3.32 16.2 2 12.48 2 7.18 2 3.13 5.96 3.13 11.25s4.05 9.25 9.35 9.25c3.21 0 5.7-1.09 7.6-3.05 2.03-2.03 2.54-5.02 2.54-7.61 0-.61-.05-1.19-.16-1.74z"
    />
  </svg>
);

export default function LoginPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");
  const { toast } = useToast();
  const appLoading = useAppSelector((state) => state.app.isLoading);
  const currentUser = useAppSelector((state) => state.user.currentUser);
  const branding = usePgBranding();
  
  // Use dynamically resolved tenant auth instead of global central auth
  const { auth } = useFirebaseTenant();

  // Flow State
  const [stage, setStage] = useState<LoginStage>("IDENTITY");
  const [challengeType, setChallengeType] = useState<ChallengeType>("PASSWORD_OR_OTP");
  const [authMethod, setAuthMethod] = useState<"PASSWORD" | "OTP">("PASSWORD");
  const [isProcessing, setIsProcessing] = useState(false);

  // Inputs
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [waitingForOtp, setWaitingForOtp] = useState(false);
  
  // Firebase Auth State
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);

  // Profiles for switcher
  const [showSwitcher, setShowSwitcher] = useState(false);

  // Owner Fallback State
  const [activeTab, setActiveTab] = useState("tenant"); // "tenant" or "owner"
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");

  const isLoading = appLoading || isProcessing;

  useEffect(() => {
    if (stage === "SWITCH_CONTEXT") return;

    if (currentUser?.role) {
      if (currentUser.role === "unassigned") {
        router.replace("/complete-profile");
        return;
      }

      const hasMultiple = (currentUser.activeTenancies?.length || 0) + (currentUser.activeStaffProfiles?.length || 0) > 1;

      if (hasMultiple && !showSwitcher && stage === "IDENTITY" && !currentUser.lastActiveContext) {
        setStage("SWITCH_CONTEXT");
        setShowSwitcher(true);
        return;
      }

      if (redirectParam) {
        const target = decodeURIComponent(redirectParam);
        if (target.startsWith("/") || target.startsWith(window.location.origin)) {
          window.location.href = target;
        } else {
          router.replace(target);
        }
      } else if (currentUser.role === "tenant") {
        router.replace("/tenants/my-pg");
      } else if (currentUser.role === "owner" && !currentUser.isOnboarded) {
        router.replace("/complete-profile");
      } else {
        router.replace("/dashboard");
      }
    }
  }, [currentUser, router, stage, showSwitcher, redirectParam]);

  // Setup Recaptcha
  useEffect(() => {
    if (auth && !window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
      });
    }
  }, [auth]);

  const handleIdentityCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length < 10) {
      toast({ variant: "destructive", title: "Invalid Phone", description: "Please enter a valid 10-digit phone number." });
      return;
    }

    setIsProcessing(true);
    try {
      setChallengeType("PASSWORD_OR_OTP");
      setStage("CHALLENGE");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !auth) return;

    setIsProcessing(true);
    try {
      const loginId = `${phone.replace(/\D/g, "").slice(-10)}@roombox.app`;
      
      // First attempt: use the resolved auth instance (enterprise or central)
      try {
        await signInWithEmailAndPassword(auth, loginId, password);
        return; // Success
      } catch (firstErr: any) {
        // If we get user-not-found on the central auth, the tenant might be enterprise.
        // Fall through to server-side resolution via /api/auth/phone-login.
        if (firstErr.code !== 'auth/user-not-found' && firstErr.code !== 'auth/invalid-credential' && firstErr.code !== 'auth/wrong-password') {
          throw firstErr;
        }
        console.warn('[Login] First auth attempt failed:', firstErr.code, '- trying server-side fallback...');
      }

      // Fallback: Use server-side /api/auth/phone-login which resolves enterprise context
      const res = await fetch('/api/auth/phone-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Login failed. Please check your password.');
      }

      // Use the custom token returned by the server to sign in on the correct auth instance
      if (data.customToken) {
        // For enterprise users, sign into the tenant-specific auth instance
        const { getApps } = await import('firebase/app');
        const { getAuth } = await import('firebase/auth');
        const tenantApp = getApps().find(a => a.name === 'tenant-login-instance' || a.name.startsWith('tenant-'));
        const targetAuth = tenantApp ? getAuth(tenantApp) : auth;
        await signInWithCustomToken(targetAuth, data.customToken);
      } else {
        throw new Error('No authentication token received.');
      }
    } catch (err: any) {
      console.error('[Login] Password sign-in error:', err);
      let msg = "Invalid password. Please try again.";
      if (err.code === "auth/user-not-found" || err.message?.includes('Account not found')) msg = "Account not found.";
      if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") msg = "Incorrect password. Please try again.";
      toast({ variant: "destructive", title: "Login Failed", description: msg });
      setIsProcessing(false);
    }
  };

  const handleSendOtp = async () => {
    if (!auth) return;
    setIsProcessing(true);
    try {
      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone.replace(/\D/g, "")}`;
      const appVerifier = window.recaptchaVerifier;
      const result = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(result);
      setWaitingForOtp(true);
      toast({ title: "OTP Sent", description: "Check your messages for the 6-digit code." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
      if (window.recaptchaVerifier) {
          window.recaptchaVerifier.render().then((widgetId: any) => {
              window.grecaptcha.reset(widgetId);
          });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6 || !confirmationResult) return;

    setIsProcessing(true);
    try {
      await confirmationResult.confirm(otp);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Verification Failed", description: "Invalid OTP code." });
      setOtp("");
      setIsProcessing(false);
    }
  };

  const handleContextSelect = async (role: string, pgId: string) => {
    setIsProcessing(true);
    try {
      const token = await auth?.currentUser?.getIdToken();
      const res = await fetch("/api/auth/switch-context", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ targetRole: role, targetPgId: pgId }),
      });

      if (!res.ok) throw new Error("Failed to switch context");
      await auth?.currentUser?.getIdToken(true);

      if (redirectParam) window.location.href = decodeURIComponent(redirectParam);
      else if (role === "tenant") router.replace("/tenants/my-pg");
      else router.replace("/dashboard");
    } catch (err: any) {
      toast({ variant: "destructive", title: "Switch Failed", description: err.message });
      setIsProcessing(false);
    }
  };

  const handleOwnerEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    
    setIsProcessing(true);
    try {
      if (isSignUp) {
        if (!ownerPassword || ownerPassword.length < 6) {
          toast({ variant: "destructive", title: "Weak Password", description: "Password must be at least 6 characters." });
          setIsProcessing(false);
          return;
        }
        await createUserWithEmailAndPassword(auth, email, ownerPassword);
        toast({ title: 'Welcome!', description: "Account created successfully." });
      } else {
        await signInWithEmailAndPassword(auth, email, ownerPassword);
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: isSignUp ? "Sign Up Failed" : "Login Failed", description: err.message });
      setIsProcessing(false);
    }
  };
  
  const handleGoogleSignIn = async () => {
    if (!auth) return;
    setIsProcessing(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      toast({ title: 'Success', description: "Authenticated with Google." });
    } catch (error: any) {
      console.error("Google Sign-In Error:", error);
      if (error.code !== 'auth/popup-closed-by-user') {
        toast({
          variant: "destructive",
          title: "Google Auth Failed",
          description: error.message || "An error occurred.",
        });
      }
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-56px)] bg-background p-4 sm:p-8 overscroll-none">
      <div id="recaptcha-container"></div>
      <Card className="w-full max-w-sm shadow-none sm:shadow-xl border-0 sm:border bg-transparent sm:bg-card">
        <CardHeader className="text-center px-0 sm:px-6">
          <CardTitle className="text-3xl font-extrabold pb-2 tracking-tight">{branding?.siteTitle ?? "RentSutra"}</CardTitle>
          <CardDescription className="text-base">
            {activeTab === "tenant" ? "Authenticate to continue" : (isSignUp ? "Create an owner account" : "Sign in to owner portal")}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          {stage === "SWITCH_CONTEXT" ? (
             <RoleContextSwitcher user={currentUser} onSelect={handleContextSelect} isProcessing={isProcessing} />
          ) : (
             <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
               <TabsList className="grid w-full grid-cols-2 mb-6 h-12 sm:h-10">
                 <TabsTrigger value="tenant" className="text-base sm:text-sm h-full">Tenant</TabsTrigger>
                 <TabsTrigger value="owner" className="text-base sm:text-sm h-full">Owner</TabsTrigger>
               </TabsList>

               <TabsContent value="tenant" className="mt-0 space-y-4">
                  {stage === "IDENTITY" ? (
                    <form onSubmit={handleIdentityCheck} className="grid gap-6">
                      <div className="grid gap-3">
                        <Label htmlFor="phone" className="text-base sm:text-sm">Phone Number</Label>
                        <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} required disabled={isLoading} className="text-base sm:text-sm h-12 sm:h-10" placeholder="10-digit mobile number" />
                      </div>
                      <Button type="submit" className="w-full h-14 sm:h-11 text-base sm:text-sm" disabled={isLoading || phone.length < 10}>
                        {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />} Next
                      </Button>
                    </form>
                  ) : (
                    <div className="grid gap-6">
                      <Button variant="ghost" onClick={() => setStage("IDENTITY")} className="w-fit h-12 sm:h-10 text-base sm:text-sm px-0 hover:bg-transparent">
                        <ChevronLeft className="w-5 h-5 sm:w-4 sm:h-4 mr-1" /> Back
                      </Button>
                      
                      {authMethod === "PASSWORD" ? (
                        <form onSubmit={handlePasswordSignIn} className="grid gap-6">
                          <div className="grid gap-3">
                            <Label htmlFor="pass" className="text-base sm:text-sm">Password</Label>
                            <Input id="pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={isLoading} className="text-base sm:text-sm h-12 sm:h-10" placeholder="Enter your password" />
                          </div>
                          <Button type="submit" className="w-full h-14 sm:h-11 text-base sm:text-sm" disabled={isLoading || !password}>
                            Sign In
                          </Button>
                          <Button variant="link" type="button" onClick={() => setAuthMethod("OTP")} className="h-12 sm:h-10 text-base sm:text-sm">
                            Use OTP Login Instead
                          </Button>
                        </form>
                      ) : (
                        <div className="grid gap-6">
                          {!waitingForOtp ? (
                            <>
                              <Button onClick={handleSendOtp} className="w-full h-14 sm:h-11 text-base sm:text-sm" disabled={isLoading}>
                                Get OTP
                              </Button>
                              <Button variant="link" onClick={() => setAuthMethod("PASSWORD")} className="h-12 sm:h-10 text-base sm:text-sm">
                                Back to Password
                              </Button>
                            </>
                          ) : (
                            <form onSubmit={handleVerifyOtp} className="grid gap-6">
                              <div className="grid gap-3">
                                <Label htmlFor="otp-verify" className="text-base sm:text-sm">Enter 6-digit OTP</Label>
                                <Input id="otp-verify" type="text" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} required disabled={isLoading} className="text-base sm:text-sm h-12 sm:h-10 text-center tracking-widest font-mono" placeholder="------" />
                              </div>
                              <Button type="submit" className="w-full h-14 sm:h-11 text-base sm:text-sm" disabled={isLoading || otp.length !== 6}>
                                Verify OTP
                              </Button>
                            </form>
                          )}
                        </div>
                      )}
                    </div>
                  )}
               </TabsContent>

               <TabsContent value="owner" className="mt-0">
                  <form onSubmit={handleOwnerEmailAuth} className="grid gap-5">
                    <div className="grid gap-2">
                      <Label htmlFor="email" className="text-base sm:text-sm">Email</Label>
                      <Input 
                        id="email" 
                        type="email" 
                        inputMode="email"
                        autoCapitalize="none"
                        autoCorrect="off"
                        className="text-base sm:text-sm h-12 sm:h-10"
                        placeholder="name@example.com" 
                        required 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        disabled={isLoading} 
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="owner-password" className="text-base sm:text-sm">Password</Label>
                      <Input 
                        id="owner-password" 
                        type="password" 
                        className="text-base sm:text-sm h-12 sm:h-10"
                        placeholder={isSignUp ? "Min 6 characters" : "Your password"} 
                        required 
                        value={ownerPassword} 
                        onChange={(e) => setOwnerPassword(e.target.value)} 
                        disabled={isLoading} 
                        minLength={isSignUp ? 6 : 1} 
                      />
                    </div>

                    <Button type="submit" className="w-full h-14 sm:h-11 mt-2 text-base sm:text-sm" disabled={isLoading || !email || !ownerPassword}>
                      {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                      {isSignUp ? "Sign Up" : "Log In"}
                    </Button>
                  </form>

                  <div className="relative my-8">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-background sm:bg-card px-2 text-muted-foreground font-medium">OR</span></div>
                  </div>

                  <Button variant="outline" className="w-full h-14 sm:h-11 text-base sm:text-sm" onClick={handleGoogleSignIn} disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <GoogleIcon className="mr-2 h-5 w-5" />}
                    Continue with Google
                  </Button>

                  <div className="mt-8 text-center text-base sm:text-sm">
                    {isSignUp ? "Already have an account?" : "Don't have an account?"} {" "}
                    <Button variant="link" className="p-0 h-auto font-normal text-base sm:text-sm" onClick={() => setIsSignUp(!isSignUp)}>
                      {isSignUp ? "Log in" : "Sign up"}
                    </Button>
                  </div>
               </TabsContent>
             </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
