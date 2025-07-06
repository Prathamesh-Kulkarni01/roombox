'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useData } from '@/context/data-provider'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Bell, CheckCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

export default function NotificationsPopover() {
  const { notifications, markNotificationAsRead, markAllAsRead } = useData()
  const [isOpen, setIsOpen] = useState(false)

  const unreadCount = notifications.filter(n => !n.isRead).length

  const handleNotificationClick = (notificationId: string) => {
    markNotificationAsRead(notificationId)
    setIsOpen(false)
  }

  const handleMarkAllRead = (e: React.MouseEvent) => {
    e.preventDefault();
    markAllAsRead()
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs">{unreadCount}</Badge>
          )}
           <span className="sr-only">Open notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="font-semibold text-lg">Notifications</h3>
          {unreadCount > 0 && (
            <Button variant="link" size="sm" onClick={handleMarkAllRead} className="p-0 h-auto">
              Mark all as read
            </Button>
          )}
        </div>
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center p-8">No notifications yet.</p>
          ) : (
            <div className="divide-y">
              {notifications.map(notification => (
                <Link
                  key={notification.id}
                  href={notification.link}
                  onClick={() => handleNotificationClick(notification.id)}
                  className={cn(
                    "block p-3 hover:bg-muted/50 transition-colors",
                    !notification.isRead && "bg-primary/5"
                  )}
                >
                  <div className="flex items-start gap-3">
                    {!notification.isRead && <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />}
                    <div className={cn("flex-1", notification.isRead && "pl-5")}>
                      <p className="font-semibold text-sm leading-tight">{notification.title}</p>
                      <p className="text-sm text-muted-foreground">{notification.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notification.date), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </ScrollArea>
        <div className="p-2 border-t text-center">
            <Button variant="link" size="sm" asChild className="text-muted-foreground">
                <Link href="/dashboard/notifications">View all</Link>
            </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
