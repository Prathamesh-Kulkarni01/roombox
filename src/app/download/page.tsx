
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, Loader2, CheckCircle, Smartphone } from 'lucide-react';
import Image from 'next/image';

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
    const [isInstalling, setIsInstalling] = useState(false);
    const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop' | null>(null);

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

        const handleAppInstalled = () => {
            setIsInstalled(true);
            setIsInstalling(false);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) {
            // Fallback instruction if prompt isn't available
            alert("App install prompt not available. Please install from your browser menu.");
            return;
        }
        setIsInstalling(true);
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setIsInstalled(true);
        }
        setIsInstalling(false);
        setDeferredPrompt(null);
    };

    const handleOpenApp = () => {
        window.location.href = '/dashboard';
    };

    return (
        <div className="min-h-screen bg-muted/30 flex flex-col">
            <main className="flex-1 flex items-center justify-center p-4">
                <Card className="max-w-md w-full border-2 shadow-xl border-primary/20 overflow-hidden">
                    <div className="bg-primary/5 px-6 py-8 text-center border-b border-primary/10">
                        <div className="w-20 h-20 bg-white rounded-2xl shadow-md flex items-center justify-center mx-auto mb-6 overflow-hidden">
                            <Image src="/icons/icon-192x192.png" alt="RentSutra Logo" width={80} height={80} className="object-cover" />
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight mb-2">RentSutra App</h1>
                        <p className="text-muted-foreground">
                            Fast, secure, and reliable rental management on your device.
                        </p>
                    </div>

                    <CardContent className="p-8 text-center">
                        {isInstalled ? (
                            <div className="flex flex-col items-center">
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                                    <CheckCircle className="w-8 h-8 text-green-600" />
                                </div>
                                <h3 className="text-xl font-bold mb-2">App Installed</h3>
                                <p className="text-muted-foreground mb-6">
                                    RentSutra is already installed and ready to use.
                                </p>
                                <Button size="lg" className="w-full text-lg h-14 rounded-xl" onClick={handleOpenApp}>
                                    Open App
                                </Button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center">
                                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                                    <Download className="w-8 h-8 text-primary" />
                                </div>
                                <h3 className="text-xl font-bold mb-2">Install App</h3>
                                <p className="text-muted-foreground mb-6">
                                    Get the native app experience for your device.
                                </p>
                                
                                {platform === 'ios' ? (
                                    <div className="bg-accent/50 p-4 rounded-xl w-full text-left">
                                        <p className="font-semibold flex items-center gap-2 mb-2">
                                            <Smartphone className="w-5 h-5 text-primary" /> iOS Users:
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            Tap the <strong>Share</strong> button in Safari, then tap <strong>"Add to Home Screen"</strong> to install.
                                        </p>
                                    </div>
                                ) : (
                                    <Button 
                                        size="lg" 
                                        className="w-full text-lg h-14 rounded-xl shadow-lg hover:shadow-xl transition-all" 
                                        onClick={handleInstallClick}
                                        disabled={isInstalling || (!deferredPrompt && platform !== 'desktop')}
                                    >
                                        {isInstalling ? (
                                            <>
                                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                                Installing...
                                            </>
                                        ) : (
                                            <>
                                                <Download className="mr-2 h-5 w-5" />
                                                Install Now
                                            </>
                                        )}
                                    </Button>
                                )}
                                
                                {platform !== 'ios' && !deferredPrompt && !isInstalling && !isInstalled && (
                                    <p className="text-xs text-muted-foreground mt-4">
                                        If the install button doesn't work, install from your browser's menu (Add to Home Screen).
                                    </p>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
