"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function ForgotPasswordPage() {
    const router = useRouter();
    const { toast } = useToast();

    const [phone, setPhone] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!phone) {
            toast({ variant: "destructive", title: "Error", description: "Phone number is required" });
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to send reset link.");
            }

            setIsSuccess(true);
            toast({ title: "Link Sent!", description: data.message });
        } catch (error: any) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="flex items-center justify-center min-h-[calc(100vh-56px)] bg-background p-4">
                <Card className="w-full max-w-sm text-center">
                    <CardHeader>
                        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <CardTitle className="text-2xl">Check WhatsApp</CardTitle>
                        <CardDescription>
                            We've sent a secure login link to your WhatsApp number. Click it to reset your password and access your dashboard.
                        </CardDescription>
                    </CardHeader>
                    <CardFooter className="flex justify-center">
                        <Button variant="outline" asChild>
                            <Link href="/login">Return to Login</Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-56px)] bg-background p-4">
            <Card className="w-full max-w-sm">
                <CardHeader className="text-center relative">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute left-2 top-2"
                        asChild
                    >
                        <Link href="/login">
                            <ArrowLeft className="h-4 w-4" />
                            <span className="sr-only">Back</span>
                        </Link>
                    </Button>
                    <CardTitle className="text-2xl pt-4">Reset Password</CardTitle>
                    <CardDescription>
                        Enter your registered WhatsApp number. We will send you a secure link to jump right back into your account and reset your password.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="phone">WhatsApp Number</Label>
                            <Input
                                id="phone"
                                type="tel"
                                placeholder="e.g. 9876543210"
                                required
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                disabled={isSubmitting}
                            />
                        </div>

                        <Button type="submit" className="w-full" disabled={isSubmitting || !phone}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Send Secure Login Link
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
