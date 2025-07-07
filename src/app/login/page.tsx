
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useData } from '@/context/data-provider'
import { useToast } from '@/hooks/use-toast'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult, GoogleAuthProvider, signInWithPopup } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { Loader2 } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const GoogleIcon = (props: React.ComponentProps<'svg'>) => (
  <svg role="img" viewBox="0 0 24 24" {...props}>
    <path
      fill="currentColor"
      d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.02 1.02-2.6 1.98-4.66 1.98-3.56 0-6.47-2.91-6.47-6.47s2.91-6.47 6.47-6.47c1.94 0 3.32.73 4.31 1.76l2.35-2.35C19.05 3.32 16.2 2 12.48 2 7.18 2 3.13 5.96 3.13 11.25s4.05 9.25 9.35 9.25c3.21 0 5.7-1.09 7.6-3.05 2.03-2.03 2.54-5.02 2.54-7.61 0-.61-.05-1.19-.16-1.74z"
    />
  </svg>
);


declare global {
    interface Window {
        recaptchaVerifier?: RecaptchaVerifier;
        confirmationResult?: ConfirmationResult;
        grecaptcha?: any;
    }
}

export default function LoginPage() {
  const router = useRouter()
  const { handlePhoneAuthSuccess, handleSocialLogin } = useData()
  const { toast } = useToast()

  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [showOtpInput, setShowOtpInput] = useState(false)
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null)
  const [authType, setAuthType] = useState<'owner' | 'guest'>('owner')
  
   useEffect(() => {
    // This effect ensures reCAPTCHA is only initialized on the client-side
    // and cleaned up properly.
    if (!window.recaptchaVerifier) {
      // The container MUST be visible for invisible reCAPTCHA to work.
      // We position it off-screen.
      const recaptchaContainer = document.getElementById('recaptcha-container');
      if (recaptchaContainer) {
          window.recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaContainer, {
            'size': 'invisible',
            'callback': (response: any) => { /* reCAPTCHA solved */ },
            'expired-callback': () => {
                toast({
                    variant: "destructive",
                    title: "reCAPTCHA Expired",
                    description: "Please try sending the OTP again."
                });
            }
          });
      }
    }
  }, [toast]);


  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{10}$/.test(phone)) {
        toast({ variant: "destructive", title: "Invalid Phone Number", description: "Please enter a valid 10-digit phone number." });
        return;
    }
    setLoading(true);

    const appVerifier = window.recaptchaVerifier;
    if (!appVerifier) {
      toast({ variant: "destructive", title: "reCAPTCHA Error", description: "Please refresh the page and try again."});
      setLoading(false);
      return;
    }
    
    try {
      const formattedPhone = `+91${phone}`;
      const result = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      
      setConfirmationResult(result);
      setShowOtpInput(true);
      toast({ title: "OTP Sent", description: `An OTP has been sent to ${formattedPhone}.` });
    } catch (error) {
      console.error("Error sending OTP:", error);
      toast({ 
        variant: "destructive", 
        title: "Failed to Send OTP", 
        description: "An error occurred. Please try again. Ensure your Firebase project has Phone Auth enabled and the domain is authorized." 
      });
      // Reset reCAPTCHA
      window.grecaptcha?.reset(window.recaptchaVerifier?.widgetId);
    } finally {
      setLoading(false);
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResult) return;
    setLoading(true);
    try {
      const userCredential = await confirmationResult.confirm(otp);
      if (userCredential.user && userCredential.user.phoneNumber) {
        const result = await handlePhoneAuthSuccess(userCredential.user.phoneNumber);
        
        if (result.isNewUser) {
           if (authType === 'owner') {
             router.push('/complete-profile');
           } else {
             toast({ variant: 'destructive', title: 'Account Not Found', description: 'This number is not associated with any guest account.' })
             setLoading(false)
             setShowOtpInput(false)
           }
        } else if (result.role === 'tenant') {
          router.push('/tenants/my-pg');
        } else {
          router.push('/dashboard');
        }
      } else {
         throw new Error("User not found in credential");
      }
    } catch (error) {
       console.error("Error verifying OTP:", error);
       toast({ variant: "destructive", title: "Invalid OTP", description: "The OTP you entered is incorrect. Please try again." });
       setLoading(false);
    }
  }

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      await handleSocialLogin(result.user);
      toast({
        title: 'Welcome!',
        description: "You've been signed in successfully.",
      });
      router.push('/dashboard');
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
      setLoading(false);
    }
  };


  const handleTabChange = (value: string) => {
    setAuthType(value as 'owner' | 'guest');
    setShowOtpInput(false);
    setPhone('');
    setOtp('');
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-56px)] bg-background p-4">
        <div id="recaptcha-container"></div>
        <Card className="w-full max-w-sm">
            <Tabs value={authType} onValueChange={handleTabChange}>
                <CardHeader>
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="owner">Owner / Manager</TabsTrigger>
                        <TabsTrigger value="guest">Guest</TabsTrigger>
                    </TabsList>
                    <CardTitle className="text-2xl pt-4">{authType === 'owner' ? 'Owner Login' : 'Guest Login'}</CardTitle>
                    <CardDescription>
                       Sign in with your phone number or Google account.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {!showOtpInput ? (
                        <form onSubmit={handleSendOtp} className="grid gap-4">
                            <div className="flex items-center gap-2">
                              <div className="flex h-10 w-14 items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-sm">
                                +91
                              </div>
                              <Input 
                                id="phone"
                                type="tel"
                                placeholder="10-digit mobile number"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                required
                              />
                            </div>
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Send OTP
                            </Button>
                        </form>
                    ) : (
                        <form onSubmit={handleVerifyOtp} className="grid gap-4">
                            <Input 
                                id="otp"
                                type="text"
                                placeholder="Enter 6-digit OTP"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                required
                            />
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Verify OTP
                            </Button>
                            <Button variant="link" onClick={() => {
                                setShowOtpInput(false)
                                // Also reset the verifier if needed
                                window.grecaptcha?.reset(window.recaptchaVerifier?.widgetId);
                            }}>
                                Use a different number
                            </Button>
                        </form>
                    )}
                     <div className="relative my-4">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">
                            Or continue with
                            </span>
                        </div>
                    </div>
                    <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={loading}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon className="mr-2 h-4 w-4" />}
                        Sign in with Google
                    </Button>
                </CardContent>
            </Tabs>
        </Card>
    </div>
  )
}
