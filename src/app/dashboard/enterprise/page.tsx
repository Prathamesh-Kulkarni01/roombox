
'use client'

import React, { useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Database, Link } from 'lucide-react';
import { useAppSelector } from '@/lib/hooks';
import { getOwnerClientDb, getDynamicDb, db as defaultDb } from '@/lib/firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

export default function EnterpriseOnboardingPage() {
    const { currentUser } = useAppSelector(state => state.user);

    const [projectId, setProjectId] = useState<string>(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '');
    const [databaseId, setDatabaseId] = useState<string>(() => currentUser ? `owner-${currentUser.id}` : '');
    const [clientConfigText, setClientConfigText] = useState<string>('');
    const [busy,      setBusy] = useState<boolean>(false);
    const [resultMsg, setResultMsg] = useState<string>('');
    const [testMsg,   setTestMsg] = useState<string>('');

    const parsedClientConfig = useMemo(() => {
        if (!clientConfigText?.trim()) return undefined;
        try {
            return JSON.parse(clientConfigText);
        } catch {
            return undefined;
        }
    }, [clientConfigText]);

    const canSubmit = useMemo(() => {
        return !!currentUser?.email && !!projectId && !!databaseId && (clientConfigText.trim().length === 0 || !!parsedClientConfig);
    }, [currentUser?.email, projectId, databaseId, clientConfigText, parsedClientConfig]);

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
            setResultMsg(`Connected! Project: ${data.projectId}, DB: ${data.databaseId}${data.provisioned ? ' (provisioned)' : ''}${data.warning ? `, warning: ${data.warning}` : ''}`);
        } catch (e: any) {
            setResultMsg(e.message || 'Provisioning failed');
        } finally {
            setBusy(false);
        }
    };

    const handleConnectProject = () => {
        const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
        const redirectUri = `${appUrl}/api/oauth/google/callback`;
        const scope = 'https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/firebase https://www.googleapis.com/auth/service.management https://www.googleapis.com/auth/servicecontrol https://www.googleapis.com/auth/cloud-platform.read-only';
        const statePayload = {
            ownerId: currentUser?.id || null,
            projectId: projectId || null,
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
            setTestMsg('Loading');
console.log('currentUser', currentUser);
            if (!currentUser) {
                setTestMsg('Not logged in.');
                return;
            }
            setTestMsg('Loading2');
            const ownerId = currentUser.role === 'owner' ? currentUser.id : currentUser.ownerId;
            if (!ownerId) {
                setTestMsg('Owner ID not found.');
                return;
            }
            setTestMsg('Loading3');
            const cfg = currentUser.subscription?.enterpriseProject?.clientConfig || parsedClientConfig;
            const dbId = currentUser.subscription?.enterpriseProject?.databaseId || databaseId;
            const dbInstance = cfg ? getOwnerClientDb(cfg, dbId) : (dbId ? getDynamicDb(dbId) : defaultDb);
            if (!dbInstance) {
                setTestMsg('DB instance not available.');
                return;
            }
            
            // Helper to avoid indefinite waiting
            const withTimeout = async <T,>(p: Promise<T>, ms = 12000, label = 'operation'): Promise<T> => {
                return await Promise.race([
                    p,
                    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms))
                ]) as T;
            };
            
            setTestMsg('Loading4');
            console.log('cfg', cfg);
            console.log('dbId', dbId);
            console.log('dbInstance', dbInstance);
            const testRef = doc(dbInstance, 'users_data', ownerId, 'connection_tests', 'ping');
            console.log('dbInstance', dbInstance);
            console.log('testRef', testRef);
            
            // UX hint: if named db is used, ensure it exists
            if (dbId && dbId !== '(default)') {
                console.log('[TestConnection] Using named database id:', dbId, '. Ensure this database exists in the target project.');
            }
            
            setTestMsg('Loading55');
            await withTimeout(setDoc(testRef, {
              ts: Date.now(),
              uid: currentUser.id,
            }, { merge: true }), 12000, 'write');
            
            setTestMsg('Loading6');
            const snap = await withTimeout(getDoc(testRef), 12000, 'read');
            setTestMsg('Loading7');
            if (snap.exists()) {
                setTestMsg('Connection OK: Read/Write successful.');
            } else {
                setTestMsg('Write succeeded but read failed. Check rules.');
            }
        } catch (e: any) {
            const msg = e?.message || String(e);
            // Common guidance for dynamic databases
            const hint = msg.includes('timeout') ? ' Possible causes: named database does not exist, network blocked, or rules/auth rejecting silently.' : '';
            setTestMsg(`Connection FAILED: ${msg}.${hint}`);
        }
    };

    return (
        <div className="container mx-auto py-10">
            <Card className="max-w-2xl mx-auto">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Database className="w-6 h-6 text-primary" />
                        Enterprise Setup: Connect Your Private Firebase Database
                    </CardTitle>
                    <CardDescription>
                        Bring your own Firebase project for full data isolation. Choose either: paste your Firebase Web App config and database ID below, or use Google OAuth to auto-provision (may still require billing setup).
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <h3 className="font-semibold">Option A: Provide Existing Project Details</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm mb-1">Project ID</label>
                                <input className="w-full border rounded px-3 py-2"
                                    value={projectId}
                                    onChange={e => setProjectId(e.target.value)}
                                    placeholder="your-firebase-project-id"/>
                            </div>
                            <div>
                                <label className="block text-sm mb-1">Database ID (use (default) if not using secondary DB)</label>
                                <input className="w-full border rounded px-3 py-2"
                                    value={databaseId}
                                    onChange={e => setDatabaseId(e.target.value)}
                                    placeholder="(default) or owner-<ownerId>"/>
                            </div>
                            <div>
                                <label className="block text-sm mb-1">Firebase Web App Client Config (JSON)</label>
                                <textarea className="w-full border rounded px-3 py-2 h-36"
                                    value={clientConfigText}
                                    onChange={e => setClientConfigText(e.target.value)}
                                    placeholder='{"apiKey":"...","authDomain":"...","projectId":"...","storageBucket":"...","messagingSenderId":"...","appId":"...","measurementId":"G-..."}'/>
                                {clientConfigText && !parsedClientConfig && (
                                    <p className="text-xs text-red-600 mt-1">Invalid JSON</p>
                                )}
                            </div>
                            <Button className="w-full" disabled={!canSubmit || busy} onClick={handleProvision}>
                                {busy ? 'Connecting...' : 'Connect to My Firebase Project'}
                            </Button>
                            {resultMsg && <p className="text-sm text-muted-foreground">{resultMsg}</p>}
                            <div className="pt-2">
                                <Button variant="secondary" className="w-full" onClick={handleTestConnection}>
                                    Test Connection (Read/Write)
                                    </Button>
                                    <p className="text-sm text-muted-foreground mt-2">{testMsg}---</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h3 className="font-semibold">Option B: One‑Click (OAuth) Setup</h3>
                        <p className="text-xs text-muted-foreground">Well request permission to create or configure resources in your Google Cloud. You may still need to attach billing once.</p>
                        <Button className="w-full" variant="secondary" onClick={handleConnectProject}>
                            <Link className="mr-2 h-4 w-4" />
                            Continue with Google
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
