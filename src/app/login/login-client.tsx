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
import {
  Loader2,
  ArrowRight,
  ChevronLeft,
  ShieldCheck,
  Mail,
  Phone,
  Lock,
  Building2,
} from "lucide-react";
import { useAppSelector } from "@/lib/hooks";
import {
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  GoogleAuthProvider,
  signInWithPopup,
  ConfirmationResult
} from "firebase/auth";
import { usePgBranding } from "@/context/branding-context";
import { useFirebaseTenant } from "@/context/firebase-tenant-context";
import { RoleContextSwitcher } from "@/components/auth/RoleContextSwitcher";

declare global {
  interface Window {
    recaptchaVerifier: any;
    grecaptcha: any;
  }
}

type LoginStage = "IDENTITY" | "CHALLENGE" | "SWITCH_CONTEXT";
type ChallengeType = "PASSWORD_OR_OTP" | "INVITE_CODE";

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
  const [isOwnerLogin, setIsOwnerLogin] = useState(false);
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
      // In a fully decentralized setup, you might skip checking state centrally and just attempt login.
      // For now, we assume standard password/otp flow.
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
      await signInWithEmailAndPassword(auth, loginId, password);
      // Let useEffect handle redirect
    } catch (err: any) {
      let msg = "Invalid password. Please try again.";
      if (err.code === "auth/user-not-found") msg = "Account not found.";
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
      // Reset recaptcha on error
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
      // Let useEffect handle redirect
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

  const handleOwnerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      await signInWithEmailAndPassword(auth!, email, ownerPassword);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
      setIsProcessing(false);
    }
  };

  if (isOwnerLogin) {
    return (
      <div className="flex items-center justify-center min-h-[85vh] p-4 overscroll-none">
        <Card className="w-full max-w-sm border-primary/20 shadow-2xl">
          <CardHeader className="text-center space-y-1">
            <div className="mx-auto bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-2">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">Owner Portal</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <form onSubmit={handleOwnerLogin} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isLoading} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="owner-pass">Password</Label>
                <Input id="owner-pass" type="password" value={ownerPassword} onChange={(e) => setOwnerPassword(e.target.value)} required disabled={isLoading} />
              </div>
              <Button type="submit" className="w-full h-11" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Log In
              </Button>
            </form>
            <Button variant="ghost" className="w-full h-9" onClick={() => setIsOwnerLogin(false)}>
              <ChevronLeft className="mr-2 h-4 w-4" /> Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[85vh] bg-background p-4">
      <div id="recaptcha-container"></div>
      <Card className="w-full max-w-[400px] shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-extrabold">{branding?.siteTitle ?? "RentSutra"}</CardTitle>
          <CardDescription>Authenticate to continue</CardDescription>
        </CardHeader>
        <CardContent>
          {stage === "IDENTITY" ? (
            <form onSubmit={handleIdentityCheck} className="grid gap-6">
              <div className="grid gap-3">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} required disabled={isLoading} />
              </div>
              <Button type="submit" className="w-full h-12" disabled={isLoading || phone.length < 10}>
                {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />} Next
              </Button>
              <Button variant="outline" type="button" onClick={() => setIsOwnerLogin(true)}>
                Owner Access
              </Button>
            </form>
          ) : stage === "SWITCH_CONTEXT" ? (
            <RoleContextSwitcher user={currentUser} onSelect={handleContextSelect} isProcessing={isProcessing} />
          ) : (
            <div className="grid gap-6">
              <Button variant="ghost" onClick={() => setStage("IDENTITY")}>
                <ChevronLeft className="w-3 h-3 mr-1" /> Back
              </Button>
              
              {authMethod === "PASSWORD" ? (
                <form onSubmit={handlePasswordSignIn} className="grid gap-6">
                  <div className="grid gap-3">
                    <Label htmlFor="pass">Password</Label>
                    <Input id="pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={isLoading} />
                  </div>
                  <Button type="submit" className="w-full h-12" disabled={isLoading || !password}>
                    Sign In
                  </Button>
                  <Button variant="link" type="button" onClick={() => setAuthMethod("OTP")}>
                    Use OTP Login Instead
                  </Button>
                </form>
              ) : (
                <div className="grid gap-6">
                  {!waitingForOtp ? (
                    <>
                      <Button onClick={handleSendOtp} className="w-full h-12" disabled={isLoading}>
                        Get OTP
                      </Button>
                      <Button variant="link" onClick={() => setAuthMethod("PASSWORD")}>
                        Back to Password
                      </Button>
                    </>
                  ) : (
                    <form onSubmit={handleVerifyOtp} className="grid gap-6">
                      <Input id="otp-verify" type="text" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} required disabled={isLoading} />
                      <Button type="submit" className="w-full h-12" disabled={isLoading || otp.length !== 6}>
                        Verify OTP
                      </Button>
                    </form>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
