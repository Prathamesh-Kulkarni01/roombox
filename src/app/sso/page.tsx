'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useFirebaseTenant } from '@/context/firebase-tenant-context';
import { onAuthStateChanged } from 'firebase/auth';
import { Loader2 } from 'lucide-react';

function SSOProviderContent() {
  const searchParams = useSearchParams();
  const { auth } = useFirebaseTenant();
  const [status, setStatus] = useState('Checking credentials...');

  useEffect(() => {
    if (!auth) {
      setStatus('Auth SDK failed to initialize.');
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      const target = searchParams.get('target');
      const returnUrl = searchParams.get('returnUrl') || '/';

      if (!target) {
        setStatus('Invalid request: Missing target subdomain.');
        return;
      }

      // STRICT target validation to prevent open-redirect phishing attacks
      const allowedDomains = ['rentsutra.in', 'dev.rentsutra.in', 'localhost:9002', 'roombox.in'];
      const isValidTarget = allowedDomains.some(domain => 
        target === domain || target.endsWith(`.${domain}`)
      );

      if (!isValidTarget) {
        setStatus('Security Error: Invalid or untrusted redirect target.');
        return;
      }

      // Ensure returnUrl is relative to prevent open redirect attacks via returnUrl
      if (returnUrl.startsWith('http://') || returnUrl.startsWith('https://') || returnUrl.startsWith('//')) {
        setStatus('Security Error: Invalid return URL format.');
        return;
      }

      if (!user) {
        // Redirect to standard login with return url pointing back here
        const currentUrl = new URL(window.location.href);
        const encodedReturn = encodeURIComponent(currentUrl.pathname + currentUrl.search);
        window.location.href = `/login?returnUrl=${encodedReturn}`;
        return;
      }

      try {
        setStatus('Syncing session across subdomains...');
        const idToken = await user.getIdToken();
        const response = await fetch('/api/auth/sso-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`,
          },
        });

        if (!response.ok) throw new Error('Token verification failed');

        const { customToken } = await response.json();
        const callbackUrl = `https://${target}/sso-callback?token=${encodeURIComponent(customToken)}&returnUrl=${encodeURIComponent(returnUrl)}`;
        window.location.href = callbackUrl;
      } catch (err) {
        console.error(err);
        setStatus('SSO Handshake failed. Redirecting to login...');
        window.location.href = `/login`;
      }
    });

    return () => unsubscribe();
  }, [searchParams]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
      <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
      <h2 className="text-xl font-semibold text-slate-800">{status}</h2>
      <p className="text-sm text-slate-500 mt-2">Connecting secure PG session...</p>
    </div>
  );
}

export default function SSOProviderPage() {
    const { auth } = useFirebaseTenant();
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <h2 className="text-xl font-semibold text-slate-800">Loading SSO Service...</h2>
      </div>
    }>
      <SSOProviderContent />
    </Suspense>
  );
}
