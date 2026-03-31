"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { signInWithCustomToken } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building2, Home, Loader2, ArrowRight, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function InvitePage() {
    const { token } = useParams();
    const router = useRouter();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [verifying, setVerifying] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [role, setRole] = useState<string>("tenant");
    const [pgName, setPgName] = useState<string>("Your New Home");

    useEffect(() => {
        const fetchInviteDetails = async () => {
            try {
                const response = await fetch(`/api/auth/magic-login?token=${token}`);
                const data = await response.json();

                if (!response.ok || !data.success) {
                    throw new Error(data.error || "Invalid or expired invite link.");
                }

                setPgName(data.pgName);
                setRole(data.role || "tenant");
                setLoading(false);
            } catch (err: any) {
                console.error("Invite Fetch Error:", err);
                setError(err.message);
                setLoading(false);
            }
        };

        if (token) fetchInviteDetails();
    }, [token]);

    const handleAcceptInvite = () => {
        router.push(`/login/set-password?token=${token}`);
    };


    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh]">
                <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                <p className="text-muted-foreground animate-pulse">Setting up your welcome mat...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
                <Card className="max-w-md w-full border-destructive/20 shadow-2xl">
                    <CardHeader className="text-center">
                        <div className="mx-auto bg-destructive/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                            <Home className="w-8 h-8 text-destructive" />
                        </div>
                        <CardTitle className="text-2xl font-bold">Invite Expired</CardTitle>
                        <CardDescription>{error}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center pb-6">
                        <Button variant="outline" onClick={() => router.push("/login")}>
                            Go to Login
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden bg-background">
            {/* Background Blobs for Premium Look */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full animate-pulse-slow"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full animate-pulse-slow delay-700"></div>

            <Card className="max-w-lg w-full relative z-10 border-primary/10 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.1)] bg-card/50 backdrop-blur-xl">
                <CardHeader className="text-center pt-10 pb-6">
                    <div className="mx-auto bg-primary/10 w-20 h-20 rounded-2xl flex items-center justify-center mb-6 rotate-3 hover:rotate-0 transition-transform duration-500 shadow-inner">
                        <Building2 className="w-10 h-10 text-primary" />
                    </div>
                    <CardTitle className="text-3xl font-extrabold tracking-tight mb-2">
                        Welcome to {pgName}
                    </CardTitle>
                    <CardDescription className="text-lg">
                        Your host has invited you to join the digital community on RentSutra.
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-8 pb-10">
                    <div className="grid grid-cols-1 gap-4">
                        {role === 'tenant' ? (
                            <>
                                <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 border border-border/50">
                                    <div className="bg-green-500/10 p-2 rounded-full">
                                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                                    </div>
                                    <span className="text-sm font-medium">Access your digital rent passbook</span>
                                </div>
                                <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 border border-border/50">
                                    <div className="bg-green-500/10 p-2 rounded-full">
                                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                                    </div>
                                    <span className="text-sm font-medium">Raise complaints & track repairs</span>
                                </div>
                                <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 border border-border/50">
                                    <div className="bg-green-500/10 p-2 rounded-full">
                                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                                    </div>
                                    <span className="text-sm font-medium">Verify your KYC documents securely</span>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 border border-border/50">
                                    <div className="bg-blue-500/10 p-2 rounded-full">
                                        <CheckCircle2 className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <span className="text-sm font-medium">Manage property operations digitally</span>
                                </div>
                                <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 border border-border/50">
                                    <div className="bg-blue-500/10 p-2 rounded-full">
                                        <CheckCircle2 className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <span className="text-sm font-medium">Access owner dashboards & tools</span>
                                </div>
                                <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 border border-border/50">
                                    <div className="bg-blue-500/10 p-2 rounded-full">
                                        <CheckCircle2 className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <span className="text-sm font-medium">Coordinate with team & guests</span>
                                </div>
                            </>
                        )}
                    </div>

                    <Button
                        size="lg"
                        className="w-full h-14 text-lg font-bold shadow-xl shadow-primary/20 group relative overflow-hidden"
                        disabled={verifying}
                        onClick={handleAcceptInvite}
                    >
                        {verifying ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Opening Doors...
                            </>
                        ) : (
                            <>
                                Accept Invite & Login
                                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </Button>

                    <p className="text-center text-xs text-muted-foreground italic">
                        By proceeding, you agree to the community guidelines.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
