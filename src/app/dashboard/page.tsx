import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Users, IndianRupee, MessageSquareWarning, Building } from "lucide-react"

export default function DashboardPage() {
  const stats = [
    { title: "Total Occupancy", value: "78%", icon: Users, change: "+5.2% from last month" },
    { title: "Monthly Revenue", value: "₹2,45,600", icon: IndianRupee, change: "+12.1% from last month" },
    { title: "Open Complaints", value: "3", icon: MessageSquareWarning, change: "-1 from yesterday" },
    { title: "Total PGs", value: "4", icon: Building, change: "" },
  ]

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, here's a summary of your PGs.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              {stat.change && <p className="text-xs text-muted-foreground">{stat.change}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
              <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                  <p>Placeholder for recent tenant check-ins, rent payments, and new complaints.</p>
              </CardContent>
          </Card>
          <Card>
              <CardHeader>
                  <CardTitle>Occupancy Overview</CardTitle>
              </CardHeader>
              <CardContent>
                  <p>Placeholder for a chart showing occupancy rates across different PGs.</p>
              </CardContent>
          </Card>
      </div>
    </div>
  )
}
