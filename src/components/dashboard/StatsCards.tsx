
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
          <Card className="glass shadow-native transition-all duration-300 hover:shadow-native-lg active:scale-95 overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2 relative z-10">
              <CardTitle className="text-xs md:text-sm font-semibold tracking-tight text-muted-foreground">{stat.title}</CardTitle>
              <div className="p-2 rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                <stat.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0 relative z-10">
              <div className="text-2xl md:text-3xl font-bold tracking-tighter">{stat.value}</div>
            </CardContent>
          </Card>
        </Access>
      ))}
    </div>
  )
}
