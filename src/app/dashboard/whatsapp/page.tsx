

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
    const [isSubDialogOpen, setIsSubDialogOpen] = useState(false);
    const [isRecharging, setIsRecharging] = useState(false);
    const { toast } = useToast();

    const [notificationSettings, setNotificationSettings] = useState(() => {
        const initialState: Record<string, { tenant: boolean; owner: boolean }> = {};
        notificationEvents.flatMap(g => g.events).forEach(event => {
            initialState[event.id] = { tenant: event.tenant, owner: event.owner };
        });
        return initialState;
    });

    const handleToggle = (eventId: string, type: 'tenant' | 'owner') => {
        setNotificationSettings(prev => ({
            ...prev,
            [eventId]: { ...prev[eventId], [type]: !prev[eventId][type] }
        }));
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
    const messagesRemaining = Math.floor(availableCredits / 1.5);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold flex items-center gap-2"><MessageCircle /> WhatsApp Automation Center</h1>
                <p className="text-muted-foreground">Manage your automated notifications and credits here.</p>
            </div>
            
            <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>How It Works</AlertTitle>
                <AlertDescription>
                    Each WhatsApp message sent costs ₹1.50 from your credit wallet. Toggle which notifications you and your tenants receive.
                </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-2">
                     <Tabs defaultValue="settings" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="settings"><Settings className="w-4 h-4 mr-2"/>Settings</TabsTrigger>
                            <TabsTrigger value="usage"><History className="w-4 h-4 mr-2"/>Usage History</TabsTrigger>
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
                                                            <Switch id={`${event.id}-tenant`} disabled={!event.tenant} checked={event.tenant && notificationSettings[event.id].tenant} onCheckedChange={() => handleToggle(event.id, 'tenant')} />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Switch id={`${event.id}-owner`} disabled={!event.owner} checked={event.owner && notificationSettings[event.id].owner} onCheckedChange={() => handleToggle(event.id, 'owner')} />
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </React.Fragment>
                                        ))}
                                    </TableBody>
                                </Table>
                                </CardContent>
                                <CardFooter className="sticky bottom-0 bg-background/95 border-t py-4">
                                    <Button>Save Settings</Button>
                                </CardFooter>
                            </TabsContent>
                            <TabsContent value="usage" className="m-0">
                                <CardHeader><CardTitle>Usage History</CardTitle><CardDescription>This feature is coming soon.</CardDescription></CardHeader>
                                <CardContent><p className="text-center text-sm text-muted-foreground py-10">(A log of all automated messages sent from your account will be shown here)</p></CardContent>
                            </TabsContent>
                        </Card>
                     </Tabs>
                </div>
                
                <div className="lg:col-span-1 space-y-6 lg:sticky top-20">
                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Wallet /> Credit Wallet</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="text-center p-4 border rounded-lg bg-muted/40">
                                <p className="text-sm text-muted-foreground">Available Balance</p>
                                <p className="text-4xl font-bold flex items-center justify-center">
                                  <IndianRupee className="w-8 h-8"/>{availableCredits.toFixed(2)}
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-center">
                                <div>
                                    <p className="text-sm text-muted-foreground">Messages Remaining</p>
                                    <p className="font-bold text-lg">~{messagesRemaining}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Credits Valid Until</p>
                                    <p className="font-bold text-lg">Dec 2025</p>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="flex-col gap-2">
                             <div className="flex gap-2 w-full">
                                <Button className="flex-1" onClick={() => handleRecharge(200)} disabled={isRecharging}>
                                    {isRecharging && <Loader2 className="w-4 h-4 mr-2 animate-spin"/>}
                                    Add ₹200
                                </Button>
                                <Button className="flex-1" onClick={() => handleRecharge(500)} disabled={isRecharging}>
                                     {isRecharging && <Loader2 className="w-4 h-4 mr-2 animate-spin"/>}
                                    Add ₹500
                                </Button>
                            </div>
                             <Button className="w-full" variant="outline" onClick={() => handleRecharge(1000)} disabled={isRecharging}>
                                {isRecharging && <Loader2 className="w-4 h-4 mr-2 animate-spin"/>}
                                Add ₹1000 or More
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </div>
    );
}
