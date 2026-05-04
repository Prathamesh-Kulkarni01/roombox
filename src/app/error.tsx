"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCcw, Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function Error({ error, reset }: ErrorProps) {
  const router = useRouter();

  useEffect(() => {
    if (process.env.NODE_ENV === "production") {
      // TODO: send to logging service (Sentry / API)
    } else {
      console.error("Root Error Boundary caught an error:", error);
    }
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      {/* Icon */}
      <div className="mb-6 flex items-center justify-center rounded-full bg-destructive/10 p-6 text-destructive">
        <AlertTriangle size={48} />
      </div>

      {/* Title */}
      <h1 className="mb-2 text-3xl font-bold tracking-tight md:text-4xl">
        Something went wrong!
      </h1>

      {/* Description */}
      <p className="mb-8 max-w-md text-muted-foreground">
        We apologize for the inconvenience. An unexpected error occurred.
      </p>

      {/* Actions */}
      <div className="flex flex-col gap-4 sm:flex-row">
        {/* Retry */}
        <Button onClick={() => reset()} className="flex items-center gap-2">
          <RefreshCcw size={18} />
          Try again
        </Button>

        {/* Home */}
        <Button
          variant="outline"
          className="flex items-center gap-2"
          onClick={() => {
            if (window.history.length > 1) {
              router.back();
            } else {
              router.push("/dashboard"); // or "/"
            }
          }}
        >
          <ArrowLeft size={18} />
          Go Back
        </Button>
      </div>

      {/* Dev Error Details */}
      {process.env.NODE_ENV === "development" && (
        <div className="mt-12 max-w-2xl overflow-auto rounded-lg bg-muted p-4 text-left text-xs font-mono">
          <p className="mb-2 font-bold text-destructive underline">
            Error Detail (Dev Only):
          </p>
          <pre>{error.message}</pre>
          {error.stack && <pre className="mt-2 opacity-50">{error.stack}</pre>}
        </div>
      )}
    </div>
  );
}
