
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Share, PlusSquare, ArrowUp, Monitor, CheckCircle, Info, Smartphone, Tablet } from 'lucide-react';
import Header from '@/components/header';
import { useAppSelector } from '@/lib/hooks';

interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{
        outcome: 'accepted' | 'dismissed';
        platform: string;
    }>;
    prompt(): Promise<void>;
}

export default function DownloadPage() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isInstalled, setIsInstalled] = useState(false);
    const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop' | null>(null);
    const { currentUser } = useAppSelector(state => state.user);

    useEffect(() => {
        // Detect platform
        const ua = window.navigator.userAgent.toLowerCase();
        if (/iphone|ipad|ipod/.test(ua)) {
            setPlatform('ios');
        } else if (/android/.test(ua)) {
            setPlatform('android');
        } else {
            setPlatform('desktop');
        }

        // Check if already installed
        if (typeof window !== "undefined" && (
            window.matchMedia('(display-mode: standalone)').matches ||
            (window.navigator as any).standalone ||
            document.referrer.includes('android-app://')
        )) {
            setIsInstalled(true);
        }

        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setIsInstalled(true);
        }
        setDeferredPrompt(null);
    };

    return (
        <div className="min-h-screen bg-muted/30">
            <Header />

            <main className="container max-w-4xl mx-auto px-4 py-12">
                <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-2xl mb-4">
                        <Download className="w-8 h-8 text-primary" />
                    </div>
                    <h1 className="text-4xl font-bold tracking-tight mb-4">Download RentSutra</h1>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        Install the app on your device for a faster, more reliable experience with instant notifications and offline access.
                    </p>
                </div>

                <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                    {/* Status Card */}
                    <Card className="md:col-span-2 lg:col-span-3 overflow-hidden border-2 border-primary/20">
                        <div className="bg-primary/5 px-6 py-4 flex items-center justify-between border-b border-primary/10">
                            <div className="flex items-center gap-2">
                                <Info className="w-5 h-5 text-primary" />
                                <span className="font-semibold">Current Status</span>
                            </div>
                            {isInstalled ? (
                                <span className="flex items-center gap-1 text-green-600 font-medium bg-green-50 px-3 py-1 rounded-full text-sm">
                                    <CheckCircle className="w-4 h-4" /> App Installed
                                </span>
                            ) : (
                                <span className="text-muted-foreground text-sm">Not installed yet</span>
                            )}
                        </div>
                        <CardContent className="p-6">
                            {isInstalled ? (
                                <div className="flex flex-col items-center text-center py-4">
                                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                                        <CheckCircle className="w-8 h-8 text-green-600" />
                                    </div>
                                    <h3 className="text-xl font-bold mb-2">You're all set!</h3>
                                    <p className="text-muted-foreground">
                                        RentSutra is already installed on your device. You can open it from your home screen or app drawer.
                                    </p>
                                    <Button className="mt-6" variant="outline" onClick={() => window.location.href = '/'}>
                                        Go to Dashboard
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex flex-col md:flex-row items-center gap-6">
                                    <div className="flex-1">
                                        <h3 className="text-xl font-bold mb-2">Ready to Install?</h3>
                                        <p className="text-muted-foreground">
                                            Get the best experience by installing RentSutra as a mobile app. It takes up almost no space and works just like a native app.
                                        </p>
                                    </div>
                                    <div className="shrink-0">
                                        {platform === 'android' && deferredPrompt && (
                                            <Button size="lg" onClick={handleInstallClick} className="w-full md:w-auto shadow-lg hover:shadow-xl transition-all">
                                                <Download className="mr-2 h-5 w-5" /> Install Now
                                            </Button>
                                        )}
                                        {platform === 'ios' && (
                                            <div className="bg-accent p-4 rounded-lg flex items-start gap-3">
                                                <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                                                <p className="text-sm">iOS users: Tap <Share className="inline w-4 h-4" /> then "Add to Home Screen"</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Android Instructions */}
                    <Card className={platform === 'android' ? 'border-primary' : ''}>
                        <CardHeader>
                            <div className="flex items-center gap-2 mb-2 text-primary">
                                <Smartphone className="w-5 h-5" />
                                <span className="text-xs font-bold uppercase tracking-wider">Android</span>
                            </div>
                            <CardTitle>Google Chrome</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <ol className="space-y-3 text-sm list-decimal list-inside">
                                <li>Open RentSutra in Chrome</li>
                                <li>Tap the <Download className="inline w-4 h-4 mx-1" /> "Install App" button above</li>
                                <li>Or tap the three dots (<span className="font-bold">⋮</span>)</li>
                                <li>Select <span className="font-semibold">"Install app"</span></li>
                            </ol>
                        </CardContent>
                    </Card>

                    {/* iOS Instructions */}
                    <Card className={platform === 'ios' ? 'border-primary' : ''}>
                        <CardHeader>
                            <div className="flex items-center gap-2 mb-2 text-primary">
                                <Smartphone className="w-5 h-5" />
                                <span className="text-xs font-bold uppercase tracking-wider">iOS (iPhone/iPad)</span>
                            </div>
                            <CardTitle>Safari Browser</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <ol className="space-y-3 text-sm list-decimal list-inside">
                                <li>Open RentSutra in Safari</li>
                                <li>Tap the <Share className="inline w-4 h-4 mx-1" /> "Share" button</li>
                                <li>Scroll down and tap <PlusSquare className="inline w-4 h-4 mx-1" /> <span className="font-semibold">"Add to Home Screen"</span></li>
                                <li>Tap <span className="font-semibold">"Add"</span> in the top right</li>
                            </ol>
                        </CardContent>
                    </Card>

                    {/* Desktop Instructions */}
                    <Card className={platform === 'desktop' ? 'border-primary' : ''}>
                        <CardHeader>
                            <div className="flex items-center gap-2 mb-2 text-primary">
                                <Monitor className="w-5 h-5" />
                                <span className="text-xs font-bold uppercase tracking-wider">Desktop</span>
                            </div>
                            <CardTitle>Chrome/Edge</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <ol className="space-y-3 text-sm list-decimal list-inside">
                                <li>Open RentSutra in your browser</li>
                                <li>Look for the <Download className="inline w-4 h-4 mx-1" /> icon in the address bar</li>
                                <li>Click <span className="font-semibold">"Install"</span> when prompted</li>
                                <li>RentSutra will now open in its own window</li>
                            </ol>
                        </CardContent>
                    </Card>
                </div>

                <div className="mt-16 text-center">
                    <h2 className="text-2xl font-bold mb-4">Why install the app?</h2>
                    <div className="grid gap-6 md:grid-cols-3">
                        <div className="p-6 bg-background rounded-xl border">
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <ArrowUp className="w-5 h-5 text-primary" />
                            </div>
                            <h4 className="font-bold mb-2">Faster Loading</h4>
                            <p className="text-sm text-muted-foreground">Instant access from your home screen without typing the URL every time.</p>
                        </div>
                        <div className="p-6 bg-background rounded-xl border">
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Info className="w-5 h-5 text-primary" />
                            </div>
                            <h4 className="font-bold mb-2">Better Experience</h4>
                            <p className="text-sm text-muted-foreground">Enjoy a full-screen experience without browser toolbars cluttering the view.</p>
                        </div>
                        <div className="p-6 bg-background rounded-xl border">
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle className="w-5 h-5 text-primary" />
                            </div>
                            <h4 className="font-bold mb-2">Stay Updated</h4>
                            <p className="text-sm text-muted-foreground">Receive important rent reminders and maintenance updates directly on your device.</p>
                        </div>
                    </div>
                </div>
            </main>

            <footer className="mt-20 py-10 bg-background border-t">
                <div className="container mx-auto px-4 text-center text-muted-foreground text-sm">
                    <p>© {new Date().getFullYear()} RentSutra. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
