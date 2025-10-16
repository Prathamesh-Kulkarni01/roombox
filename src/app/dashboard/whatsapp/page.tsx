
'use client'

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { IndianRupee, MessageCircle, Info, Settings, History, Wallet, User, Bell, FileText, CheckCircle, UserPlus, LogOut, AlertCircle, BarChart, Plus } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import SubscriptionDialog from '@/components/dashboard/dialogs/SubscriptionDialog';
import { useAppSelector } from '@/lib/hooks';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from '@/components/ui/badge';

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

const mockRechargeHistory = [
    { id: 'rh_1', date: '2024-07-25', amount: 500, messagesAdded: 333, status: 'Success' },
    { id: 'rh_2', date: '2024-06-20', amount: 200, messagesAdded: 133, status: 'Success' },
    { id: 'rh_3', date: '2024-05-18', amount: 500, messagesAdded: 333, status: 'Success' },
]

const mockUsageHistory = [
    { id: 'uh_1', date: '2024-07-28', type: 'Rent Reminder', to: 'Priya S.', cost: 1.5 },
    { id: 'uh_2', date: '2024-07-28', type: 'Rent Reminder', to: 'Amit K.', cost: 1.5 },
    { id: 'uh_3', date: '2024-07-27', type: 'Complaint Update', to: 'Rohan V.', cost: 1.5 },
    { id: 'uh_4', date: '2024-07-26', type: 'Notice Board', to: 'All Tenants (Sunshine PG)', cost: 30.0 },
    { id: 'uh_5', date: '2024-07-25', type: 'Payment Received', to: 'Owner', cost: 1.5 },
]


export default function WhatsAppPage() {
    const { currentPlan } = useAppSelector(state => state.user);
    const [isSubDialogOpen, setIsSubDialogOpen] = useState(false);
    
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
                    Each message sent costs credits from your wallet. Toggle which notifications you and your tenants receive.
                </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-2">
                     <Tabs defaultValue="settings" className="w-full">
                        <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="settings"><Settings className="w-4 h-4 mr-2"/>Settings</TabsTrigger>
                            <TabsTrigger value="usage"><History className="w-4 h-4 mr-2"/>Usage History</TabsTrigger>
                            <TabsTrigger value="recharge"><Wallet className="w-4 h-4 mr-2"/>Recharge History</TabsTrigger>
                            <TabsTrigger value="analytics"><BarChart className="w-4 h-4 mr-2"/>Analytics</TabsTrigger>
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
                                <CardHeader><CardTitle>Usage History</CardTitle><CardDescription>A log of all automated messages sent from your account.</CardDescription></CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Recipient</TableHead><TableHead className="text-right">Cost</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {mockUsageHistory.map(item => (
                                                <TableRow key={item.id}><TableCell>{item.date}</TableCell><TableCell>{item.type}</TableCell><TableCell>{item.to}</TableCell><TableCell className="text-right">₹{item.cost.toFixed(2)}</TableCell></TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </TabsContent>
                             <TabsContent value="recharge" className="m-0">
                                <CardHeader><CardTitle>Recharge History</CardTitle><CardDescription>A record of all your wallet top-ups.</CardDescription></CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Amount</TableHead><TableHead>Messages Added</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {mockRechargeHistory.map(item => (
                                                <TableRow key={item.id}><TableCell>{item.date}</TableCell><TableCell>₹{item.amount}</TableCell><TableCell>{item.messagesAdded}</TableCell><TableCell><Badge variant="default">{item.status}</Badge></TableCell></TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </TabsContent>
                             <TabsContent value="analytics" className="m-0">
                                <CardHeader><CardTitle>Usage Analytics</CardTitle><CardDescription>Visual breakdown of your notification costs.</CardDescription></CardHeader>
                                <CardContent><p className="text-center text-sm text-muted-foreground py-10">(Charts and graphs will be displayed here)</p></CardContent>
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
                                  <IndianRupee className="w-8 h-8"/>500.00
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-center">
                                <div>
                                    <p className="text-sm text-muted-foreground">Messages Remaining</p>
                                    <p className="font-bold text-lg">~333</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Credits Valid Until</p>
                                    <p className="font-bold text-lg">Dec 2025</p>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button className="w-full"><Plus className="w-4 h-4 mr-2"/> Recharge Wallet</Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </div>
    );
}
