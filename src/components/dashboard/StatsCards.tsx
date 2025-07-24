
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import Access from "@/components/ui/PermissionWrapper";

interface Stat {
  title: string;
  value: string | number;
  icon: React.ElementType;
  feature: string;
  action: string;
}

interface StatsCardsProps {
  stats: Stat[];
}

export default function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Access key={stat.title} feature={stat.feature} action={stat.action}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-xl md:text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        </Access>
      ))}
    </div>
  )
}
