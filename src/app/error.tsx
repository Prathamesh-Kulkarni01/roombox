'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Root Error Boundary caught an error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 flex animate-bounce items-center justify-center rounded-full bg-destructive/10 p-6 text-destructive">
        <AlertTriangle size={48} />
      </div>
      <h1 className="mb-2 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
        Something went wrong!
      </h1>
      <p className="mb-8 max-w-md text-muted-foreground">
        We apologize for the inconvenience. An unexpected error occurred. Our team has been notified.
      </p>
      <div className="flex flex-col gap-4 sm:flex-row">
        <Button
          onClick={() => reset()}
          variant="default"
          className="flex items-center gap-2"
        >
          <RefreshCcw size={18} />
          Try again
        </Button>
        <Button variant="outline" asChild className="flex items-center gap-2">
          <Link href="/">
            <Home size={18} />
            Back to Home
          </Link>
        </Button>
      </div>
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-12 max-w-2xl overflow-auto rounded-lg bg-muted p-4 text-left text-xs font-mono">
          <p className="mb-2 font-bold text-destructive underline">Error Detail (Dev Only):</p>
          <pre>{error.message}</pre>
          {error.stack && <pre className="mt-2 opacity-50">{error.stack}</pre>}
        </div>
      )}
    </div>
  );
}
