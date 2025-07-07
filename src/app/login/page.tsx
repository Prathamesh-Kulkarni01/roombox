
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

// Since reCAPTCHA is loaded via a script, we need to extend the window type
declare global {
    interface Window {
        recaptchaVerifier?: RecaptchaVerifier;
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

  useEffect(() => {
    return () => {
      // Cleanup the verifier on component unmount
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
      }
    };
  }, []);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{10}$/.test(phone)) {
        toast({ variant: "destructive", title: "Invalid Phone Number", description: "Please enter a valid 10-digit phone number." });
        return;
    }
    setLoading(true);

    try {
      // Ensure any previous verifier is cleared before creating a new one
      if (window.recaptchaVerifier) {
          window.recaptchaVerifier.clear();
      }
      
      const recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
        'callback': (response: any) => {
          // reCAPTCHA solved, allow signInWithPhoneNumber.
        },
        'expired-callback': () => {
            // Response expired. Ask user to solve reCAPTCHA again.
            if (window.recaptchaVerifier) {
                window.recaptchaVerifier.clear();
            }
        }
      });
      window.recaptchaVerifier = recaptchaVerifier;

      const formattedPhone = `+91${phone}`;
      const result = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifier);
      setConfirmationResult(result);
      setShowOtpInput(true);
      toast({ title: "OTP Sent", description: `An OTP has been sent to ${formattedPhone}.` });
    } catch (error) {
      console.error("Error sending OTP:", error);
      // Reset reCAPTCHA if something goes wrong.
      if (window.grecaptcha && typeof window.grecaptcha.reset === 'function') {
        try {
          window.grecaptcha.reset();
        } catch(e) {
          console.error("Error resetting grecaptcha", e)
        }
      }
      toast({ 
        variant: "destructive", 
        title: "Failed to send OTP", 
        description: "Please check your number and try again. This can sometimes be due to project configuration issues." 
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
          router.push('/complete-profile');
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

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-56px)] bg-background p-4">
        <div id="recaptcha-container"></div>
        <Card className="w-full max-w-sm">
            <CardHeader>
                <CardTitle className="text-2xl">Login or Sign Up</CardTitle>
                <CardDescription>
                    Enter your phone number to receive a one-time password.
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
        </Card>
    </div>
  )
}
