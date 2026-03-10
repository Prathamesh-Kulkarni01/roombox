"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithCustomToken } from "firebase/auth";
import { auth, isFirebaseConfigured } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";

function MagicLoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const token = searchParams.get("token");

    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState("Verifying your login link...");

    useEffect(() => {
        const verifyMagicLink = async () => {
            if (!isFirebaseConfigured() || !auth) {
                setError("Firebase is not configured on this client. Cannot securely sign in.");
                return;
            }

            if (!token) {
                setError("No login token found in the URL. Please use the link provided in your WhatsApp message.");
                return;
            }

            try {
                setMessage("Authenticating securely...");

                // Call the backend to verify the token and get a Firebase Custom Token
                const response = await fetch("/api/auth/magic-login", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ token }),
                });

                const data = await response.json();

                if (!response.ok || !data.success) {
                    throw new Error(data.message || data.error?.message || "Failed to verify magic link.");
                }

                const { customToken, requirePasswordSet } = data;

                if (requirePasswordSet) {
                    toast({
                        title: "Action Required",
                        description: "Please set a password to continue.",
                    });
                    router.push(`/login/set-password?token=${token}`);
                    return;
                }

                // Sign in with the Custom Token on the client side
                await signInWithCustomToken(auth, customToken);

                toast({
                    title: "Welcome Back!",
                    description: "You have been fully signed in. Redirecting to your dashboard...",
                });

                // The root layout's AuthHandler will detect the auth state change
                // and correctly route the user to `/tenants` based on their role/guestId.
                // We'll push them to `/tenants` proactively but the root layout will
                // redirect if they don't have the explicit role.
                router.push("/tenants");
            } catch (err: any) {
                console.error("[MagicLogin] Verification Error:", err);
                setError(err.message || "Failed to sign in. The link may be invalid, expired, or already used.");
            }
        };

        verifyMagicLink();
    }, [router, token, toast]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-56px)] text-center p-4">
            {error ? (
                <>
                    <AlertCircle className="w-16 h-16 text-destructive mb-4" />
                    <h1 className="text-2xl font-bold mb-2">Login Failed</h1>
                    <p className="text-muted-foreground mb-6 max-w-sm">{error}</p>
                    <div className="flex gap-4">
                        <Button asChild onClick={() => router.push("/login")}>
                            <Link href="/login">Go to Standard Login</Link>
                        </Button>
                    </div>
                </>
            ) : (
                <>
                    <Loader2 className="w-16 h-16 text-primary animate-spin mb-4" />
                    <h1 className="text-2xl font-bold mb-2">{message}</h1>
                    <p className="text-muted-foreground max-w-sm">
                        Please wait while we establish a secure session to your portal.
                    </p>
                </>
            )}
        </div>
    );
}

export default function MagicLoginPage() {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-56px)] text-center p-4">
                <Loader2 className="w-16 h-16 text-primary animate-spin mb-4" />
                <h1 className="text-2xl font-bold mb-2">Loading...</h1>
            </div>
        }>
            <MagicLoginContent />
        </Suspense>
    );
}
