'use client'

import React, { useState, useEffect } from 'react'
import { useGetActivityLogsQuery } from '@/lib/api/apiSlice'
import { ActivityLogItem } from './activity-log-item'
import { ActivityDetailSheet } from './activity-detail-sheet'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Loader2, History, FilterX } from 'lucide-react'
import { ActivityLog } from '@/lib/types'
import { cn } from '@/lib/utils'

interface ActivityLogsListProps {
  module?: string
  targetId?: string
  userId?: string
  limit?: number
  className?: string
  emptyMessage?: string
}

export const ActivityLogsList: React.FC<ActivityLogsListProps> = ({
  module,
  targetId,
  userId,
  limit = 10,
  className,
  emptyMessage = "No activities recorded yet."
}) => {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [lastId, setLastId] = useState<string | undefined>(undefined)
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null)

  const { data, isLoading, isFetching } = useGetActivityLogsQuery({
    module,
    targetId,
    userId,
    limit,
    lastId
  })

  // Append new logs when data arrives
  useEffect(() => {
    if (data?.logs) {
      if (lastId) {
        // Find if any of the logs are already in the list (to avoid duplicates from caching/refetching)
        setLogs(prev => {
            const existingIds = new Set(prev.map(l => l.id))
            const newLogs = data.logs.filter(l => !existingIds.has(l.id))
            return [...prev, ...newLogs]
        })
      } else {
        setLogs(data.logs)
      }
    }
  }, [data, lastId])

  const handleLoadMore = () => {
    if (data?.nextId) {
      setLastId(data.nextId)
    }
  }

  if (isLoading && logs.length === 0) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex gap-4 p-4">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (logs.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-3">
        <div className="p-3 rounded-full bg-muted">
          <History className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground font-medium">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className={cn("space-y-1", className)}>
      <div className="space-y-1">
        {logs.map((log) => (
          <ActivityLogItem 
            key={log.id} 
            log={log} 
            onClick={() => setSelectedLog(log)}
          />
        ))}
      </div>

      {data?.nextId && (
        <div className="pt-6 flex justify-center">
            <Button 
                variant="outline" 
                size="sm" 
                onClick={handleLoadMore} 
                disabled={isFetching}
                className="gap-2"
            >
                {isFetching && <Loader2 className="h-3 w-3 animate-spin" />}
                Load More Activities
            </Button>
        </div>
      )}

      <ActivityDetailSheet 
        log={selectedLog} 
        isOpen={!!selectedLog} 
        onClose={() => setSelectedLog(null)} 
      />
    </div>
  )
}
