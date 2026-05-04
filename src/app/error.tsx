"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCcw, Home, ArrowLeft, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function Error({ error, reset }: ErrorProps) {
  const router = useRouter();
  const { toast } = useToast();

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

      {/* Copy Error Option */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          const errorText = `Message: ${error.message}${error.digest ? `\nDigest: ${error.digest}` : ""}${error.stack ? `\n\nStack: ${error.stack}` : ""}`;
          navigator.clipboard.writeText(errorText);
          toast({
            title: "Error copied to clipboard",
            description: "You can now share this with the support team.",
          });
        }}
        className="mt-6 h-8 gap-1.5 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground transition-all hover:bg-muted/50 hover:text-foreground"
      >
        <Copy size={12} />
        Copy Error
      </Button>

      {/* Dev Error Details */}
      {process.env.NODE_ENV === "development" && (
        <div className="mt-12 w-full max-w-2xl overflow-hidden rounded-lg border bg-muted/50 text-left text-xs font-mono">
          <div className="flex items-center justify-between border-b bg-muted/80 px-4 py-2">
            <p className="font-bold text-destructive">Error Detail (Dev Only):</p>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-2 px-2 text-[10px] uppercase tracking-wider hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                const errorText = `Message: ${error.message}\n\nStack: ${error.stack || "No stack trace available"}`;
                navigator.clipboard.writeText(errorText);
                toast({
                  title: "Error copied to clipboard",
                  description: "You can now share this with the development team.",
                });
              }}
            >
              <Copy size={12} />
              Copy Error
            </Button>
          </div>
          <div className="max-h-[300px] overflow-auto p-4">
            <pre className="whitespace-pre-wrap break-all font-bold text-destructive">
              {error.message}
            </pre>
            {error.stack && (
              <pre className="mt-2 whitespace-pre-wrap break-all opacity-50">
                {error.stack}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
