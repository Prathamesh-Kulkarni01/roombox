'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Download, Loader2, CheckCircle, Smartphone } from 'lucide-react'
import Image from 'next/image'
import { useAppSelector } from '@/lib/hooks'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
}

export default function DownloadPage() {
  const { currentUser } = useAppSelector((state) => state.user)
  const { selectedPgId } = useAppSelector((state) => state.app)

  const [brand, setBrand] = useState({
    name: 'RentSutra App',
    logo: '/icons/icon-192x192.png',
    description: 'Fast rental management directly on your phone.'
  })

  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)

  const [isInstalled, setIsInstalled] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)
  const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop'>(
    'desktop'
  )

  useEffect(() => {
    const fetchBranding = async () => {
      let query = '';
      let activeSubdomain = '';

      if (typeof window !== 'undefined') {
        const host = window.location.hostname;
        const parts = host.split('.');
        if (parts.length >= 3 || (parts.length === 2 && parts[1] === 'localhost')) {
          const domainSub = parts[0];
          if (domainSub !== 'www' && domainSub !== 'rentvastu' && domainSub !== 'roombox' && domainSub !== 'localhost') {
            activeSubdomain = domainSub;
          }
        }
        if (!activeSubdomain) {
          activeSubdomain = sessionStorage.getItem('pwa_subdomain') || '';
        }
      }

      if (currentUser?.id) {
        if (currentUser.role === 'owner' || currentUser.role === 'admin') {
          query = `?ownerId=${currentUser.id}`;
        } else if (currentUser.role === 'tenant') {
          const activeTenancy = currentUser.activeTenancies?.find((t: any) => (t as any).pgId === selectedPgId) || currentUser.activeTenancies?.[0];
          if (activeTenancy?.ownerId) {
            query = `?ownerId=${activeTenancy.ownerId}`;
          }
        }
      } else if (activeSubdomain) {
        query = `?subdomain=${activeSubdomain}`;
      }

      try {
        const res = await fetch(`/api/pwa/manifest${query}`);
        if (res.ok) {
          const data = await res.json();
          setBrand({
            name: data.name || 'RentSutra App',
            logo: data.icons?.[0]?.src || '/icons/icon-192x192.png',
            description: data.description || 'Fast rental management directly on your phone.'
          });
        }
      } catch (e) {
        console.error('Failed to fetch PWA branding:', e);
      }
    };

    fetchBranding();
  }, [currentUser, selectedPgId]);

  useEffect(() => {
    const ua = window.navigator.userAgent.toLowerCase()

    if (/iphone|ipad|ipod/.test(ua)) setPlatform('ios')
    else if (/android/.test(ua)) setPlatform('android')
    else setPlatform('desktop')

    // detect installed
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone
    ) {
      setIsInstalled(true)
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      console.log('PWA install available')
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setIsInstalling(false)
      console.log('PWA installed')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      )
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    // Android install flow
    if (deferredPrompt) {
      setIsInstalling(true)

      deferredPrompt.prompt()

      const { outcome } = await deferredPrompt.userChoice

      if (outcome === 'accepted') {
        setIsInstalled(true)
      }

      setIsInstalling(false)
      setDeferredPrompt(null)
      return
    }

    // fallback instructions
    if (platform === 'android') {
      alert("Tap the 3-dot menu in Chrome and choose 'Add to Home Screen'")
    } else if (platform === 'desktop') {
      alert("Use your browser menu and click 'Install App'")
    }
  }

  const handleOpenApp = () => {
    window.location.href = '/dashboard'
  }

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-2 shadow-xl border-primary/20 overflow-hidden">

          <div className="bg-primary/5 px-6 py-8 text-center border-b border-primary/10">

            <div className="w-20 h-20 bg-white rounded-2xl shadow-md flex items-center justify-center mx-auto mb-6 overflow-hidden p-2">
              <img
                src={brand.logo}
                alt={`${brand.name} Logo`}
                className="w-full h-full object-contain"
              />
            </div>

            <h1 className="text-3xl font-bold tracking-tight mb-2">
              {brand.name}
            </h1>

            <p className="text-muted-foreground">
              {brand.description}
            </p>
          </div>

          <CardContent className="p-8 text-center">

            {isInstalled ? (
              <div className="flex flex-col items-center">

                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>

                <h3 className="text-xl font-bold mb-2">
                  App Installed
                </h3>

                <p className="text-muted-foreground mb-6">
                  {brand.name} is ready to use.
                </p>

                <Button
                  size="lg"
                  className="w-full h-14 text-lg rounded-xl"
                  onClick={handleOpenApp}
                >
                  Open App
                </Button>

              </div>
            ) : (
              <div className="flex flex-col items-center">

                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Download className="w-8 h-8 text-primary" />
                </div>

                <h3 className="text-xl font-bold mb-2">
                  Install App
                </h3>

                <p className="text-muted-foreground mb-6">
                  Install {brand.name} for the best experience.
                </p>

                {platform === 'ios' ? (
                  <div className="bg-accent/50 p-4 rounded-xl text-left">

                    <p className="font-semibold flex items-center gap-2 mb-2">
                      <Smartphone className="w-5 h-5 text-primary" />
                      iPhone Users
                    </p>

                    <p className="text-sm text-muted-foreground">
                      Tap the <b>Share</b> button in Safari and choose
                      <b> Add to Home Screen</b>.
                    </p>

                  </div>
                ) : (
                  <Button
                    size="lg"
                    className="w-full h-14 text-lg rounded-xl"
                    onClick={handleInstallClick}
                    disabled={isInstalling}
                  >
                    {isInstalling ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Installing...
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-5 w-5" />
                        Install App
                      </>
                    )}
                  </Button>
                )}

                {!deferredPrompt && platform === 'android' && (
                  <p className="text-xs text-muted-foreground mt-4">
                    If install doesn't start, open this page in Chrome and use
                    "Add to Home Screen".
                  </p>
                )}

              </div>
            )}

          </CardContent>

        </Card>
      </main>
    </div>
  )
}