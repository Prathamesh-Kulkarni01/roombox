

'use client'

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { IndianRupee, MessageCircle, Info, Settings, History, Wallet, User, Bell, FileText, CheckCircle, UserPlus, LogOut, AlertCircle, BarChart, Plus, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import SubscriptionDialog from '@/components/dashboard/dialogs/SubscriptionDialog';
import { useAppSelector } from '@/lib/hooks';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { fetchWhatsAppLogs, updateWhatsAppSettings } from '@/lib/actions/whatsappActions';
import { format } from 'date-fns';
import { setCurrentUser } from '@/lib/slices/userSlice';
import { useDispatch } from 'react-redux';
import { fetchUserData } from '@/lib/actions/userActions';

const notificationEvents = [
    {
        category: 'Financial',
        events: [
            { id: 'rent-reminder-due', title: 'Rent Overdue', desc: 'Sent when rent is overdue.', icon: AlertCircle, tenant: true, owner: false },
            { id: 'rent-reminder-upcoming', title: 'Rent Reminder', desc: 'Sent a few days before the due date.', icon: Bell, tenant: true, owner: false },
            { id: 'payment-confirmation-tenant', title: 'Payment Confirmation (Tenant)', desc: 'Digital receipt sent to tenant on payment.', icon: CheckCircle, tenant: true, owner: false },
            { id: 'payment-confirmation-owner', title: 'Payment Received (Owner)', desc: 'Instant alert to you when rent is paid online.', icon: IndianRupee, tenant: false, owner: true },
        ]
    },
    {
        category: 'Operations',
        events: [
            { id: 'new-complaint', title: 'New Complaint', desc: 'Alerts you when a tenant raises an issue.', icon: MessageCircle, tenant: false, owner: true },
            { id: 'complaint-update', title: 'Complaint Status Update', desc: 'Informs tenant when their issue status changes.', icon: CheckCircle, tenant: true, owner: false },
            { id: 'announcement', title: 'Notice Board', desc: 'Broadcasts general announcements to tenants.', icon: MessageCircle, tenant: true, owner: false },
        ]
    },
    {
        category: 'Guest Lifecycle',
        events: [
            { id: 'new-guest', title: 'New Guest Onboarded', desc: 'Welcomes new tenant and informs owner.', icon: UserPlus, tenant: true, owner: true },
            { id: 'kyc-update', title: 'KYC Status Update', desc: 'Informs tenant if KYC is approved or rejected.', icon: FileText, tenant: true, owner: false },
            { id: 'guest-exit', title: 'Guest Exit Initiated', desc: 'Notifies you when a guest starts their notice period.', icon: LogOut, tenant: false, owner: true },
        ]
    }
];

export default function WhatsAppPage() {
    const { currentUser, currentPlan } = useAppSelector(state => state.user);
    const dispatch = useDispatch();
    const [isSubDialogOpen, setIsSubDialogOpen] = useState(false);
    const [isRecharging, setIsRecharging] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    const [notificationSettings, setNotificationSettings] = useState<Record<string, { tenant: boolean, owner: boolean }>>({});
    const [logs, setLogs] = useState<any[]>([]);
    const [isLoadingLogs, setIsLoadingLogs] = useState(false);

    // Initialize/Load settings
    React.useEffect(() => {
        if (currentUser) {
            if (currentUser.subscription?.whatsappSettings) {
                setNotificationSettings(currentUser.subscription.whatsappSettings);
            } else {
                const settings: any = {};
                notificationEvents.forEach(group => {
                    group.events.forEach(event => {
                        settings[event.id] = {
                            tenant: event.tenant,
                            owner: event.owner
                        };
                    });
                });
                setNotificationSettings(settings);
            }
        }
    }, [currentUser]);

    const handleToggle = (eventId: string, type: 'tenant' | 'owner') => {
        setNotificationSettings(prev => ({
            ...prev,
            [eventId]: {
                ...prev[eventId],
                [type]: !prev[eventId][type]
            }
        }));
    };

    const handleSaveSettings = async () => {
        if (!currentUser) return;
        setIsSaving(true);
        const res = await updateWhatsAppSettings(currentUser.id, notificationSettings);
        if (res.success) {
            toast({ title: 'Settings Saved', description: 'Your notification preferences have been updated.' });
            // Update redux state to keep in sync
            const updatedUser = {
                ...currentUser,
                subscription: {
                    ...currentUser.subscription!,
                    whatsappSettings: notificationSettings
                }
            };
            dispatch(setCurrentUser(updatedUser));
        } else {
            toast({ variant: 'destructive', title: 'Save Failed', description: res.error || 'Failed to update settings.' });
        }
        setIsSaving(false);
    };

    React.useEffect(() => {
        if (currentUser) {
            loadLogs();
        }
    }, [currentUser]);

    const loadLogs = async () => {
        if (!currentUser) return;
        setIsLoadingLogs(true);

        // Refresh user data to get latest credits
        const userRes = await fetchUserData(currentUser.id);
        if (userRes.success && userRes.user) {
            dispatch(setCurrentUser(userRes.user as any));
        }

        const res = await fetchWhatsAppLogs(currentUser.id);
        if (res.success) {
            setLogs(res.logs);
        }
        setIsLoadingLogs(false);
    };

    const handleRecharge = async (amount: number) => {
        if (!currentUser) return;
        setIsRecharging(true);

        try {
            const res = await fetch('/api/razorpay/create-whatsapp-recharge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ownerId: currentUser.id, amount }),
            });
            const { success, order, error } = await res.json();
            if (!success || !order) throw new Error(error || 'Failed to create recharge order.');

            const options = {
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                amount: order.amount,
                currency: order.currency,
                name: 'RentSutra Wallet Recharge',
                description: `Add ₹${amount} to your WhatsApp credit wallet.`,
                order_id: order.id,
                handler: (response: any) => {
                    toast({ title: 'Recharge Successful!', description: 'Your new balance will reflect shortly.' });
                },
                prefill: { name: currentUser.name, email: currentUser.email, contact: currentUser.phone },
                theme: { color: '#2563EB' }
            };

            const rzp = new (window as any).Razorpay(options);
            rzp.on('payment.failed', (response: any) => {
                toast({ variant: 'destructive', title: 'Payment Failed', description: response.error.description || 'Something went wrong.' });
            });
            rzp.open();

        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Error', description: err.message || 'Could not initiate recharge.' });
        } finally {
            setIsRecharging(false);
        }
    };

    if (currentPlan && !currentPlan.hasAutomatedWhatsapp) {
        return (
            <>
                <SubscriptionDialog open={isSubDialogOpen} onOpenChange={setIsSubDialogOpen} />
                <Card>
                    <CardHeader>
                        <CardTitle>WhatsApp Automation</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col items-center justify-center text-center p-8 bg-muted/50 rounded-lg border">
                            <MessageCircle className="mx-auto h-12 w-12 text-primary" />
                            <h2 className="mt-4 text-xl font-semibold">Feature Not Available</h2>
                            <p className="mt-2 text-muted-foreground max-w-sm">WhatsApp Automation is a premium feature. Please upgrade your plan to automate your communications.</p>
                            <Button className="mt-4" onClick={() => setIsSubDialogOpen(true)}>Upgrade Plan</Button>
                        </div>
                    </CardContent>
                </Card>
            </>
        )
    }

    const availableCredits = currentUser?.subscription?.whatsappCredits || 0;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold flex items-center gap-2"><MessageCircle /> WhatsApp Automation Center</h1>
                <p className="text-muted-foreground">Manage your automated notifications and credits here.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-2">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2"><Wallet className="w-5 h-5" /> Credit Wallet</CardTitle>
                        <CardDescription>Your current balance and message estimates.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col md:flex-row gap-6 items-center">
                            <div className="flex-1 text-center md:text-left p-4 border rounded-lg bg-muted/40 w-full">
                                <p className="text-sm text-muted-foreground">Available Balance</p>
                                <p className="text-4xl font-bold flex items-center justify-center md:justify-start">
                                    <IndianRupee className="w-8 h-8" />{availableCredits.toFixed(2)}
                                </p>
                            </div>
                            <div className="flex-1 grid grid-cols-2 gap-4 text-center w-full">
                                <div className="p-3 border rounded-lg bg-background">
                                    <p className="text-xs text-muted-foreground">Est. Templates Left</p>
                                    <p className="font-bold text-lg">~{Math.floor(availableCredits / 1.5)}</p>
                                </div>
                                <div className="p-3 border rounded-lg bg-background">
                                    <p className="text-xs text-muted-foreground">Credits Valid Until</p>
                                    <p className="font-bold text-lg">Dec 2025</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Recharge Credits</CardTitle>
                        <CardDescription>Top up your wallet instantly.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex gap-2">
                            <Button className="flex-1" size="sm" onClick={() => handleRecharge(200)} disabled={isRecharging}>
                                {isRecharging && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
                                ₹200
                            </Button>
                            <Button className="flex-1" size="sm" onClick={() => handleRecharge(500)} disabled={isRecharging}>
                                {isRecharging && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
                                ₹500
                            </Button>
                        </div>
                        <Button className="w-full" variant="outline" size="sm" onClick={() => handleRecharge(1000)} disabled={isRecharging}>
                            {isRecharging && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
                            ₹1000 or More
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>How It Works</AlertTitle>
                <AlertDescription>
                    WhatsApp messages are billed based on type.
                    <b> Templates: ₹1.50</b>, <b>Auth (OTP): ₹2.50</b>, <b>Session: ₹0.50</b>.
                    <i>Messages within a 24h session window are FREE.</i>
                </AlertDescription>
            </Alert>

            <div className="w-full">
                <div className="w-full">
                    <Tabs defaultValue="settings" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="settings"><Settings className="w-4 h-4 mr-2" />Settings</TabsTrigger>
                            <TabsTrigger value="usage"><History className="w-4 h-4 mr-2" />Usage History</TabsTrigger>
                        </TabsList>
                        <Card className="mt-4">
                            <TabsContent value="settings" className="m-0">
                                <CardHeader>
                                    <CardTitle>Notification Settings</CardTitle>
                                    <CardDescription>Enable or disable automated WhatsApp notifications for specific events.</CardDescription>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-[50%]">Event</TableHead>
                                                <TableHead>Send to Tenant</TableHead>
                                                <TableHead>Send to Owner</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {notificationEvents.map(group => (
                                                <React.Fragment key={group.category}>
                                                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                                                        <TableCell colSpan={3} className="font-semibold text-foreground">{group.category}</TableCell>
                                                    </TableRow>
                                                    {group.events.map(event => (
                                                        <TableRow key={event.id}>
                                                            <TableCell>
                                                                <div className="flex items-center gap-3">
                                                                    <div className="p-2 bg-muted rounded-full">
                                                                        <event.icon className="w-4 h-4 text-primary" />
                                                                    </div>
                                                                    <div>
                                                                        <p className="font-medium">{event.title}</p>
                                                                        <p className="text-xs text-muted-foreground">{event.desc}</p>
                                                                    </div>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Switch id={`${event.id}-tenant`} disabled={!event.tenant} checked={event.tenant && !!notificationSettings[event.id]?.tenant} onCheckedChange={() => handleToggle(event.id, 'tenant')} />
                                                            </TableCell>
                                                            <TableCell>
                                                                <Switch id={`${event.id}-owner`} disabled={!event.owner} checked={event.owner && !!notificationSettings[event.id]?.owner} onCheckedChange={() => handleToggle(event.id, 'owner')} />
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </React.Fragment>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                                <CardFooter className="sticky bottom-0 bg-background/95 border-t py-4">
                                    <Button onClick={handleSaveSettings} disabled={isSaving}>
                                        {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                        Save Settings
                                    </Button>
                                </CardFooter>
                            </TabsContent>
                            <TabsContent value="usage" className="m-0">
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle>Usage History</CardTitle>
                                            <CardDescription>A log of your WhatsApp message credits and interactions.</CardDescription>
                                        </div>
                                        <Button variant="ghost" size="sm" onClick={loadLogs} disabled={isLoadingLogs}>
                                            <Plus className={`w-4 h-4 mr-2 ${isLoadingLogs ? 'animate-spin' : ''}`} /> Refresh
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Recipient</TableHead>
                                                <TableHead>Type</TableHead>
                                                <TableHead>Cost</TableHead>
                                                <TableHead>Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {logs.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                                                        {isLoadingLogs ? 'Loading history...' : 'No usage history found.'}
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                logs.map((log: any) => (
                                                    <TableRow key={log.id}>
                                                        <TableCell className="text-xs">
                                                            {log.timestamp ? format(new Date(log.timestamp), 'MMM dd, HH:mm') : 'N/A'}
                                                        </TableCell>
                                                        <TableCell className="font-mono text-xs">{log.phone}</TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className="capitalize text-[10px]">{log.type}</Badge>
                                                            {log.direction === 'inbound' && <Badge className="ml-1 bg-blue-100 text-blue-700 text-[10px]">IN</Badge>}
                                                        </TableCell>
                                                        <TableCell className="font-semibold text-primary">₹{log.cost.toFixed(2)}</TableCell>
                                                        <TableCell>
                                                            <Badge variant={log.status === 'success' ? 'default' : 'destructive'} className="text-[10px]">
                                                                {log.status === 'success' ? 'Success' : 'Failed'}
                                                            </Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </TabsContent>
                        </Card>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}
