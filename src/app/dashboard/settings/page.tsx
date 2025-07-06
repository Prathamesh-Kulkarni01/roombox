import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Settings</h1>
        <p className="text-muted-foreground">Manage your PG and application settings.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>PG Settings</CardTitle>
          <CardDescription>
            Configure general settings for your properties.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="grid gap-2">
                <Label htmlFor="notice-period">Default Notice Period (days)</Label>
                <Input id="notice-period" type="number" defaultValue="30" />
            </div>
            <Button>Save Settings</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Room & Bed Configuration</CardTitle>
          <CardDescription>
            Add or remove floors, rooms, and beds from your PGs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Detailed room and bed configuration options will be available here in a future update.</p>
        </CardContent>
      </Card>
    </div>
  )
}
