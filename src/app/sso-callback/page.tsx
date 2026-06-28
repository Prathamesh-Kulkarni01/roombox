'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useFirebaseTenant } from '@/context/firebase-tenant-context';
import { signInWithCustomToken } from 'firebase/auth';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

function SSOCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const { auth } = useFirebaseTenant();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get('token');
    const returnUrl = searchParams.get('returnUrl') || '/';

    if (!token) {
      setError('Missing authentication token.');
      return;
    }

    const performLogin = async () => {
      try {
        if (!auth) throw new Error('Firebase Auth not initialized');
        await signInWithCustomToken(auth!, token);
        toast({
          title: "Session Synced",
          description: "Logged in successfully.",
        });
        router.replace(returnUrl);
      } catch (err) {
        console.error('[SSO Callback Error]', err);
        setError('Failed to authenticate. Redirecting to login...');
        setTimeout(() => {
          router.replace('/login');
        }, 1500);
      }
    };

    performLogin();
  }, [searchParams, router, toast]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <h2 className="text-xl font-bold text-red-600 mb-2">Sync Error</h2>
        <p className="text-slate-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
      <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
      <h2 className="text-xl font-semibold text-slate-800">Finalizing login...</h2>
      <p className="text-sm text-slate-500 mt-2">Creating local session context.</p>
    </div>
  );
}

export default function SSOCallbackPage() {
    const { auth } = useFirebaseTenant();
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <h2 className="text-xl font-semibold text-slate-800">Connecting session...</h2>
      </div>
    }>
      <SSOCallbackContent />
    </Suspense>
  );
}
