'use client'

import React from 'react'
import { formatDistanceToNow } from 'date-fns'
import { 
  Home, 
  Users, 
  Wallet, 
  ShieldCheck, 
  Info, 
  AlertCircle, 
  CheckCircle2, 
  XCircle,
  MessageSquare,
  Settings,
  ChevronRight
} from 'lucide-react'
import { ActivityLog, PerformerInfo } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface ActivityLogItemProps {
  log: ActivityLog
  onClick?: () => void
}

const moduleIcons: Record<string, any> = {
  properties: Home,
  guests: Users,
  financials: Wallet,
  staff: ShieldCheck,
  complaints: MessageSquare,
  system: Settings,
}

const statusColorMap: Record<string, string> = {
  success: 'text-green-600 bg-green-50 border-green-100',
  failed: 'text-red-600 bg-red-50 border-red-100',
  warning: 'text-amber-600 bg-amber-50 border-amber-100',
  danger: 'text-destructive bg-destructive/10 border-destructive/20',
}

export const ActivityLogItem: React.FC<ActivityLogItemProps> = ({ log, onClick }) => {
  const Icon = moduleIcons[log.module] || Info
  const timestamp = typeof log.timestamp === 'object' && log.timestamp.seconds 
    ? new Date(log.timestamp.seconds * 1000) 
    : new Date(log.timestamp)

  const changedFields = log.changes && !Array.isArray(log.changes) 
    ? log.changes.changedFields 
    : []

  return (
    <div 
      className={cn(
        "group relative flex items-start gap-4 p-4 rounded-xl border border-transparent hover:border-border/50 hover:bg-muted/30 transition-all cursor-pointer",
        onClick && "cursor-pointer"
      )}
      onClick={onClick}
    >
      <div className={cn(
        "mt-1 p-2 rounded-lg border",
        statusColorMap[log.status] || "text-muted-foreground bg-muted border-border"
      )}>
        <Icon className="h-4 w-4" />
      </div>

      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium leading-none">
              {log.details}
            </span>
            {log.status !== 'success' && (
               <Badge variant={log.status === 'danger' ? 'destructive' : 'outline'} className="text-[10px] py-0 h-4 capitalize">
                 {log.status}
               </Badge>
            )}
          </div>
          <time className="text-xs text-muted-foreground whitespace-nowrap">
            {formatDistanceToNow(timestamp, { addSuffix: true })}
          </time>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground/80">{log.performedBy.name}</span>
          <span className="opacity-50">•</span>
          <span className="capitalize">{log.performedBy.role}</span>
          {log.targetType && (
            <>
              <span className="opacity-50">•</span>
              <span className="px-1.5 py-0.5 rounded-md bg-muted text-[10px] uppercase font-bold tracking-wider">
                {log.targetType}
              </span>
            </>
          )}
        </div>

        {changedFields && changedFields.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {changedFields.map(field => (
              <span key={field} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/5 text-primary border border-primary/10">
                {field}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  )
}
