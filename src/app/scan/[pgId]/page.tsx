'use client';

import { useEffect, useState, useTransition, useMemo } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, LogIn, LogOut, CheckCircle, AlertTriangle, ArrowLeft, WifiOff, MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// Simple UUID generator fallback
function generateUUID(): string {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
        return window.crypto.randomUUID();
    }
    return 'uuid-' + Math.random().toString(36).substring(2, 15) + '-' + Date.now().toString(36);
}

const playChime = (type: 'success' | 'error' | 'info' | 'warning') => {
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        
        if (type === 'success') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
            osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.3);
        } else if (type === 'error') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, ctx.currentTime);
            osc.frequency.setValueAtTime(120, ctx.currentTime + 0.15);
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.4);
        } else if (type === 'warning') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(293.66, ctx.currentTime); // D4
            osc.frequency.setValueAtTime(220, ctx.currentTime + 0.15); // A3
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.3);
        } else {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.frequency.setValueAtTime(440, ctx.currentTime);
            gain.gain.setValueAtTime(0.05, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.1);
        }
    } catch (e) {
        console.warn('Audio feedback failed', e);
    }
};

export default function TenantScanPage() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const pgId = params?.pgId as string;
    const zoneId = searchParams.get('zone') || 'GATE';
    const { toast } = useToast();

    // Idempotency Key generated once on mount
    const [scanId] = useState(() => generateUUID());

    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [statusData, setStatusData] = useState<any>(null);
    const [selectedType, setSelectedType] = useState<'IN' | 'OUT'>('IN');
    const [coords, setCoords] = useState<{ latitude: number | null; longitude: number | null }>({ latitude: null, longitude: null });
    const [gpsLoading, setGpsLoading] = useState(false);
    
    // Advanced Collapsible Settings
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [purpose, setPurpose] = useState<string | null>(null);
    const [isEmergency, setIsEmergency] = useState(false);

    const [showWarning, setShowWarning] = useState<string | null>(null);
    const [isLogging, startLoggingTransition] = useTransition();
    const [successLog, setSuccessLog] = useState<any>(null);
    const [isOffline, setIsOffline] = useState(false);

    // Network Sync Monitor
    useEffect(() => {
        const updateOnlineStatus = () => {
            const online = navigator.onLine;
            setIsOffline(!online);
            if (online) {
                syncOfflineQueue();
            }
        };
        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);
        updateOnlineStatus();

        return () => {
            window.removeEventListener('online', updateOnlineStatus);
            window.removeEventListener('offline', updateOnlineStatus);
        };
    }, []);

    // Load auth + profile status
    useEffect(() => {
        if (!auth) return;
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                captureGPS();
                fetchStatus(currentUser);
            } else {
                const redirectPath = encodeURIComponent(`/scan/${pgId}?zone=${zoneId}`);
                router.replace(`/login?redirect=${redirectPath}`);
            }
        });
        return () => unsubscribe();
    }, [pgId, zoneId, router]);

    const captureGPS = (): Promise<{ latitude: number | null; longitude: number | null }> => {
        return new Promise((resolve) => {
            if (!navigator.geolocation) {
                resolve({ latitude: null, longitude: null });
                return;
            }
            setGpsLoading(true);
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const newCoords = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    };
                    setCoords(newCoords);
                    setGpsLoading(false);
                    resolve(newCoords);
                },
                (error) => {
                    console.warn('GPS failed', error);
                    setGpsLoading(false);
                    resolve({ latitude: null, longitude: null });
                },
                { enableHighAccuracy: true, timeout: 5000 }
            );
        });
    };

    const fetchStatus = async (currentUser: any) => {
        if (!navigator.onLine) {
            setIsOffline(true);
            setIsLoading(false);
            return;
        }

        try {
            const token = await currentUser.getIdToken();
            const res = await fetch('/api/attendance', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ checkStatusOnly: true }),
            });

            const data = await res.json();
            if (data.success) {
                setStatusData(data);
                setSelectedType(data.recommendedType);
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Error loading profile',
                    description: data.error || 'Failed to retrieve stay details.',
                });
                playChime('error');
            }
        } catch (err: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: err.message || 'Something went wrong.',
            });
            playChime('error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleConfirm = async (forceOverride = false) => {
        if (!user) return;

        if (!navigator.onLine) {
            queueOfflineScan();
            return;
        }

        startLoggingTransition(async () => {
            try {
                let currentCoords = { ...coords };
                if (!currentCoords.latitude) {
                    const fresh = await captureGPS();
                    if (fresh.latitude) {
                        currentCoords = fresh;
                    }
                }

                const token = await user.getIdToken();
                const res = await fetch('/api/attendance', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        scanId, // Deduplication key
                        type: selectedType,
                        purpose,
                        isEmergency,
                        latitude: currentCoords.latitude,
                        longitude: currentCoords.longitude,
                        zoneId,
                        override: forceOverride,
                        source: 'QR_SCAN'
                    }),
                });

                if (res.status === 409) {
                    const data = await res.json();
                    if (data.error === 'STATE_WARNING') {
                        setShowWarning(data.message);
                        playChime('warning');
                        return;
                    }
                }

                const data = await res.json();
                if (data.success) {
                    setSuccessLog(data.log);
                    setShowWarning(null);
                    playChime('success');
                    toast({
                        title: `Checked ${selectedType} successfully!`,
                        description: `Logged at ${new Date(data.log.timestamp).toLocaleTimeString()}`,
                    });
                } else {
                    toast({
                        variant: 'destructive',
                        title: 'Logging failed',
                        description: data.error || 'Could not save attendance log.',
                    });
                    playChime('error');
                }
            } catch (err: any) {
                queueOfflineScan();
            }
        });
    };

    const queueOfflineScan = () => {
        const offlineLog = {
            id: scanId, // Maintain idempotency scanId across retries/syncs
            scanId,
            pgId,
            zoneId,
            type: selectedType,
            purpose,
            isEmergency,
            latitude: coords.latitude,
            longitude: coords.longitude,
            timestamp: new Date().toISOString(),
            tenantName: user?.displayName || 'Resident',
            roomName: 'Offline Queue',
            source: 'QR_SCAN',
            offline: true
        };

        const existingQueue = JSON.parse(localStorage.getItem('attendance_scan_queue') || '[]');
        // Don't add duplicate scanIds to offline list
        if (!existingQueue.some((q: any) => q.scanId === scanId)) {
            existingQueue.push(offlineLog);
            localStorage.setItem('attendance_scan_queue', JSON.stringify(existingQueue));
        }

        setSuccessLog(offlineLog);
        playChime('success');
        toast({
            title: 'Scan Saved Offline',
            description: 'Log saved to sync queue. Reconnect to sync.',
        });
    };

    const syncOfflineQueue = async () => {
        const queue = JSON.parse(localStorage.getItem('attendance_scan_queue') || '[]');
        if (queue.length === 0 || !auth!.currentUser) return;

        toast({ title: 'Syncing cached scans...' });
        const token = await auth!.currentUser.getIdToken();
        const failedItems: any[] = [];

        for (const item of queue) {
            try {
                const res = await fetch('/api/attendance', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        scanId: item.scanId, // deduplication check on server
                        type: item.type,
                        purpose: item.purpose,
                        isEmergency: item.isEmergency,
                        latitude: item.latitude,
                        longitude: item.longitude,
                        zoneId: item.zoneId,
                        override: true,
                        source: 'QR_SCAN'
                    }),
                });
                const data = await res.json();
                if (!data.success) {
                    failedItems.push(item);
                }
            } catch (e) {
                failedItems.push(item);
            }
        }

        if (failedItems.length === 0) {
            localStorage.removeItem('attendance_scan_queue');
            toast({ title: 'Gate scans synced successfully!' });
        } else {
            localStorage.setItem('attendance_scan_queue', JSON.stringify(failedItems));
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
                <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground animate-pulse">Initializing Gate Scanner...</p>
            </div>
        );
    }

    if (successLog) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background p-4">
                <Card className="w-full max-w-md bg-card/60 backdrop-blur-md border-primary/20 shadow-2xl rounded-2xl p-6 text-center">
                    <CardHeader className="items-center pb-2">
                        <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4 text-green-500 animate-bounce">
                            <CheckCircle className="w-10 h-10" />
                        </div>
                        <CardTitle className="text-2xl font-bold text-green-500">
                            {successLog.offline ? 'Saved Offline!' : 'Scan Successful!'}
                        </CardTitle>
                        <CardDescription>
                            {successLog.offline ? 'Logged locally. Awaiting connection.' : 'Your entry is verified and recorded.'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                        <div className="bg-muted/40 p-4 rounded-xl space-y-2 text-sm text-left">
                            <p><strong>Resident:</strong> {successLog.tenantName}</p>
                            <p><strong>Room:</strong> {successLog.roomName}</p>
                            <p><strong>Action:</strong> <span className={cn("px-2 py-0.5 rounded font-bold text-xs uppercase", successLog.type === 'IN' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400')}>{successLog.type}</span></p>
                            {successLog.purpose && <p><strong>Purpose:</strong> {successLog.purpose}</p>}
                            {successLog.isEmergency && <p className="text-red-500 font-semibold">⚠️ Emergency Log</p>}
                            <p><strong>Time:</strong> {new Date(successLog.timestamp).toLocaleTimeString()}</p>
                            {successLog.offline && (
                                <p className="text-amber-500 flex items-center gap-1 mt-2 text-xs font-semibold">
                                    <WifiOff className="w-3.5 h-3.5" /> Awaiting network auto-sync
                                </p>
                            )}
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-2">
                        <Button className="w-full py-5 text-base" onClick={() => window.location.href = '/tenants/my-pg'}>
                            Go to Dashboard
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
            <Card className="w-full max-w-md bg-card/60 backdrop-blur-md border-primary/20 shadow-2xl rounded-2xl overflow-hidden">
                <CardHeader className="pb-4 border-b border-primary/5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider mb-1">
                            <span className="w-2 h-2 rounded-full bg-primary" />
                            Zone: {zoneId}
                        </div>
                        {isOffline && (
                            <div className="flex items-center gap-1 text-red-500">
                                <WifiOff className="w-3 h-3" /> Offline
                            </div>
                        )}
                    </div>
                    <CardTitle className="text-2xl font-bold">{statusData?.pgName || 'PG Resident'}</CardTitle>
                    <CardDescription>Room {statusData?.roomName || 'N/A'} • {statusData?.tenantName || user?.displayName}</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 text-center space-y-6">
                    {/* IN/OUT Selector Toggle */}
                    <div className="flex justify-center gap-4">
                        <button
                            type="button"
                            onClick={() => { setSelectedType('IN'); playChime('info'); }}
                            className={cn(
                                "flex-1 py-6 rounded-2xl border transition-all flex flex-col items-center gap-2",
                                selectedType === 'IN' 
                                    ? "bg-green-500/10 border-green-500 text-green-500 shadow-lg shadow-green-500/10" 
                                    : "bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/50"
                            )}
                        >
                            <LogIn className="w-8 h-8" />
                            <span className="font-bold text-sm">Check IN</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => { setSelectedType('OUT'); playChime('info'); }}
                            className={cn(
                                "flex-1 py-6 rounded-2xl border transition-all flex flex-col items-center gap-2",
                                selectedType === 'OUT' 
                                    ? "bg-amber-500/10 border-amber-500 text-amber-500 shadow-lg shadow-amber-500/10" 
                                    : "bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/50"
                            )}
                        >
                            <LogOut className="w-8 h-8" />
                            <span className="font-bold text-sm">Check OUT</span>
                        </button>
                    </div>

                    {/* Geolocation Lock Status */}
                    <div className="flex items-center justify-center gap-2 text-xs py-2 px-3 rounded-lg bg-muted/40 max-w-fit mx-auto text-muted-foreground">
                        <MapPin className={cn("w-3.5 h-3.5", coords.latitude ? "text-green-500" : "text-amber-500")} />
                        {gpsLoading ? (
                            <span>Locking GPS...</span>
                        ) : coords.latitude ? (
                            <span className="text-green-500">Location Lock Active</span>
                        ) : (
                            <span>No GPS signal</span>
                        )}
                    </div>

                    {/* Collapsible Advanced Options (Purpose / Emergency Toggles) */}
                    <div className="border-t border-primary/5 pt-4 text-left">
                        <button
                            type="button"
                            onClick={() => { setShowAdvanced(!showAdvanced); playChime('info'); }}
                            className="flex items-center justify-between w-full text-xs text-muted-foreground hover:text-foreground font-semibold py-1"
                        >
                            Advanced Scan Options
                            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>

                        {showAdvanced && (
                            <div className="space-y-4 pt-3 animate-in slide-in-from-top-1 duration-150">
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Purpose / Tag</label>
                                    <div className="flex flex-wrap gap-2">
                                        {['College', 'Office', 'Home Visit', 'Vacation', 'Other'].map((p) => (
                                            <button
                                                key={p}
                                                type="button"
                                                onClick={() => { setPurpose(purpose === p ? null : p); playChime('info'); }}
                                                className={cn(
                                                    "px-3 py-1.5 rounded-full text-[10px] font-semibold border transition-all",
                                                    purpose === p 
                                                        ? "bg-primary text-primary-foreground border-primary" 
                                                        : "bg-card hover:bg-muted/50 border-primary/10 text-muted-foreground"
                                                )}
                                            >
                                                {p}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="checkbox" 
                                        id="emergency" 
                                        checked={isEmergency}
                                        onChange={(e) => { setIsEmergency(e.target.checked); playChime('info'); }}
                                        className="rounded border-primary/10 text-primary accent-primary w-4 h-4" 
                                    />
                                    <label htmlFor="emergency" className="text-xs text-red-400 font-semibold cursor-pointer select-none">
                                        Mark as Emergency check-in/out
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Last activity status info */}
                    <div className="text-xs text-muted-foreground border-t border-primary/5 pt-4">
                        {statusData?.lastLog ? (
                            <p>Last Activity: <strong>Checked {statusData.lastLog.type}</strong> at {new Date(statusData.lastLog.timestamp).toLocaleString()}</p>
                        ) : (
                            <p>No activity logged today yet.</p>
                        )}
                    </div>
                </CardContent>

                {/* State warning alert panel */}
                {showWarning && (
                    <div className="bg-amber-500/10 border-t border-b border-amber-500/20 p-4 text-left space-y-3">
                        <div className="flex items-start gap-2.5 text-amber-500">
                            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                            <div className="text-xs">
                                <p className="font-bold">Check Status Conflict</p>
                                <p className="text-muted-foreground mt-0.5">{showWarning}</p>
                            </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                            <Button size="sm" variant="ghost" className="text-xs text-muted-foreground" onClick={() => setShowWarning(null)}>
                                Cancel
                            </Button>
                            <Button size="sm" className="bg-amber-600 hover:bg-amber-500 text-white text-xs" onClick={() => handleConfirm(true)}>
                                Log Anyway (Force Override)
                            </Button>
                        </div>
                    </div>
                )}

                <CardFooter className="flex flex-col gap-3 border-t border-primary/5 pt-4 bg-muted/20">
                    <Button 
                        onClick={() => handleConfirm(false)} 
                        disabled={isLogging}
                        className={cn(
                            "w-full py-6 text-lg font-bold shadow-lg transition-all",
                            selectedType === 'IN' 
                                ? "bg-green-600 hover:bg-green-500 text-white shadow-green-600/20" 
                                : "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20"
                        )}
                    >
                        {isLogging ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            `Confirm Check ${selectedType}`
                        )}
                    </Button>
                    <button
                        type="button"
                        onClick={() => window.location.href = '/tenants/my-pg'}
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mt-1"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
                    </button>
                </CardFooter>
            </Card>
        </div>
    );
}
