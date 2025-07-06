import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Wallet } from "lucide-react"

export default function ExpensePage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold font-headline flex items-center gap-2">
            <Wallet className="w-8 h-8 text-primary" /> Expense Tracking
        </h1>
        <p className="text-muted-foreground">Keep track of all your PG-related expenses.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>
            This section is under development. You'll soon be able to log expenses, categorize them, and view financial reports for your PG.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Thank you for your patience!</p>
        </CardContent>
      </Card>
    </div>
  )
}
