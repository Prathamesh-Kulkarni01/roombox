
'use client'

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { plans } from "@/lib/mock-data"
import type { PlanName } from "@/lib/types"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { updateUserPlan as updateUserPlanAction } from "@/lib/slices/userSlice"

export default function SettingsPage() {
  const dispatch = useAppDispatch()
  const [notificationMethod, setNotificationMethod] = useState("manual")
  const { currentUser, currentPlan } = useAppSelector((state) => state.user)

  if (!currentUser || !currentPlan) {
    return null // Or a loading state
  }

  const handlePlanChange = (planId: PlanName) => {
      dispatch(updateUserPlanAction(planId));
  }

  return (
    <div className="flex flex-col gap-8">
      <Card>
        <CardHeader>
          <CardTitle>Owner Profile</CardTitle>
          <CardDescription>Your account and subscription details.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} />
            <AvatarFallback>{currentUser.name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-lg font-semibold">{currentUser.name}</p>
            <p className="text-muted-foreground">{currentUser.email}</p>
            <p className="text-sm text-muted-foreground capitalize">{currentUser.role} - <span className="font-medium text-primary">{currentPlan.name} Plan</span></p>
          </div>
        </CardContent>
      </Card>
      
       <Card>
        <CardHeader>
          <CardTitle>Developer Settings</CardTitle>
          <CardDescription>For development and testing purposes only.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Warning</AlertTitle>
                <AlertDescription>
                    Changing your plan here is for development testing and does not reflect a real subscription change.
                </AlertDescription>
            </Alert>
            <div className="grid gap-2 max-w-sm">
                <Label htmlFor="plan-switcher">Switch Plan</Label>
                <Select
                    value={currentPlan.id}
                    onValueChange={(planId) => handlePlanChange(planId as PlanName)}
                >
                    <SelectTrigger id="plan-switcher">
                        <SelectValue placeholder="Select a plan" />
                    </SelectTrigger>
                    <SelectContent>
                        {Object.values(plans).map(plan => (
                            <SelectItem key={plan.id} value={plan.id}>
                                {plan.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
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
