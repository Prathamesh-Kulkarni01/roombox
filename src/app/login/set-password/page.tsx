"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithCustomToken } from "firebase/auth";
import { auth, isFirebaseConfigured } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";

function SetPasswordContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const token = searchParams.get("token");

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isFirebaseConfigured() || !auth) {
            setError("Firebase is not configured. Cannot securely sign in.");
            return;
        }

        if (!token) {
            setError("No setup token found in the URL. Please use the link provided in your WhatsApp message.");
            return;
        }

        if (password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const response = await fetch("/api/auth/set-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, password }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || data.message || "Failed to set password.");
            }

            // Sign in with the Custom Token
            await signInWithCustomToken(auth, data.customToken);

            toast({
                title: "Password Set & Logged In!",
                description: "Your password has been saved. Redirecting to your dashboard...",
            });

            router.push("/tenants/my-pg");
        } catch (err: any) {
            console.error("Set Password Error:", err);
            setError(err.message || "Failed to set password. The link may be invalid or expired.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!token && !error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-56px)] text-center p-4">
                <AlertCircle className="w-16 h-16 text-destructive mb-4" />
                <h1 className="text-2xl font-bold mb-2">Invalid Link</h1>
                <p className="text-muted-foreground mb-6 max-w-sm">
                    No setup token found in the URL. Please use the exact link sent to you via WhatsApp.
                </p>
                <Button asChild>
                    <Link href="/login">Go to Login</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-56px)] bg-background p-4">
            <Card className="w-full max-w-sm">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl pt-4">Set Your Password</CardTitle>
                    <CardDescription>
                        Please choose a password to securely access your tenant portal in the future.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="grid gap-4">
                        {error && (
                            <div className="p-3 bg-red-100 text-red-700 text-sm rounded-md flex items-start">
                                <AlertCircle className="w-4 h-4 mr-2 mt-0.5 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}
                        <div className="grid gap-2">
                            <Label htmlFor="password">New Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="At least 6 characters"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={isSubmitting}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="confirmPassword">Confirm Password</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                placeholder="Retype your password"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                disabled={isSubmitting}
                            />
                        </div>

                        <Button type="submit" className="w-full" disabled={isSubmitting || !password || !confirmPassword}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Save Password & Access Portal
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

export default function SetPasswordPage() {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-56px)] text-center p-4">
                <Loader2 className="w-16 h-16 text-primary animate-spin mb-4" />
                <h1 className="text-2xl font-bold mb-2">Loading...</h1>
            </div>
        }>
            <SetPasswordContent />
        </Suspense>
    );
}
