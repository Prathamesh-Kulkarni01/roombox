'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useData } from '@/context/data-provider'
import { useToast } from '@/hooks/use-toast'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { Loader2 } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

declare global {
    interface Window {
        recaptchaVerifier?: RecaptchaVerifier;
        confirmationResult?: ConfirmationResult;
        grecaptcha?: any;
    }
}

export default function LoginPage() {
  const router = useRouter()
  const { handlePhoneAuthSuccess } = useData()
  const { toast } = useToast()

  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [showOtpInput, setShowOtpInput] = useState(false)
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null)
  const [authType, setAuthType] = useState<'owner' | 'guest'>('owner')
  
  useEffect(() => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
        'callback': (response: any) => {
          // reCAPTCHA solved.
        },
        'expired-callback': () => {
          toast({
            variant: "destructive",
            title: "reCAPTCHA Expired",
            description: "Please try sending the OTP again."
          });
        }
      });
    }
  }, []);

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
                        Enter your phone number to {showOtpInput ? 'verify the OTP' : 'receive a one-time password'}.
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
                            <Button variant="link" onClick={() => setShowOtpInput(false)}>
                                Use a different number
                            </Button>
                        </form>
                    )}
                </CardContent>
            </Tabs>
        </Card>
    </div>
  )
}
