'use client'

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

export default function SettingsPage() {
  const [notificationMethod, setNotificationMethod] = useState("manual")

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Settings</h1>
        <p className="text-muted-foreground">Manage your PG and application settings.</p>
      </div>

       <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <CardDescription>
            Configure general settings for your properties.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="grid gap-2 max-w-sm">
                <Label htmlFor="notice-period">Default Notice Period (days)</Label>
                <Input id="notice-period" type="number" defaultValue="30" />
            </div>
            <Button>Save General Settings</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notification Settings</CardTitle>
          <CardDescription>
            Configure how you send WhatsApp notifications to your guests.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup 
            value={notificationMethod} 
            onValueChange={setNotificationMethod}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <Label htmlFor="manual" className="flex flex-col items-start gap-3 rounded-lg border p-4 cursor-pointer hover:bg-accent/50 [&:has([data-state=checked])]:border-primary transition-colors">
               <div className="flex items-center gap-3">
                <RadioGroupItem value="manual" id="manual" />
                <span className="font-bold text-base">Manual WhatsApp</span>
               </div>
              <p className="text-sm text-muted-foreground ml-7">
                Manually send pre-generated messages from your own WhatsApp account. No setup required.
              </p>
            </Label>
            <Label htmlFor="automated" className="flex flex-col items-start gap-3 rounded-lg border p-4 cursor-pointer hover:bg-accent/50 [&:has([data-state=checked])]:border-primary transition-colors">
              <div className="flex items-center gap-3">
                <RadioGroupItem value="automated" id="automated" />
                <span className="font-bold text-base">Automated via Business API</span>
              </div>
              <p className="text-sm text-muted-foreground ml-7">
                Automatically send reminders and receipts using the WhatsApp Business API.
              </p>
            </Label>
          </RadioGroup>

          {notificationMethod === 'automated' && (
            <div className="space-y-4 pt-6 border-t">
               <div className="grid gap-2 max-w-sm">
                <Label htmlFor="api-key">WhatsApp API Key</Label>
                <Input id="api-key" type="password" placeholder="Enter your WhatsApp Business API Key" />
                <p className="text-sm text-muted-foreground">Your API key is stored securely.</p>
              </div>
              <div>
                <Label>Monthly Usage</Label>
                 <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
                    <Card className="p-4">
                        <p className="text-sm text-muted-foreground">Messages Sent</p>
                        <p className="text-2xl font-bold">750</p>
                    </Card>
                     <Card className="p-4">
                        <p className="text-sm text-muted-foreground">Free Messages Left</p>
                        <p className="text-2xl font-bold">250</p>
                    </Card>
                     <Card className="p-4 hidden md:block">
                        <p className="text-sm text-muted-foreground">Total Allocation</p>
                        <p className="text-2xl font-bold">1000</p>
                    </Card>
                 </div>
              </div>
            </div>
          )}

           <Button>Save Notification Settings</Button>
        </CardContent>
      </Card>
      
    </div>
  )
}
