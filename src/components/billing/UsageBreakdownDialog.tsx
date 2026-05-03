'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, Receipt, Calendar, Info, ArrowDownLeft, ArrowUpRight } from "lucide-react"
import { getInvoiceLedger } from "@/lib/actions/billingActions"
import type { MonthlyInvoice, BillingLedgerEntry } from "@/lib/types"
import { format, parseISO } from "date-fns"

interface UsageBreakdownDialogProps {
  ownerId: string
  invoice: MonthlyInvoice | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function UsageBreakdownDialog({ ownerId, invoice, open, onOpenChange }: UsageBreakdownDialogProps) {
  const [ledger, setLedger] = useState<BillingLedgerEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const fetchLedger = async () => {
      if (!invoice || !open) return
      setIsLoading(true)
      const result = await getInvoiceLedger(ownerId, invoice.month)
      if (result.success && result.data) {
        setLedger(result.data)
      }
      setIsLoading(false)
    }

    fetchLedger()
  }, [ownerId, invoice, open])

  if (!invoice) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-3xl border-border/40 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-2">
            <Receipt className="text-primary w-6 h-6" />
            Usage Breakdown
          </DialogTitle>
          <DialogDescription className="font-medium">
            Detailed ledger for {format(parseISO(`${invoice.month}-01`), 'MMMM yyyy')}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="p-4 rounded-2xl bg-muted/30 border border-border/40">
            <p className="text-[0.65rem] font-black uppercase tracking-widest text-muted-foreground mb-1">Total Bill</p>
            <p className="text-2xl font-black text-foreground">₹{invoice.totalAmount.toLocaleString('en-IN')}</p>
          </div>
          <div className="p-4 rounded-2xl bg-muted/30 border border-border/40">
            <p className="text-[0.65rem] font-black uppercase tracking-widest text-muted-foreground mb-1">Status</p>
            <Badge variant={invoice.status === 'paid' ? 'default' : 'secondary'} className="rounded-full px-3 font-bold uppercase text-[0.6rem]">
              {invoice.status}
            </Badge>
          </div>
        </div>

        <div className="mt-6">
          <h4 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground mb-3 flex items-center gap-2">
            <Info className="w-3 h-3" /> Ledger Entries
          </h4>
          
          <div className="rounded-2xl border border-border/40 overflow-hidden bg-background/50">
            {isLoading ? (
              <div className="h-48 flex flex-col items-center justify-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-xs font-bold text-muted-foreground">Loading ledger...</p>
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow className="hover:bg-transparent border-none">
                      <TableHead className="text-[0.65rem] font-black uppercase tracking-widest">Type</TableHead>
                      <TableHead className="text-[0.65rem] font-black uppercase tracking-widest">Description</TableHead>
                      <TableHead className="text-right text-[0.65rem] font-black uppercase tracking-widest">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ledger.map((entry) => (
                      <TableRow key={entry.id} className="hover:bg-muted/30 transition-colors border-border/40">
                        <TableCell className="py-3">
                          <Badge variant="outline" className="rounded-lg font-black text-[0.55rem] uppercase tracking-tighter">
                            {entry.type.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-foreground leading-tight">{entry.description}</span>
                            <span className="text-[0.6rem] text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Calendar className="w-2.5 h-2.5" />
                              {format(parseISO(entry.createdAt), 'MMM d, HH:mm')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right py-3">
                          <span className={`text-sm font-black tracking-tight ${entry.amount < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                            {entry.amount < 0 ? '-' : '+'}₹{Math.abs(entry.amount).toLocaleString('en-IN')}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                    {ledger.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="h-24 text-center text-xs font-bold text-muted-foreground">
                          No ledger entries found for this invoice.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </div>
        </div>

        <div className="mt-4 p-4 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Receipt className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-xs font-black text-primary uppercase tracking-tight">Immutable Invoice</p>
              <p className="text-[0.65rem] text-primary/60 font-medium">This record is sealed and cannot be modified.</p>
            </div>
          </div>
          <p className="text-xs font-bold text-muted-foreground/60 italic">#{invoice.id}</p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
