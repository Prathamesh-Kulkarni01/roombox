
'use client'

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { IndianRupee, MessageCircle, Info, Settings, History, Wallet, User, Bell } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import SubscriptionDialog from '@/components/dashboard/dialogs/SubscriptionDialog';
import { useAppSelector } from '@/lib/hooks';

const notificationEvents = [
    { id: 'rent-reminder-due', title: 'Rent Reminder (Due)', desc: 'Sent when rent is overdue.', tenant: true, owner: false },
    { id: 'rent-reminder-upcoming', title: 'Rent Reminder (Upcoming)', desc: 'Sent a few days before the due date.', tenant: true, owner: false },
    { id: 'payment-confirmation', title: 'Payment Confirmation', desc: 'Sent when a payment is successfully recorded.', tenant: true, owner: true },
    { id: 'new-complaint', title: 'New Complaint Logged', desc: 'Sent when a tenant raises a new issue.', tenant: false, owner: true },
    { id: 'complaint-update', title: 'Complaint Status Update', desc: 'Sent when an issue\'s status changes.', tenant: true, owner: false },
    { id: 'announcement', title: 'General Announcement', desc: 'Sent when you use the notice board.', tenant: true, owner: false },
    { id: 'kyc-update', title: 'KYC Status Update', desc: 'Informs tenant if KYC is approved or rejected.', tenant: true, owner: false },
    { id: 'new-guest', title: 'New Guest Onboarded', desc: 'Informs owner when a guest is added.', tenant: false, owner: true },
    { id: 'guest-exit', title: 'Guest Exit Initiated', desc: 'Notifies owner when a guest starts their notice period.', tenant: false, owner: true },
]


export default function WhatsAppPage() {
    const { currentPlan } = useAppSelector(state => state.user);
    const [isSubDialogOpen, setIsSubDialogOpen] = useState(false);
    
    const [notificationSettings, setNotificationSettings] = useState(() => {
        const initialState: Record<string, { tenant: boolean; owner: boolean }> = {};
        notificationEvents.forEach(event => {
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

    if (!currentPlan?.hasAutomatedWhatsapp) {
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
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><MessageCircle /> WhatsApp Automation Center</CardTitle>
                    <CardDescription>Manage your automated notifications and credits here.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertTitle>How It Works</AlertTitle>
                        <AlertDescription>
                            Each message sent costs credits from your wallet. Toggle which notifications you and your tenants receive.
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Settings /> Notification Settings</CardTitle>
                        <CardDescription>Enable or disable automated WhatsApp notifications for specific events.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {notificationEvents.map(event => (
                            <div key={event.id} className="p-4 border rounded-lg">
                                <h4 className="font-semibold">{event.title}</h4>
                                <p className="text-sm text-muted-foreground mb-3">{event.desc}</p>
                                <div className="flex items-center gap-6">
                                     <div className="flex items-center space-x-2">
                                        <Switch 
                                            id={`${event.id}-tenant`} 
                                            disabled={!event.tenant}
                                            checked={event.tenant && notificationSettings[event.id].tenant}
                                            onCheckedChange={() => handleToggle(event.id, 'tenant')}
                                        />
                                        <Label htmlFor={`${event.id}-tenant`} className="flex items-center gap-1.5"><User className="w-4 h-4"/> Tenant</Label>
                                    </div>
                                     <div className="flex items-center space-x-2">
                                        <Switch 
                                            id={`${event.id}-owner`}
                                            disabled={!event.owner}
                                            checked={event.owner && notificationSettings[event.id].owner}
                                            onCheckedChange={() => handleToggle(event.id, 'owner')}
                                        />
                                        <Label htmlFor={`${event.id}-owner`} className="flex items-center gap-1.5"><Bell className="w-4 h-4"/> Owner</Label>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                    <CardFooter>
                        <Button>Save Settings</Button>
                    </CardFooter>
                </Card>

                <div className="lg:col-span-1 space-y-6 lg:sticky top-20">
                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Wallet /> Credit Balance</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="text-center">
                                <p className="text-muted-foreground">Available Credits</p>
                                <p className="text-4xl font-bold flex items-center justify-center"><IndianRupee className="w-8 h-8"/>500.00</p>
                            </div>
                            <Button className="w-full">Recharge Wallet</Button>
                            <p className="text-xs text-muted-foreground text-center">Current rate: ₹1.5 per message.</p>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><History /> Usage Analytics</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground text-center py-4">(Analytics charts will be shown here)</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

