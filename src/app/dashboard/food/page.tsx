import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { UtensilsCrossed } from "lucide-react"

export default function FoodPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold font-headline flex items-center gap-2">
          <UtensilsCrossed className="w-8 h-8 text-primary" /> Food Management
        </h1>
        <p className="text-muted-foreground">Manage daily menus and food-related expenses.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>
            This section is under development. You'll soon be able to manage your PG's food menu, track inventory, and handle food expenses here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Thank you for your patience!</p>
        </CardContent>
      </Card>
    </div>
  )
}
