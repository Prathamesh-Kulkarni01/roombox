'use client'

import React from 'react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { ActivityLog } from '@/lib/types'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

interface ActivityDetailSheetProps {
  log: ActivityLog | null
  isOpen: boolean
  onClose: () => void
}

export const ActivityDetailSheet: React.FC<ActivityDetailSheetProps> = ({ log, isOpen, onClose }) => {
  if (!log) return null

  const changes = log.changes
  const hasChanges = !!changes && (
    (Array.isArray(changes) && changes.length > 0) ||
    (!Array.isArray(changes) && (changes.before || changes.after))
  )

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-xl">
        <SheetHeader>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="capitalize">{log.module}</Badge>
            <Badge variant={log.status === 'success' ? 'default' : 'destructive'} className="capitalize">{log.status}</Badge>
          </div>
          <SheetTitle>{log.activityType.split('_').join(' ')}</SheetTitle>
          <SheetDescription>
            Detailed history of this action.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-180px)] mt-6 pr-4">
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <span className="text-muted-foreground">Performed By</span>
                <p className="font-medium">{log.performedBy.name}</p>
                <p className="text-xs text-muted-foreground uppercase">{log.performedBy.role}</p>
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground">Target</span>
                <p className="font-medium capitalize">{log.targetType || 'N/A'}</p>
                <p className="text-xs font-mono text-muted-foreground truncate">{log.targetId}</p>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
               <h4 className="text-sm font-semibold">Activity Details</h4>
               <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg border border-border/50">
                 {log.details}
               </p>
            </div>

            {hasChanges && (
              <div className="space-y-4">
                <h4 className="text-sm font-semibold">Changes Detected</h4>
                
                {Array.isArray(changes) ? (
                   <div className="space-y-3">
                     {changes.map((change, i) => (
                       <div key={i} className="space-y-1 text-sm">
                         <span className="text-xs font-medium text-primary uppercase tracking-tight">{change.field}</span>
                         <div className="grid grid-cols-2 gap-2">
                            <div className="p-2 rounded bg-red-50/50 border border-red-100 text-xs line-through text-red-700 overflow-hidden text-ellipsis">
                              {String(change.before ?? 'None')}
                            </div>
                            <div className="p-2 rounded bg-green-50/50 border border-green-100 text-xs text-green-700 overflow-hidden text-ellipsis">
                              {String(change.after ?? 'None')}
                            </div>
                         </div>
                       </div>
                     ))}
                   </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {changes.before && (
                      <div className="space-y-2">
                        <span className="text-xs font-medium text-muted-foreground uppercase">Before</span>
                        <pre className="text-[10px] p-3 rounded-lg bg-muted overflow-auto max-h-40 border">
                          {JSON.stringify(changes.before, null, 2)}
                        </pre>
                      </div>
                    )}
                    {changes.after && (
                      <div className="space-y-2">
                        <span className="text-xs font-medium text-muted-foreground uppercase">After</span>
                        <pre className="text-[10px] p-3 rounded-lg bg-green-50/30 border border-green-100/50 overflow-auto max-h-40">
                          {JSON.stringify(changes.after, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {log.error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 space-y-1">
                <span className="text-xs font-bold text-destructive uppercase">Error Log</span>
                <p className="text-sm text-destructive">{log.error}</p>
              </div>
            )}
            
            {log.metadata && Object.keys(log.metadata).length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground uppercase">Internal Metadata</span>
                <pre className="text-[10px] p-3 rounded-lg bg-muted/30 overflow-auto max-h-40">
                  {JSON.stringify(log.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
