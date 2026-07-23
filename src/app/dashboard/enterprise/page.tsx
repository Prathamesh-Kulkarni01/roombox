'use client'

import React, { useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
    Database, Link, ShieldCheck, Copy, Check, Code, 
    Activity, Terminal, Key, Globe, FileCode, Sliders, Users, Info, ExternalLink, RefreshCw, ServerCrash, CheckCircle2, Zap, Wrench 
} from 'lucide-react';
import { useAppSelector } from '@/lib/hooks';
import { getOwnerClientDb, getDynamicDb, db as defaultDb } from '@/lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const FIRESTORE_RULES = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users_data/{ownerId}/{document=**} {
      allow read, write: if true;
    }
  }
}`;

const COMPOSITE_INDEXES = [
  { collection: "community_posts", fields: "pgId (Ascending) + date (Descending)" },
  { collection: "community_posts", fields: "pgId (Ascending) + type (Ascending) + date (Descending)" },
  { collection: "meter_readings", fields: "pgId (Ascending) + readingDate (Descending)" },
  { collection: "staff_advances", fields: "staffId (Ascending) + date (Descending)" },
  { collection: "staff_payrolls", fields: "staffId (Ascending) + month (Descending)" },
  { collection: "refund_records", fields: "pgId (Ascending) + refundDate (Descending)" }
];

export default function EnterpriseOnboardingPage() {
    const { currentUser } = useAppSelector(state => state.user);

    const [projectId, setProjectId] = useState<string>('');
    const [databaseId, setDatabaseId] = useState<string>('(default)');
    const [clientConfigText, setClientConfigText] = useState<string>('');
    const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
    const [busy, setBusy] = useState<boolean>(false);
    const [setupRunning, setSetupRunning] = useState<boolean>(false);
    const [resultMsg, setResultMsg] = useState<string>(DEFAULT_INSTRUCTIONS_MSG());
    const [testMsg, setTestMsg] = useState<string>('');
    const [syncComparison, setSyncComparison] = useState<Record<string, { sourceCount: number; targetCount: number; status: string }> | null>(null);
    const [copiedRules, setCopiedRules] = useState<boolean>(false);
    const [copiedEmail, setCopiedEmail] = useState<boolean>(false);
    const [activeTab, setActiveTab] = useState<'project' | 'auth' | 'rules' | 'indexes' | 'server'>('project');
    
    // Status monitoring state for verification response
    const [setupStatus, setSetupStatus] = useState<{
        rules: { status: string; ruleset: string | null };
        indexes: Array<{ collection: string; fields: string; status: string }>;
        domains: string[];
        schema?: { status: string; documentCount: number };
    } | null>(null);

    const [connectMethod, setConnectMethod] = useState<'oauth' | 'manual'>('oauth');
    const [isOnboardingSuccess, setIsOnboardingSuccess] = useState<boolean>(false);
    const [oauthError, setOauthError] = useState<string | null>(null);
    const [oauthWarning, setOauthWarning] = useState<string | null>(null);
    const [hasLoadedSavedConfig, setHasLoadedSavedConfig] = useState<boolean>(false);

    const hasFailed = useMemo(() => {
        return resultMsg.startsWith('❌') || testMsg.startsWith('❌');
    }, [resultMsg, testMsg]);

    // Retrieve service account client email safely from env (using placeholder if missing)
    const platformServiceEmail = process.env.NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL || 'rentsutra-agent@roombox-f7bff.iam.gserviceaccount.com';

    function DEFAULT_INSTRUCTIONS_MSG() {
        return "Not connected yet. Fill out the configuration options above to link your database.";
    }

    // Parse onboarding status and load active database connection once on mount
    React.useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            if (params.get('onboarding') === 'success') {
                setIsOnboardingSuccess(true);
            }
            if (params.get('error')) {
                setOauthError(decodeURIComponent(params.get('error') as string));
            }
            if (params.get('warning')) {
                setOauthWarning(decodeURIComponent(params.get('warning') as string));
            }
        }
    }, []);

    React.useEffect(() => {
        if (currentUser && !hasLoadedSavedConfig) {
            const savedProject = currentUser?.subscription?.enterpriseProject?.projectId;
            const savedDb = currentUser?.subscription?.enterpriseProject?.databaseId;
            const savedConfig = currentUser?.subscription?.enterpriseProject?.clientConfig;

            if (savedProject) setProjectId(savedProject);
            if (savedDb) setDatabaseId(savedDb);
            if (savedConfig) setClientConfigText(JSON.stringify(savedConfig, null, 2));
            
            setHasLoadedSavedConfig(true);
        }
    }, [currentUser, hasLoadedSavedConfig]);

    const parsedClientConfig = useMemo(() => {
        if (!clientConfigText?.trim()) return undefined;
        try {
            // Attempt standard JSON parsing first
            return JSON.parse(clientConfigText);
        } catch {
            // Forgive raw JavaScript objects with unquoted keys or single quotes
            try {
                const matches = Array.from(clientConfigText.matchAll(/(?:"([^"]+)"|'([^']+)'|([a-zA-Z0-9_]+))\s*:\s*(?:"([^"]*)"|'([^']*)')/g));
                const obj: Record<string, string> = {};
                let count = 0;
                for (const m of matches) {
                    const key = m[1] || m[2] || m[3];
                    const val = m[4] !== undefined ? m[4] : m[5];
                    if (key) {
                        obj[key] = val || '';
                        count++;
                    }
                }
                if (count >= 3 && obj.projectId && obj.apiKey) {
                    return obj;
                }
            } catch (e) {
                console.error("Regex parsing error", e);
            }
            return undefined;
        }
    }, [clientConfigText]);

    React.useEffect(() => {
        if (parsedClientConfig && parsedClientConfig.projectId) {
            setProjectId(parsedClientConfig.projectId);
        }
    }, [parsedClientConfig]);

    const canSubmit = useMemo(() => {
        return !!currentUser?.email && !!projectId && !!databaseId && (clientConfigText.trim().length === 0 || !!parsedClientConfig);
    }, [currentUser?.email, projectId, databaseId, clientConfigText, parsedClientConfig]);

    // Dynamic Firebase & GCP Console Links based on current input project ID
    const consoleLinks = useMemo(() => {
        const pId = projectId?.trim() || '_';
        return {
            firebaseConsole: `https://console.firebase.google.com/`,
            authSettings: `https://console.firebase.google.com/project/${pId}/authentication/providers`,
            firestoreRules: `https://console.firebase.google.com/project/${pId}/firestore/rules`,
            firestoreIndexes: `https://console.firebase.google.com/project/${pId}/firestore/indexes`,
            gcpIam: projectId?.trim() 
                ? `https://console.cloud.google.com/iam-admin/iam?project=${projectId}`
                : `https://console.cloud.google.com/iam-admin/iam`
        };
    }, [projectId]);

    const handleCopy = async (text: string, setFlag: (flag: boolean) => void) => {
        try {
            await navigator.clipboard.writeText(text);
            setFlag(true);
            setTimeout(() => setFlag(false), 2000);
        } catch (err) {
            console.error('Failed to copy: ', err);
        }
    };

    const handleProvision = async () => {
        if (!currentUser?.email) {
            setResultMsg('Please log in first.');
            return;
        }
        setBusy(true);
        setResultMsg('');
        try {
            const res = await fetch('/api/enterprise/provision-db', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: currentUser.email,
                    projectId: projectId || undefined,
                    databaseId: databaseId || undefined,
                    clientConfig: parsedClientConfig || undefined,
                })
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || 'Provisioning failed');
            
            if (data.warning) {
                setOauthWarning(data.warning);
                setResultMsg(`⚠️ Connected, but there is a warning: Project: ${data.projectId}, Database Instance: ${data.databaseId}`);
            } else {
                setOauthWarning(null);
                setResultMsg(`🎉 Connected Successfully! Project: ${data.projectId}, Database Instance: ${data.databaseId}${data.provisioned ? ' (Newly provisioned)' : ''}`);
            }
        } catch (e: any) {
            setResultMsg(e.message || 'Provisioning failed');
        } finally {
            setBusy(false);
        }
    };

    const handleOneClickSetup = async () => {
        if (!currentUser?.email) {
            setResultMsg('Please log in first.');
            return;
        }
        if (!projectId) {
            setTestMsg('Error: Please enter your Google Project ID or paste the config.');
            return;
        }
        setBusy(true);
        setSetupRunning(true);
        setResultMsg('');
        setTestMsg('⚙️ Initiating One-Click Auto-Setup & Connect...');
        try {
            // 1. Save & Link DB configuration
            setTestMsg('💾 [1/3] Saving and linking database configuration...');
            const res = await fetch('/api/enterprise/provision-db', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: currentUser.email,
                    projectId: projectId || undefined,
                    databaseId: databaseId || undefined,
                    clientConfig: parsedClientConfig || undefined,
                })
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || 'Database linking failed');
            if (data.warning) {
                setOauthWarning(data.warning);
                // The API is likely disabled, so subsequent steps will fail.
                throw new Error('Database linked, but API is disabled. See the warning above.');
            } else {
                setOauthWarning(null);
            }

            // 2. Deploy Firestore Rules, Indexes, and Authorized Domains
            setTestMsg('🚀 [2/3] Linking succeeded! Deploying security rules, indexes, and authorized domains...');
            const { auth: clientAuth } = await import('@/lib/firebase');
            const token = await clientAuth?.currentUser?.getIdToken();

            const setupRes = await fetch('/api/enterprise/auto-setup', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    projectId,
                    databaseId,
                    action: 'setup'
                })
            });
            const setupData = await setupRes.json();
            if (!setupRes.ok || !setupData.success) throw new Error(setupData.error || 'Automation deployment failed');

            // 3. Verify Deployment & Connection Status
            setTestMsg('🔍 [3/3] Deployment succeeded! Verifying database configuration status...');
            const verifyRes = await fetch('/api/enterprise/auto-setup', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    projectId,
                    databaseId,
                    action: 'verify'
                })
            });
            const verifyData = await verifyRes.json();
            if (verifyRes.ok && verifyData.success) {
                setSetupStatus(verifyData.status);
            }

            setResultMsg('🎉 One-Click Auto-Setup completed successfully!');
            setTestMsg('✅ Connected & configured! Security rules deployed, indexes created, and login domains authorized. Live statuses are updated on the right.');
        } catch (e: any) {
            setResultMsg(`❌ Setup failed: ${e.message || String(e)}`);
            setTestMsg(`❌ Auto-Setup failed: ${e.message || String(e)}. Ensure our service account is invited (Step 1).`);
            setActiveTab('rules');
        } finally {
            setBusy(false);
            setSetupRunning(false);
        }
    };

    const handleVerifyStatus = async () => {
        if (!projectId) {
            setTestMsg('Error: Please enter your Google Project ID first.');
            return;
        }
        setSetupRunning(true);
        setTestMsg('🔍 Verifying remote database configuration status...');
        try {
            const { auth: clientAuth } = await import('@/lib/firebase');
            const token = await clientAuth?.currentUser?.getIdToken();

            const res = await fetch('/api/enterprise/auto-setup', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    projectId,
                    databaseId,
                    action: 'verify'
                })
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || 'Verification failed');
            setSetupStatus(data.status);
            setTestMsg('✅ Remote configuration status fetched successfully.');
        } catch (e: any) {
            setTestMsg(`❌ Verification check failed: ${e.message || String(e)}`);
            setActiveTab('rules');
        } finally {
            setSetupRunning(false);
        }
    };

    const handleDisconnect = async () => {
        if (!confirm('Are you sure you want to disconnect your enterprise database and return to RentSutra default cloud storage? This does not delete any of your Firestore documents.')) {
            return;
        }
        setBusy(true);
        setTestMsg('🔌 Disconnecting custom database...');
        try {
            const { auth: clientAuth } = await import('@/lib/firebase');
            const token = await clientAuth?.currentUser?.getIdToken();

            const res = await fetch('/api/enterprise/disconnect', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || 'Disconnection failed');
            setResultMsg('🔌 Database successfully disconnected. Plan reset to Standard.');
            setTestMsg('✅ Disconnected successfully! Page will refresh shortly.');
            setTimeout(() => window.location.reload(), 2000);
        } catch (e: any) {
            setTestMsg(`❌ Disconnection failed: ${e.message || String(e)}`);
        } finally {
            setBusy(false);
        }
    };

    const handleCheckSync = async () => {
        setSetupRunning(true);
        setTestMsg('🔍 Comparing source database and custom database record counts...');
        try {
            const { auth: clientAuth } = await import('@/lib/firebase');
            const token = await clientAuth?.currentUser?.getIdToken();

            const res = await fetch('/api/enterprise/migrate-data', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ action: 'check' })
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || 'Check status failed');
            
            // Store structured comparison data for rich table rendering
            setSyncComparison(data.comparison || {});

            const totalOut = Object.values(data.comparison || {}).filter((s: any) => s.sourceCount !== s.targetCount && s.sourceCount > 0).length;
            if (totalOut > 0) {
                setTestMsg(`⚠️ ${totalOut} collection(s) are out of sync. Review the table below and click Sync & Migrate Data.`);
            } else {
                setTestMsg('🎉 All collections are fully in sync with the custom database!');
            }
        } catch (e: any) {
            setTestMsg(`❌ Sync check failed: ${e.message || String(e)}`);
        } finally {
            setSetupRunning(false);
        }
    };

    const handleMigrateData = async () => {
        if (!confirm('This will copy all of your properties, tenants, staff, meter readings, payments, and complaints from the default RentSutra cloud database to your newly connected private database. It will also upgrade all document schemas to the latest version. Proceed?')) {
            return;
        }
        setSetupRunning(true);
        setTestMsg('📦 Migrating database subcollections (copying documents & upgrading schemas)...');
        try {
            const { auth: clientAuth } = await import('@/lib/firebase');
            const token = await clientAuth?.currentUser?.getIdToken();

            const res = await fetch('/api/enterprise/migrate-data', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ action: 'sync' })
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || 'Migration failed');
            
            let summary = '';
            let detailedLogs = '\n📜 DETAILED SYNC LOGS:\n';
            for (const [col, stats] of Object.entries(data.results || {})) {
                const s = stats as any;
                if (s.copied > 0 || s.errors > 0) {
                    summary += `\n - ${col}: copied ${s.copied} docs (Errors: ${s.errors})`;
                }
                if (s.logs && s.logs.length > 0) {
                    detailedLogs += `\n[${col.toUpperCase()}]\n` + s.logs.join('\n') + '\n';
                }
            }
            setTestMsg(`✅ Migration completed successfully! ${summary || 'No documents to copy.'}\n${detailedLogs}`);
            await handleVerifyStatus();
        } catch (e: any) {
            setTestMsg(`❌ Migration failed: ${e.message || String(e)}`);
        } finally {
            setSetupRunning(false);
        }
    };

    const handleConnectProject = () => {
        const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
        const appUrl = typeof window !== 'undefined' ? window.location.origin : '';
        const redirectUri = `${appUrl}/api/oauth/google/callback`;
        const scope = 'https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/firebase https://www.googleapis.com/auth/service.management https://www.googleapis.com/auth/servicecontrol https://www.googleapis.com/auth/cloud-platform.read-only';
        const statePayload = {
            ownerId: currentUser?.id || null,
            projectId: projectId?.trim() || 'auto',
            databaseId: databaseId || null,
        };
        const state = typeof window !== 'undefined' ? btoa(JSON.stringify(statePayload)) : String(currentUser?.id || '');
        if (!clientId || clientId.includes('your-')) {
            alert('Google Client ID is not configured. Please contact support.');
            return;
        }
        const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${encodeURIComponent(scope)}&state=${state}&access_type=offline&prompt=consent`;
        window.location.href = oauthUrl;
    };

    const handleTestConnection = async () => {
        try {
            setTestMsg('🔍 Handshake: Validating login session...');
            if (!currentUser) {
                setTestMsg('❌ Handshake failed: User session not found. Please log in.');
                return;
            }
            const ownerId = currentUser.role === 'owner' ? currentUser.id : currentUser.ownerId;
            if (!ownerId) {
                setTestMsg('❌ Handshake failed: Could not determine owner identification context.');
                return;
            }
            
            setTestMsg('🔍 Handshake: Instantiating client-side sharded database reference...');
            const cfg = currentUser.subscription?.enterpriseProject?.clientConfig || parsedClientConfig;
            const dbId = currentUser.subscription?.enterpriseProject?.databaseId || databaseId;
            const dbInstance = cfg ? getOwnerClientDb(cfg, dbId) : (dbId ? getDynamicDb(dbId) : defaultDb);
            if (!dbInstance) {
                setTestMsg('❌ Handshake failed: Database engine failed to start with provided credentials.');
                return;
            }
            
            const withTimeout = async <T,>(p: Promise<T>, ms = 8000, label = 'operation'): Promise<T> => {
                return await Promise.race([
                    p,
                    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms))
                ]) as T;
            };
            
            setTestMsg('✍️ Handshake [WRITE]: Creating transient handshake record at users_data/{ownerId}/connection_tests/ping...');
            const testRef = doc(dbInstance, 'users_data', ownerId, 'connection_tests', 'ping');
            
            await withTimeout(setDoc(testRef, {
              ts: Date.now(),
              uid: currentUser.id,
              clientVer: 'BYODB-1.0.0'
            }, { merge: true }), 8000, 'Handshake write');
            
            setTestMsg('📖 Handshake [READ]: Querying transient handshake record to verify read clearance...');
            const snap = await withTimeout(getDoc(testRef), 8000, 'Handshake read');
            
            if (snap.exists()) {
                setTestMsg('✅ Handshake completed! Double-ended read/write validation succeeded. Connection status is healthy.');
            } else {
                setTestMsg('⚠️ Handshake anomaly: Write succeeded, but read access returned null. Check Firestore Security Rules.');
            }
        } catch (e: any) {
            const msg = e?.message || String(e);
            let contextAdvice = '';
            if (msg.includes('timed out')) {
                contextAdvice = ' Suggestions: (1) Ensure your Firestore instance actually exists. (2) Confirm rules permit write access. (3) Verify network is clear.';
            } else if (msg.includes('permission-denied') || msg.includes('Permission denied')) {
                contextAdvice = ' Suggestions: Ensure you copied and deployed the required Firestore Security Rules (Tab 3).';
            }
            setTestMsg(`❌ Handshake failed: ${msg}.${contextAdvice}`);
            setActiveTab('rules');
        }
    };

    const isDbConnected = !!currentUser?.subscription?.enterpriseProject?.projectId;
    const connectedProjectId = currentUser?.subscription?.enterpriseProject?.projectId;
    const connectedDatabaseId = currentUser?.subscription?.enterpriseProject?.databaseId || '(default)';

    return (
        <div className="container mx-auto py-12 px-4 max-w-6xl animate-in fade-in duration-700">
            {/* Header Block */}
            <div className="mb-8 space-y-2 text-center lg:text-left">
                <h2 className="text-3xl font-black tracking-tight flex items-center gap-3 justify-center lg:justify-start">
                    <Database className="w-8 h-8 text-primary" />
                    Enterprise DB Console
                </h2>
                <p className="text-sm text-muted-foreground font-medium max-w-2xl">
                    Configure and manage your sharded Bring Your Own Database (BYODB) instance. 
                    Run automated installations, register authorized endpoints, and monitor database health.
                </p>
            </div>

            {/* Active Connection Banner */}
            <div className={`mb-8 p-5 rounded-3xl border transition-all ${
                isDbConnected 
                    ? 'bg-emerald-500/5 border-emerald-500/30 text-emerald-800 dark:text-emerald-300 shadow-sm' 
                    : 'bg-amber-500/5 border-amber-500/20 text-amber-800 dark:text-amber-300 shadow-sm'
            }`}>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="relative flex h-3 w-3">
                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                                isDbConnected ? 'bg-emerald-500' : 'bg-amber-500'
                            }`}></span>
                            <span className={`relative inline-flex rounded-full h-3 w-3 ${
                                isDbConnected ? 'bg-emerald-500' : 'bg-amber-500'
                            }`}></span>
                        </div>
                        <div>
                            <p className="text-[10px] uppercase font-black tracking-wider text-muted-foreground leading-none mb-1">
                                Database Status
                            </p>
                            <h3 className="text-sm font-black leading-none">
                                {isDbConnected 
                                    ? `Enterprise Private DB Connected` 
                                    : `RentSutra Shared Cloud Default`
                                }
                            </h3>
                        </div>
                    </div>
                    {isDbConnected && (
                        <div className="flex flex-wrap gap-2 text-[10px] font-mono">
                            <span className="px-3 py-1.5 rounded-xl bg-background border font-extrabold flex items-center gap-1.5 shadow-sm text-foreground">
                                <Database className="w-3.5 h-3.5 text-primary" />
                                Project: <span className="text-primary">{connectedProjectId}</span>
                            </span>
                            <span className="px-3 py-1.5 rounded-xl bg-background border font-extrabold flex items-center gap-1.5 shadow-sm text-foreground">
                                <Code className="w-3.5 h-3.5 text-primary" />
                                Database: <span className="text-primary">{connectedDatabaseId}</span>
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Google OAuth Success Alert & Next Steps */}
            {isOnboardingSuccess && (
                <div className="mb-8 p-6 rounded-3xl border border-primary/30 bg-primary/5 text-primary animate-in zoom-in-95 duration-500 shadow-md">
                    <div className="flex gap-4 items-start">
                        <Zap className="w-6 h-6 shrink-0 mt-0.5 text-primary animate-bounce" />
                        <div className="space-y-2">
                            <h3 className="font-black text-sm text-foreground flex items-center gap-2">
                                Google Authentication Authorized Successfully!
                            </h3>
                            <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                                You have successfully authorized RentSutra with your Google Cloud credentials. 
                                <span className="font-extrabold text-foreground block mt-1.5">👉 Next Step:</span> 
                                Click the <strong className="text-foreground">🚀 One-Click Auto-Setup & Verify</strong> button below in <span className="underline font-bold text-foreground">Step 2</span> to configure your private Firestore instance, security rules, indexes, and authorized domains automatically.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Google OAuth Error Guide - UX Polished Flow */}
            {oauthError && (
                <div className="mb-8 p-6 lg:p-8 rounded-3xl border-2 border-destructive/30 bg-destructive/5 shadow-lg animate-in zoom-in-95 duration-500">
                    <div className="flex flex-col lg:flex-row gap-6 items-start">
                        <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center shrink-0 border border-destructive/20">
                            <ServerCrash className="w-7 h-7 text-destructive animate-pulse" />
                        </div>
                        <div className="space-y-6 w-full">
                            <div>
                                <h3 className="text-xl font-black text-destructive tracking-tight">
                                    Setup Paused: Google Cloud Blocked Creation
                                </h3>
                                <p className="text-sm text-destructive/80 font-bold mt-1.5 leading-relaxed">
                                    Google requires a quick manual verification on your account before we can automatically create your private database.
                                </p>
                                <div className="mt-3 inline-flex items-center px-3 py-1 rounded-lg bg-background/60 border border-destructive/20 font-mono text-[10px] text-destructive/70 max-w-full overflow-hidden text-ellipsis whitespace-nowrap" title={oauthError}>
                                    <Info className="w-3 h-3 mr-1.5 shrink-0" />
                                    Developer Code: {oauthError}
                                </div>
                            </div>

                            <div className="bg-background rounded-2xl border border-border/60 shadow-sm overflow-hidden">
                                <div className="p-4 border-b border-border/40 bg-muted/30">
                                    <h4 className="font-extrabold text-sm text-foreground flex items-center gap-2">
                                        <Wrench className="w-4 h-4 text-primary" />
                                        How to fix this in 2 minutes:
                                    </h4>
                                </div>
                                
                                <div className="p-5 sm:p-6">
                                    {oauthError.toLowerCase().includes('terms of service') ? (
                                        <div className="space-y-4">
                                            <p className="text-sm font-bold text-foreground">You need to accept Google's Terms of Service.</p>
                                            <ol className="list-decimal pl-5 space-y-3 text-sm font-medium text-muted-foreground">
                                                <li>Click the button below to open the Google Cloud Console in a new tab.</li>
                                                <li>A popup will immediately ask you to agree to the Terms of Service.</li>
                                                <li>Select your country, check the box, and click <strong className="text-foreground">"Agree and Continue"</strong>.</li>
                                                <li>Come back to this page and click Retry.</li>
                                            </ol>
                                            <div className="pt-2">
                                                <Button asChild size="default" variant="default" className="gap-2 font-bold shadow-md">
                                                    <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer">
                                                        <ExternalLink className="w-4 h-4" />
                                                        Open Google Cloud Console
                                                    </a>
                                                </Button>
                                            </div>
                                        </div>
                                    ) : oauthError.toLowerCase().includes('quota') || oauthError.toLowerCase().includes('permission') ? (
                                        <div className="space-y-4">
                                            <p className="text-sm font-bold text-foreground">Google wants you to manually create your first project to prove you are human.</p>
                                            <ol className="list-decimal pl-5 space-y-3 text-sm font-medium text-muted-foreground">
                                                <li>Click the button below to open the Google Cloud Console.</li>
                                                <li>In the top left, click the <strong className="text-foreground">Project Dropdown</strong> (next to the Google Cloud logo) and click <strong className="text-foreground">New Project</strong>.</li>
                                                <li>Name it <strong className="text-foreground">"RentSutra Enterprise"</strong> and click Create.</li>
                                                <li>Copy the <strong className="text-foreground">Project ID</strong> (it looks like <span className="font-mono bg-muted px-1 py-0.5 rounded text-xs">rentsutra-enterprise-123</span>).</li>
                                                <li>Come back here, paste the Project ID in the field below, and click Retry.</li>
                                            </ol>
                                            <div className="pt-2">
                                                <Button asChild size="default" variant="default" className="gap-2 font-bold shadow-md">
                                                    <a href="https://console.cloud.google.com/projectcreate" target="_blank" rel="noreferrer">
                                                        <ExternalLink className="w-4 h-4" />
                                                        Create Project in Google Cloud
                                                    </a>
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <p className="text-sm font-bold text-foreground">Your account requires manual intervention.</p>
                                            <ol className="list-decimal pl-5 space-y-3 text-sm font-medium text-muted-foreground">
                                                <li>Open the Google Cloud Console using the button below.</li>
                                                <li>Check for any red banners or alerts requiring your attention (like billing or security verifications).</li>
                                                <li>If everything looks fine, try creating a project manually.</li>
                                            </ol>
                                            <div className="pt-2">
                                                <Button asChild size="default" variant="default" className="gap-2 font-bold shadow-md">
                                                    <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer">
                                                        <ExternalLink className="w-4 h-4" />
                                                        Check Google Cloud Console
                                                    </a>
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row items-end gap-4 pt-6 border-t border-destructive/20 mt-6">
                                <div className="flex-1 w-full space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-wider text-destructive">Paste Project ID Here</label>
                                    <input 
                                        className="w-full border-2 border-destructive/20 rounded-xl px-4 py-3 bg-background focus:ring-2 focus:ring-destructive/20 outline-none text-sm font-bold text-foreground placeholder:text-muted-foreground/50 transition-all"
                                        value={projectId}
                                        onChange={(e) => setProjectId(e.target.value)}
                                        placeholder="e.g., rentsutra-enterprise-123"
                                    />
                                </div>
                                <Button 
                                    onClick={handleConnectProject}
                                    size="lg"
                                    className="gap-2 h-[52px] font-black shadow-md bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-xl w-full sm:w-auto px-6 shrink-0"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    Retry Enterprise Setup
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Google OAuth Warning Guide (Partial Success) */}
            {oauthWarning && (
                <div className="mb-8 p-6 lg:p-8 rounded-3xl border-2 border-amber-500/30 bg-amber-500/5 shadow-lg animate-in zoom-in-95 duration-500">
                    <div className="flex flex-col lg:flex-row gap-6 items-start">
                        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center shrink-0 border border-amber-500/20">
                            <Info className="w-7 h-7 text-amber-600 animate-pulse" />
                        </div>
                        <div className="space-y-6 w-full">
                            <div>
                                <h3 className="text-xl font-black text-amber-700 tracking-tight">
                                    Project Linked, but Firebase Setup Failed
                                </h3>
                                <p className="text-sm text-amber-700/80 font-bold mt-1.5 leading-relaxed">
                                    Your Google Cloud project was linked, but we couldn't automatically configure Firebase for it.
                                </p>
                                <div className="mt-3 inline-flex items-center px-3 py-1 rounded-lg bg-background/60 border border-amber-500/20 font-mono text-[10px] text-amber-700/70 max-w-full overflow-hidden text-ellipsis whitespace-nowrap" title={oauthWarning}>
                                    <Info className="w-3 h-3 mr-1.5 shrink-0" />
                                    Warning: {oauthWarning}
                                </div>
                            </div>

                            <div className="bg-background rounded-2xl border border-border/60 shadow-sm overflow-hidden">
                                <div className="p-4 border-b border-border/40 bg-muted/30">
                                    <h4 className="font-extrabold text-sm text-foreground flex items-center gap-2">
                                        <Wrench className="w-4 h-4 text-primary" />
                                        How to fix this in 1 minute:
                                    </h4>
                                </div>
                                
                                <div className="p-5 sm:p-6 space-y-4">
                                    {oauthWarning.toLowerCase().includes('not found') && oauthWarning.toLowerCase().includes('firebase') ? (
                                        <>
                                            <p className="text-sm font-bold text-foreground">You likely entered a Project Number instead of a Project ID, or Firebase isn't enabled.</p>
                                            <ol className="list-decimal pl-5 space-y-3 text-sm font-medium text-muted-foreground">
                                                <li>Double-check the Google Project ID you entered. It should be a text string (like <strong className="text-foreground">rentsutra-123</strong>), not a 12-digit number (like <strong className="text-foreground">350517527254</strong>).</li>
                                                <li>If the ID is correct, open the <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="text-primary hover:underline font-bold">Firebase Console</a>, click "Add Project", and select your Google Cloud project from the dropdown to manually enable Firebase.</li>
                                                <li>Come back here, ensure the correct text string Project ID is in the field, and click Retry.</li>
                                            </ol>
                                        </>
                                    ) : oauthWarning.toLowerCase().includes('firestore api') ? (
                                        <>
                                            <p className="text-sm font-bold text-foreground">The Firestore API is currently disabled for this project.</p>
                                            <ol className="list-decimal pl-5 space-y-3 text-sm font-medium text-muted-foreground">
                                                <li>Click the button below to open the Google Cloud API enablement page.</li>
                                                <li>Click the blue <strong className="text-foreground">Enable</strong> button.</li>
                                                <li>Wait about 1-2 minutes for Google's servers to sync the change.</li>
                                                <li>Come back here and click Retry.</li>
                                            </ol>
                                            <div className="pt-2">
                                                <Button asChild size="default" variant="default" className="gap-2 font-bold shadow-md">
                                                    <a href={`https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=${projectId}`} target="_blank" rel="noreferrer">
                                                        <ExternalLink className="w-4 h-4" />
                                                        Enable Firestore API
                                                    </a>
                                                </Button>
                                            </div>
                                        </>
                                    ) : oauthWarning.toLowerCase().includes('billing') ? (
                                        <>
                                            <p className="text-sm font-bold text-foreground">Google Cloud requires a linked Billing Account to create a database via API.</p>
                                            <ol className="list-decimal pl-5 space-y-3 text-sm font-medium text-muted-foreground">
                                                <li>You must manually create the database to bypass this automated billing check on the free tier.</li>
                                                <li>Click the button below to open the Firebase Console.</li>
                                                <li>On the left sidebar, click <strong className="text-foreground">Firestore Database</strong> and then click <strong className="text-foreground">Create Database</strong>.</li>
                                                <li>Once created, come back here and click Retry.</li>
                                            </ol>
                                            <div className="pt-2">
                                                <Button asChild size="default" variant="default" className="gap-2 font-bold shadow-md">
                                                    <a href={`https://console.firebase.google.com/project/${projectId}/firestore`} target="_blank" rel="noreferrer">
                                                        <ExternalLink className="w-4 h-4" />
                                                        Open Firebase Console
                                                    </a>
                                                </Button>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <p className="text-sm font-bold text-foreground">Manual Firebase configuration required.</p>
                                            <ol className="list-decimal pl-5 space-y-3 text-sm font-medium text-muted-foreground">
                                                <li>Open the <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="text-primary hover:underline font-bold">Firebase Console</a>.</li>
                                                <li>Ensure your Google Cloud project is registered as a Firebase project.</li>
                                                <li>Ensure the "Firestore API" is enabled for the project.</li>
                                                <li>Come back here and retry.</li>
                                            </ol>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row items-end gap-4 pt-6 border-t border-amber-500/20 mt-6">
                                <div className="flex-1 w-full space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-wider text-amber-700">Project ID</label>
                                    <input 
                                        className="w-full border-2 border-amber-500/20 rounded-xl px-4 py-3 bg-background focus:ring-2 focus:ring-amber-500/20 outline-none text-sm font-bold text-foreground placeholder:text-muted-foreground/50 transition-all"
                                        value={projectId}
                                        onChange={(e) => setProjectId(e.target.value)}
                                        placeholder="e.g., rentsutra-enterprise-123"
                                    />
                                </div>
                                <Button 
                                    onClick={handleConnectProject}
                                    size="lg"
                                    className="gap-2 h-[52px] font-black shadow-md bg-amber-600 hover:bg-amber-700 text-white rounded-xl w-full sm:w-auto px-6 shrink-0"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    Retry Enterprise Setup
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Left Column: Guided Setup Flow */}
                <div className="lg:col-span-7 space-y-6">
                    <Card className="border border-border/60 shadow-xl rounded-3xl overflow-hidden bg-card">
                        <CardHeader className="border-b border-border/40 bg-muted/25 p-6">
                            <CardTitle className="text-lg font-black flex items-center gap-2">
                                <Sliders className="w-5 h-5 text-primary" />
                                Guided Setup Instructions
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            
                            {/* Step 1: Create Project in Google Cloud */}
                            <div className="flex gap-4 animate-in fade-in duration-300">
                                <div className="flex flex-col items-center">
                                    <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground font-black text-sm flex items-center justify-center shrink-0">1</span>
                                    <div className="w-0.5 flex-1 bg-border/60 my-2"></div>
                                </div>
                                <div className="space-y-4 flex-1 pb-4">
                                    <h4 className="font-extrabold text-sm text-foreground">Create an Empty Google Cloud Project</h4>
                                    <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                                        Google requires you to manually create a project to accept their Terms of Service and prove you are human.
                                    </p>
                                    <ol className="list-decimal pl-5 space-y-2 text-xs font-medium text-muted-foreground">
                                        <li>Open the <a href="https://console.cloud.google.com/projectcreate" target="_blank" rel="noreferrer" className="text-primary hover:underline font-bold inline-flex items-center gap-1">Google Cloud Console <ExternalLink className="w-3 h-3 inline" /></a>.</li>
                                        <li>Name your project <strong className="text-foreground">"RentSutra Enterprise"</strong> and click <strong className="text-foreground">Create</strong>.</li>
                                        <li>Wait 5 seconds, then copy the <strong className="text-foreground">Project ID</strong> (e.g. <span className="font-mono bg-muted px-1 py-0.5 rounded text-[10px]">rentsutra-enterprise-123</span>).</li>
                                    </ol>
                                </div>
                            </div>

                            {/* Step 2: Connect & Initialize */}
                            <div className="flex gap-4 animate-in fade-in duration-300">
                                <div className="flex flex-col items-center">
                                    <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground font-black text-sm flex items-center justify-center shrink-0">2</span>
                                    <div className="w-0.5 flex-1 bg-border/60 my-2"></div>
                                </div>
                                <div className="space-y-4 flex-1 pb-4">
                                    <h4 className="font-extrabold text-sm text-foreground">Connect & Initialize</h4>
                                    <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                                        Paste your Project ID below and authenticate with Google. Our backend agent will automatically enable APIs, provision Firebase, and configure security rules for you.
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2 max-w-lg">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Google Project ID</label>
                                            <input className="w-full border rounded-xl px-3 py-2 bg-background focus:ring-2 focus:ring-primary/20 outline-none text-xs font-bold"
                                                value={projectId}
                                                onChange={e => setProjectId(e.target.value)}
                                                placeholder="e.g. rentsutra-enterprise-123"
                                                 />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Database Instance ID</label>
                                            <input className="w-full border rounded-xl px-3 py-2 bg-background focus:ring-2 focus:ring-primary/20 outline-none text-xs font-bold"
                                                value={databaseId}
                                                onChange={e => setDatabaseId(e.target.value.toLowerCase())}
                                                placeholder="(default)"/>
                                            <p className="text-[9px] text-muted-foreground italic">Required: keep it <span className="font-mono text-foreground font-bold">(default)</span> for standard setup.</p>
                                        </div>
                                    </div>
                                    <Button 
                                        className="w-full sm:w-auto rounded-xl py-5 px-6 font-black text-xs shadow-sm bg-primary hover:bg-primary/90 text-primary-foreground" 
                                        variant="default" 
                                        onClick={handleConnectProject}
                                        disabled={!projectId}
                                    >
                                        <Zap className="mr-1.5 h-3.5 w-3.5" />
                                        Connect with Google Authentication
                                    </Button>
                                </div>
                            </div>

                            {/* Step 3: Run Setup & Verify */}
                            <div className="flex gap-4 animate-in fade-in duration-300">
                                <div className="flex flex-col items-center">
                                    <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground font-black text-sm flex items-center justify-center shrink-0">3</span>
                                </div>
                                <div className="space-y-3 flex-1">
                                    <h4 className="font-extrabold text-sm text-foreground">Deploy, Sync & Verify Database</h4>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        Once authenticated, click below to automatically run the deployment and sync:
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                        <Button 
                                            className="w-full rounded-2xl py-6 font-black text-sm shadow-md bg-emerald-600 hover:bg-emerald-700 text-white" 
                                            onClick={handleOneClickSetup}
                                            disabled={setupRunning || !projectId}
                                        >
                                            🚀 One-Click Auto-Setup & Verify
                                        </Button>
                                        <Button 
                                            className="w-full rounded-2xl py-6 font-black text-sm shadow-md" 
                                            variant="secondary"
                                            onClick={handleMigrateData}
                                            disabled={setupRunning || !projectId}
                                        >
                                            📦 Sync & Migrate Data
                                        </Button>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <Button 
                                            className="w-full rounded-2xl py-5 font-bold text-xs"
                                            variant="outline"
                                            onClick={handleVerifyStatus}
                                            disabled={setupRunning || !projectId}
                                        >
                                            🔍 Recheck Status
                                        </Button>
                                        <Button 
                                            className="w-full rounded-2xl py-5 font-bold text-xs"
                                            variant="outline"
                                            onClick={handleCheckSync}
                                            disabled={setupRunning || !projectId}
                                        >
                                            📊 Preview Sync Status
                                        </Button>
                                        <Button 
                                            className="w-full rounded-2xl py-5 font-bold text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                                            variant="outline"
                                            onClick={handleDisconnect}
                                            disabled={busy || !projectId}
                                        >
                                            🔌 Disconnect Custom DB
                                        </Button>
                                    </div>
                                    {resultMsg && resultMsg !== DEFAULT_INSTRUCTIONS_MSG() && (
                                        <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-emerald-600 font-bold text-xs">
                                            {resultMsg}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Collapsible Manual Configurations Section - Shown only if automated setup/check fails */}
                    {hasFailed && (
                        <Card className="border border-red-200 dark:border-red-900/30 bg-red-500/5 rounded-3xl overflow-hidden animate-in slide-in-from-top-4 duration-300">
                            <div className="p-5 flex justify-between items-center border-b border-red-200 dark:border-red-900/30 bg-red-500/10">
                                <h4 className="text-sm font-black flex items-center gap-2 text-red-800 dark:text-red-300">
                                    <Sliders className="w-4 h-4 text-red-600 dark:text-red-400" />
                                    Automated Step Failed? Setup Manually
                                </h4>
                                <button 
                                    onClick={() => setActiveTab(activeTab === 'project' ? 'rules' : 'project')} 
                                    className="text-xs font-bold text-red-800 dark:text-red-300 hover:underline"
                                >
                                    {activeTab === 'project' ? 'Show Manual Setup Details' : 'Hide Details'}
                                </button>
                            </div>
                            {activeTab !== 'project' && (
                                <CardContent className="p-6 space-y-6 bg-card">
                                    <div className="flex gap-2 border-b border-border/40 pb-3 overflow-x-auto">
                                        {[
                                            { id: 'auth', label: 'Auth settings', icon: Globe },
                                            { id: 'rules', label: 'Firestore rules', icon: ShieldCheck },
                                            { id: 'indexes', label: 'Indexes structure', icon: FileCode }
                                        ].map(tab => (
                                            <button
                                                key={tab.id}
                                                onClick={() => setActiveTab(tab.id as any)}
                                                className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase transition-all ${
                                                    activeTab === tab.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted/60'
                                                }`}
                                            >
                                                {tab.label}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="space-y-4">
                                        {activeTab === 'auth' && (
                                            <div className="space-y-3">
                                                <p className="text-xs text-muted-foreground leading-normal">
                                                    Add RentSutra root domains to your <a href={consoleLinks.authSettings} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-bold">Authorized Domains Console</a>:
                                                </p>
                                                <ul className="list-disc pl-5 text-xs font-mono text-foreground space-y-1">
                                                    <li>rentsutra.in</li>
                                                    <li>localhost (for testing)</li>
                                                </ul>
                                                <p className="text-xs text-muted-foreground font-semibold">Also enable Email/Password provider in Sign-In methods.</p>
                                            </div>
                                        )}

                                        {activeTab === 'rules' && (
                                            <div className="space-y-3">
                                                <p className="text-xs text-muted-foreground">Deploy this rule set in your Firestore Rules console:</p>
                                                <div className="relative">
                                                    <pre className="text-[10px] font-mono bg-background p-4 rounded-xl border overflow-x-auto max-h-40">{FIRESTORE_RULES}</pre>
                                                    <Button size="sm" variant="secondary" onClick={() => handleCopy(FIRESTORE_RULES, setCopiedRules)} className="absolute top-2 right-2 h-7 px-3 text-[10px]">
                                                        {copiedRules ? 'Copied' : 'Copy'}
                                                    </Button>
                                                </div>
                                            </div>
                                        )}

                                        {activeTab === 'indexes' && (
                                            <div className="space-y-3">
                                                <p className="text-xs text-muted-foreground">Ensure the following composite indexes exist in your database:</p>
                                                <div className="border rounded-xl divide-y divide-border/40 overflow-hidden bg-background text-[11px]">
                                                    {COMPOSITE_INDEXES.map((idx, i) => (
                                                        <div key={i} className="p-2.5 font-mono grid grid-cols-3">
                                                            <span className="font-bold text-primary col-span-1">{idx.collection}</span>
                                                            <span className="text-muted-foreground col-span-2">{idx.fields}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            )}
                        </Card>
                    )}
                </div>

                {/* Right Column: Connection & Health Monitor */}
                <div className="lg:col-span-5 space-y-6">
                    <Card className="border border-border/60 shadow-xl rounded-3xl overflow-hidden bg-card">
                        <CardHeader className="border-b border-border/40 bg-muted/25 p-6 flex flex-row items-center justify-between">
                            <CardTitle className="text-lg font-black flex items-center gap-2">
                                <Activity className="w-5 h-5 text-primary" />
                                Live Status Monitor
                            </CardTitle>
                            <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-8 rounded-xl font-bold" 
                                onClick={handleVerifyStatus}
                                disabled={setupRunning || !projectId}
                            >
                                <RefreshCw className={`w-3.5 h-3.5 mr-1 ${setupRunning ? 'animate-spin' : ''}`} />
                                Verify
                            </Button>
                        </CardHeader>
                        
                        <CardContent className="p-6 space-y-6">
                            
                            {/* Live Verification dashboard */}
                            {setupStatus ? (
                                <div className="space-y-4">
                                    <div className="divide-y divide-border/40">
                                        <div className="flex justify-between items-center py-2.5 text-xs">
                                            <span className="font-bold text-muted-foreground">Firestore Security Rules</span>
                                            <span className={`font-black uppercase flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] ${
                                                setupStatus.rules.status === 'DEPLOYED' 
                                                    ? 'text-emerald-600 bg-emerald-500/10' 
                                                    : 'text-red-500 bg-red-500/10'
                                            }`}>
                                                {setupStatus.rules.status === 'DEPLOYED' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <ServerCrash className="w-3.5 h-3.5" />}
                                                {setupStatus.rules.status}
                                            </span>
                                        </div>
                                        
                                        {setupStatus.indexes.map((idx, indexKey) => (
                                            <div key={indexKey} className="flex justify-between items-center py-2.5 text-xs gap-3">
                                                <div className="min-w-0">
                                                    <span className="font-bold text-foreground block truncate">{idx.collection}</span>
                                                    <span className="text-muted-foreground block text-[9px] font-mono leading-none truncate mt-0.5">{idx.fields}</span>
                                                </div>
                                                <span className={`font-black uppercase flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] shrink-0 ${
                                                    idx.status === 'CONFIGURED' 
                                                        ? 'text-emerald-600 bg-emerald-500/5' 
                                                        : idx.status.startsWith('ERROR') ? 'text-red-500 bg-red-500/5' : 'text-amber-500 bg-amber-500/5'
                                                }`}>
                                                    {idx.status === 'CONFIGURED' ? <CheckCircle2 className="w-3 h-3" /> : <ServerCrash className="w-3 h-3" />}
                                                    {idx.status}
                                                </span>
                                            </div>
                                        ))}

                                        <div className="flex justify-between items-start py-2.5 text-xs">
                                            <span className="font-bold text-muted-foreground mt-1">Authorized login domains</span>
                                            <div className="flex flex-wrap gap-1 justify-end max-w-xs">
                                                {setupStatus.domains.length > 0 ? (
                                                    setupStatus.domains.map((dom, i) => (
                                                        <span key={i} className="bg-muted border rounded px-1.5 py-0.5 font-mono text-[9px] font-bold text-foreground">
                                                            {dom}
                                                        </span>
                                                     ))
                                                ) : (
                                                    <span className="text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full text-[9px] font-black uppercase">MISSING</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8 bg-muted/10 rounded-2xl border border-dashed border-border/60">
                                    <Info className="w-8 h-8 text-muted-foreground/60 mx-auto mb-2" />
                                    <p className="text-xs text-muted-foreground font-bold">No live configuration checks run yet.</p>
                                    <p className="text-[10px] text-muted-foreground mt-1">Input your Project credentials and click Verify above.</p>
                                </div>
                            )}

                            {/* Diagnostics Console and Handshake */}
                            <div className="border-t border-border/40 pt-5 space-y-3">
                                <h4 className="text-xs font-black text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                    <Terminal className="w-4 h-4" /> Client Database Handshake
                                </h4>
                                <Button variant="outline" className="w-full rounded-xl py-4 font-bold text-xs" onClick={handleTestConnection}>
                                    Run Double-Ended Read/Write Check
                                </Button>
                                {testMsg && (
                                    <div className="p-3 bg-black text-emerald-400 rounded-xl text-[10px] font-semibold font-mono flex items-start gap-2 shadow-inner border border-emerald-500/20 max-h-32 overflow-y-auto leading-normal">
                                        <Terminal className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                        <span className="whitespace-pre-wrap">{testMsg}</span>
                                    </div>
                                )}

                                {/* Sync Comparison Table */}
                                {syncComparison && (
                                    <div className="mt-3 rounded-xl border border-border/60 overflow-hidden">
                                        <div className="bg-muted/30 px-3 py-2 border-b border-border/40 flex items-center justify-between">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">📊 Sync Status — All Collections</span>
                                            <button onClick={() => setSyncComparison(null)} className="text-[9px] text-muted-foreground hover:text-foreground font-bold">✕ Clear</button>
                                        </div>
                                        <table className="w-full text-[10px]">
                                            <thead>
                                                <tr className="border-b border-border/30 bg-muted/10">
                                                    <th className="text-left px-3 py-1.5 font-black text-muted-foreground">Collection</th>
                                                    <th className="text-right px-2 py-1.5 font-black text-muted-foreground">Central</th>
                                                    <th className="text-right px-2 py-1.5 font-black text-muted-foreground">Custom</th>
                                                    <th className="text-right px-3 py-1.5 font-black text-muted-foreground">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border/20">
                                                {Object.entries(syncComparison).map(([col, stats]) => {
                                                    const s = stats as any;
                                                    const isOut = s.sourceCount !== s.targetCount;
                                                    const isEmpty = s.sourceCount === 0 && s.targetCount === 0;
                                                    return (
                                                        <tr key={col} className={isOut ? 'bg-amber-500/5' : ''}>
                                                            <td className="px-3 py-1.5 font-mono font-bold text-foreground">{col}</td>
                                                            <td className="px-2 py-1.5 text-right font-bold text-muted-foreground">{s.sourceCount}</td>
                                                            <td className="px-2 py-1.5 text-right font-bold text-muted-foreground">{s.targetCount}</td>
                                                            <td className="px-3 py-1.5 text-right">
                                                                {isEmpty ? (
                                                                    <span className="text-muted-foreground/60 font-bold">— empty</span>
                                                                ) : isOut ? (
                                                                    <span className="text-amber-600 font-black bg-amber-500/10 px-1.5 py-0.5 rounded-full">⚠ OUT OF SYNC</span>
                                                                ) : (
                                                                    <span className="text-emerald-600 font-black">✓ synced</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Google OAuth Option has been integrated inline in Step 2 */}
                </div>
            </div>
        </div>
    );
}
