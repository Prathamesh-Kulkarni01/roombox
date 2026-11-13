'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Store, 
  Phone, 
  Lock, 
  ArrowRight, 
  Loader2, 
  ShieldCheck, 
  Sparkles,
  ShoppingBag,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { auth } from '@/lib/firebase';
import { 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  ConfirmationResult, 
  GoogleAuthProvider, 
  signInWithPopup 
} from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { useAppDispatch } from '@/lib/hooks';
import { setUser } from '@/lib/slices/userSlice';

declare global {
  interface Window {
    bazarRecaptchaVerifier?: RecaptchaVerifier;
  }
}

export default function BazarLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/bazar/dashboard';
  const { toast } = useToast();
  const dispatch = useAppDispatch();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [errorMsg, setErrorMsg] = useState('');

  // Setup reCAPTCHA
  useEffect(() => {
    if (typeof window !== 'undefined' && auth && !window.bazarRecaptchaVerifier) {
      try {
        window.bazarRecaptchaVerifier = new RecaptchaVerifier(auth, 'bazar-recaptcha-container', {
          size: 'invisible',
          callback: () => {
            // reCAPTCHA solved
          },
          'expired-callback': () => {
            setErrorMsg('reCAPTCHA expired. Please try again.');
          }
        });
      } catch (err) {
        console.warn('reCAPTCHA init error:', err);
      }
    }

    return () => {
      if (window.bazarRecaptchaVerifier) {
        try {
          window.bazarRecaptchaVerifier.clear();
          window.bazarRecaptchaVerifier = undefined;
        } catch {}
      }
    };
  }, []);

  const formatPhoneNumber = (val: string) => {
    const cleaned = val.replace(/\D/g, '');
    if (cleaned.length <= 10) return cleaned;
    return cleaned.slice(0, 10);
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length !== 10) {
      setErrorMsg('कृपया वैध १०-अंकी मोबाईल नंबर टाका (Please enter valid 10-digit number)');
      return;
    }

    if (!auth || !window.bazarRecaptchaVerifier) {
      setErrorMsg('Authentication system is currently initializing. Please refresh.');
      return;
    }

    setLoading(true);
    const fullNumber = `+91${cleaned}`;

    try {
      const confirmation = await signInWithPhoneNumber(
        auth, 
        fullNumber, 
        window.bazarRecaptchaVerifier
      );
      setConfirmationResult(confirmation);
      setStep('OTP');
      toast({
        title: 'OTP पाठवला (OTP Sent)',
        description: `तुमच्या ${fullNumber} नंबरवर ६-अंकी पडताळणी कोड पाठवला आहे.`,
      });
    } catch (err: any) {
      console.error('Phone auth error:', err);
      setErrorMsg(err.message || 'OTP पाठवण्यात त्रुटी आली. कृपया पुन्हा प्रयत्न करा.');
      if (window.bazarRecaptchaVerifier) {
        try {
          window.bazarRecaptchaVerifier.render().then((widgetId) => {
            (window as any).grecaptcha?.reset(widgetId);
          });
        } catch {}
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!confirmationResult) {
      setErrorMsg('सत्र कालबाह्य झाले. कृपया पुन्हा OTP मागवा.');
      setStep('PHONE');
      return;
    }

    if (verificationCode.trim().length !== 6) {
      setErrorMsg('कृपया ६-अंकी OTP टाका (Enter 6-digit OTP)');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await confirmationResult.confirm(verificationCode);
      const user = userCredential.user;

      dispatch(setUser({
        uid: user.uid,
        email: user.email || '',
        phone: user.phoneNumber || '',
        role: 'owner', // Default merchant owner role in unified platform
        displayName: user.displayName || 'Bazar Merchant',
      } as any));

      toast({
        title: 'लॉगिन यशस्वी! (Login Successful)',
        description: 'व्यापारी डॅशबोर्ड लोड होत आहे...',
      });

      router.push(redirectUrl);
    } catch (err: any) {
      console.error('OTP confirmation failed:', err);
      setErrorMsg('अवैध OTP कोड. कृपया तपासणी करून पुन्हा टाका.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!auth) return;
    setLoading(true);
    setErrorMsg('');

    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;

      dispatch(setUser({
        uid: user.uid,
        email: user.email || '',
        phone: user.phoneNumber || '',
        role: 'owner',
        displayName: user.displayName || 'Bazar Merchant',
      } as any));

      toast({
        title: 'लॉगिन यशस्वी!',
        description: 'स्वागत आहे! व्यापारी पोर्टल उघडत आहे.',
      });

      router.push(redirectUrl);
    } catch (err: any) {
      console.error('Google sign in error:', err);
      setErrorMsg(err.message || 'Google लॉगिन अयशस्वी झाले.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAF9] flex flex-col justify-center items-center px-4 py-12 selection:bg-emerald-100">
      <div id="bazar-recaptcha-container" />

      {/* Header Branding */}
      <div className="mb-6 flex flex-col items-center text-center">
        <Link href="/bazar" className="inline-flex items-center gap-2.5 mb-2 group">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 group-hover:scale-105 transition-transform">
            <Store className="w-6 h-6" />
          </div>
          <div className="text-left">
            <span className="text-xl font-bold tracking-tight text-slate-900 block leading-tight">
              Palus Local Bazar
            </span>
            <span className="text-xs text-emerald-700 font-semibold uppercase tracking-wider block">
              व्यापारी पोर्टल (Merchant OS)
            </span>
          </div>
        </Link>
        <p className="text-xs text-slate-500 max-w-xs mt-1">
          स्थानिक दुकाने, सुपरमार्केट आणि शेतकरी उत्पादक व्यवस्थापन
        </p>
      </div>

      <Card className="w-full max-w-md bg-white border border-slate-200 shadow-xl rounded-2xl overflow-hidden">
        <CardHeader className="bg-gradient-to-b from-emerald-50/60 to-white pb-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-1">
            <Badge variant="outline" className="border-emerald-200 text-emerald-800 bg-emerald-50/80 font-medium text-xs">
              <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-600" /> सुरक्षित लॉगिन
            </Badge>
            <span className="text-[11px] font-semibold text-slate-400">
              {step === 'PHONE' ? 'पायरी १/२' : 'पायरी २/२'}
            </span>
          </div>
          <CardTitle className="text-xl font-bold text-slate-900">
            {step === 'PHONE' ? 'दुकानदार लॉगिन' : 'OTP पडताळणी'}
          </CardTitle>
          <CardDescription className="text-xs text-slate-600">
            {step === 'PHONE' 
              ? 'आपल्या नोंदणीकृत मोबाईल नंबरने डॅशबोर्डमध्ये प्रवेश करा.' 
              : `+91 ${phoneNumber} वर पाठवलेला ६-अंकी OTP टाका.`}
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6">
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {step === 'PHONE' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs font-semibold text-slate-700">
                  मोबाईल नंबर (Mobile Number)
                </Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-sm font-semibold border-r border-slate-200 pr-2 my-1.5">
                    +91
                  </div>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="98765 43210"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(formatPhoneNumber(e.target.value))}
                    disabled={loading}
                    className="pl-16 h-12 rounded-xl text-base tracking-wide border-slate-200 focus-visible:ring-emerald-500 font-medium"
                    autoFocus
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  तुम्हाला WhatsApp / SMS द्वारे तात्काळ पडताळणी कोड पाठवला जाईल.
                </p>
              </div>

              <Button
                type="submit"
                disabled={loading || phoneNumber.length !== 10}
                className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    OTP पाठवत आहे...
                  </>
                ) : (
                  <>
                    OTP मागवा (Get OTP)
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-slate-400 font-semibold tracking-wider">
                    किंवा
                  </span>
                </div>
              </div>

              {/* Google One-Tap */}
              <Button
                type="button"
                variant="outline"
                disabled={loading}
                onClick={handleGoogleSignIn}
                className="w-full h-11 border-slate-200 hover:bg-slate-50 text-slate-700 font-medium rounded-xl text-xs flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                Google खात्याद्वारे लॉगिन करा
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="otp" className="text-xs font-semibold text-slate-700">
                    ६-अंकी OTP कोड (6-Digit OTP)
                  </Label>
                  <button
                    type="button"
                    onClick={() => { setStep('PHONE'); setErrorMsg(''); }}
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold"
                  >
                    नंबर बदला
                  </button>
                </div>
                <Input
                  id="otp"
                  type="text"
                  maxLength={6}
                  placeholder="••••••"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  disabled={loading}
                  className="h-12 rounded-xl text-center text-xl tracking-[0.4em] font-mono border-slate-200 focus-visible:ring-emerald-500 font-bold"
                  autoFocus
                />
              </div>

              <Button
                type="submit"
                disabled={loading || verificationCode.length !== 6}
                className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    तपासणी चालू आहे...
                  </>
                ) : (
                  <>
                    पडताळणी करा आणि लॉगिन व्हा (Verify & Enter)
                    <CheckCircle2 className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>
          )}

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>नवीन व्यापारी आहात?</span>
            <Link href="/bazar" className="font-semibold text-emerald-600 hover:text-emerald-700">
              मुख्य दुकाने ब्राउझ करा →
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
