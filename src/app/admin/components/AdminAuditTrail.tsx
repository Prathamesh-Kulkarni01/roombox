'use client';

import React, { useState, useMemo } from 'react';
import {
  Shield, ShieldAlert, UserCheck, UserX, Building2, Wallet, 
  Eye, LogIn, LogOut, Clock, Filter, ChevronDown, Search,
  CheckCircle2, XCircle, CreditCard, Settings, Trash2, AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { AdminAuditLog, AdminAuditAction } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';

interface AdminAuditTrailProps {
  auditLogs: AdminAuditLog[];
}

// ─── Config ───────────────────────────────────────────────────────────────────

const ACTION_CONFIG: Record<AdminAuditAction, {
  label: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}> = {
  OWNER_APPROVED:         { label: 'Owner Approved',         icon: UserCheck,    color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', severity: 'medium' },
  OWNER_REJECTED:         { label: 'Owner Rejected',         icon: UserX,        color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/20',         severity: 'high' },
  OWNER_SUSPENDED:        { label: 'Owner Suspended',        icon: ShieldAlert,  color: 'text-orange-400',  bg: 'bg-orange-500/10 border-orange-500/20',   severity: 'high' },
  OWNER_UNSUSPENDED:      { label: 'Owner Restored',         icon: Shield,       color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/20',       severity: 'medium' },
  PROPERTY_APPROVED:      { label: 'Property Approved',      icon: Building2,    color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', severity: 'low' },
  PROPERTY_REJECTED:      { label: 'Property Rejected',      icon: Building2,    color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/20',         severity: 'medium' },
  WALLET_CREDITED:        { label: 'Wallet Credited',        icon: CreditCard,   color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', severity: 'high' },
  WALLET_DEBITED:         { label: 'Wallet Debited',         icon: Wallet,       color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20',     severity: 'high' },
  SUBSCRIPTION_MODIFIED:  { label: 'Subscription Modified',  icon: Settings,     color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/20',       severity: 'medium' },
  IMPERSONATION_STARTED:  { label: 'God Mode: Entered',      icon: LogIn,        color: 'text-violet-400',  bg: 'bg-violet-500/10 border-violet-500/20',   severity: 'critical' },
  IMPERSONATION_ENDED:    { label: 'God Mode: Exited',       icon: LogOut,       color: 'text-slate-400',   bg: 'bg-slate-500/10 border-slate-500/20',     severity: 'medium' },
  IMPERSONATION_EXPIRED:  { label: 'God Mode: Expired',      icon: Clock,        color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20',     severity: 'medium' },
  COMPLAINT_ESCALATED:    { label: 'Complaint Escalated',    icon: AlertTriangle, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20',   severity: 'medium' },
  COMPLAINT_RESOLVED:     { label: 'Complaint Resolved',     icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', severity: 'low' },
  ADMIN_ROLE_CHANGED:     { label: 'Admin Role Changed',     icon: Shield,       color: 'text-purple-400',  bg: 'bg-purple-500/10 border-purple-500/20',   severity: 'critical' },
  CREDITS_ADJUSTED:       { label: 'Credits Adjusted',       icon: CreditCard,   color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/20',       severity: 'high' },
  ACCOUNT_DELETED:        { label: 'Account Deleted',        icon: Trash2,       color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/20',         severity: 'critical' },
  OWNER_DELETED:          { label: 'Owner Deleted',          icon: Trash2,       color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/20',         severity: 'critical' },
};

const SEVERITY_COLORS = {
  low:      { badge: 'bg-slate-700 text-slate-300',    dot: 'bg-slate-400' },
  medium:   { badge: 'bg-blue-900/60 text-blue-300',   dot: 'bg-blue-400' },
  high:     { badge: 'bg-orange-900/60 text-orange-300', dot: 'bg-orange-400' },
  critical: { badge: 'bg-red-900/60 text-red-300',     dot: 'bg-red-400 animate-pulse' },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminAuditTrail({ auditLogs }: AdminAuditTrailProps) {
  const [search, setSearch] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');
  const [filterType, setFilterType] = useState<'all' | 'impersonation' | 'wallet' | 'ownership' | 'property'>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showCount, setShowCount] = useState(25);

  const filtered = useMemo(() => {
    let logs = [...auditLogs];

    if (search.trim()) {
      const q = search.toLowerCase();
      logs = logs.filter(l =>
        l.adminName?.toLowerCase().includes(q) ||
        l.targetName?.toLowerCase().includes(q) ||
        l.details?.toLowerCase().includes(q) ||
        l.action?.toLowerCase().includes(q)
      );
    }

    if (filterSeverity !== 'all') {
      logs = logs.filter(l => ACTION_CONFIG[l.action]?.severity === filterSeverity);
    }

    if (filterType !== 'all') {
      logs = logs.filter(l => {
        switch (filterType) {
          case 'impersonation': return l.action.startsWith('IMPERSONATION');
          case 'wallet':        return l.action.startsWith('WALLET') || l.action === 'CREDITS_ADJUSTED';
          case 'ownership':     return l.action.startsWith('OWNER');
          case 'property':      return l.action.startsWith('PROPERTY');
          default: return true;
        }
      });
    }

    return logs;
  }, [auditLogs, search, filterSeverity, filterType]);

  const criticalCount = auditLogs.filter(l => ACTION_CONFIG[l.action]?.severity === 'critical').length;
  const highCount     = auditLogs.filter(l => ACTION_CONFIG[l.action]?.severity === 'high').length;

  return (
    <div className="space-y-4">

      {/* Header + Summary */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Shield className="h-4 w-4 text-violet-400" />
            Admin Audit Trail
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable log of all privileged admin operations. Cannot be edited or deleted.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {criticalCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-900/40 border border-red-700/30 text-[10px] font-bold text-red-300">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              {criticalCount} CRITICAL
            </span>
          )}
          {highCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-orange-900/40 border border-orange-700/30 text-[10px] font-bold text-orange-300">
              {highCount} HIGH
            </span>
          )}
          <span className="text-[10px] text-slate-500">{auditLogs.length} total events</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search admin, owner, action..."
            className="pl-8 h-8 text-xs bg-slate-900 border-slate-700 text-slate-200 placeholder:text-slate-600"
          />
        </div>

        <select
          value={filterSeverity}
          onChange={e => setFilterSeverity(e.target.value as any)}
          className="h-8 px-2 text-xs bg-slate-900 border border-slate-700 rounded-md text-slate-300"
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value as any)}
          className="h-8 px-2 text-xs bg-slate-900 border border-slate-700 rounded-md text-slate-300"
        >
          <option value="all">All Types</option>
          <option value="impersonation">God Mode</option>
          <option value="wallet">Wallet</option>
          <option value="ownership">Owners</option>
          <option value="property">Properties</option>
        </select>
      </div>

      {/* Log List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Shield className="h-8 w-8 text-slate-700 mb-3" />
          <p className="text-sm text-slate-500">No audit events match your filters</p>
          <p className="text-xs text-slate-600 mt-1">High-risk operations will appear here as they occur</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.slice(0, showCount).map(log => {
            const cfg = ACTION_CONFIG[log.action] ?? {
              label: log.action,
              icon: Shield,
              color: 'text-slate-400',
              bg: 'bg-slate-800 border-slate-700',
              severity: 'low' as const,
            };
            const Icon = cfg.icon;
            const sev = SEVERITY_COLORS[cfg.severity];
            const isOpen = expanded === log.id;

            return (
              <div
                key={log.id}
                className={`rounded-lg border p-3 transition-all cursor-pointer ${cfg.bg} ${isOpen ? 'ring-1 ring-white/10' : ''}`}
                onClick={() => setExpanded(isOpen ? null : log.id)}
              >
                <div className="flex items-start gap-3">
                  {/* Severity dot + icon */}
                  <div className="flex flex-col items-center gap-1 pt-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${sev.dot}`} />
                    <Icon className={`h-4 w-4 ${cfg.color}`} />
                  </div>

                  {/* Main content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-100">{cfg.label}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${sev.badge}`}>
                        {cfg.severity}
                      </span>
                      {log.targetName && (
                        <span className="text-[10px] text-slate-400 truncate max-w-[160px]">
                          → {log.targetName}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-[10px] text-slate-500">
                        by <span className="text-slate-300 font-medium">{log.adminName || log.adminId}</span>
                      </span>
                      <span className="text-[10px] text-slate-600">
                        {log.timestamp
                          ? formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })
                          : 'Unknown time'}
                      </span>
                    </div>

                    {log.details && !isOpen && (
                      <p className="text-[10px] text-slate-500 mt-1 truncate">{log.details}</p>
                    )}
                  </div>

                  <ChevronDown className={`h-3.5 w-3.5 text-slate-600 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>

                {/* Expanded Detail Panel */}
                {isOpen && (
                  <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
                    {log.details && (
                      <p className="text-xs text-slate-300">{log.details}</p>
                    )}
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div>
                        <span className="text-slate-600">Admin ID</span>
                        <p className="text-slate-400 font-mono break-all">{log.adminId}</p>
                      </div>
                      <div>
                        <span className="text-slate-600">Target ID</span>
                        <p className="text-slate-400 font-mono break-all">{log.targetId}</p>
                      </div>
                      {log.sessionId && (
                        <div>
                          <span className="text-slate-600">Session ID</span>
                          <p className="text-slate-400 font-mono break-all">{log.sessionId}</p>
                        </div>
                      )}
                      <div>
                        <span className="text-slate-600">Log ID</span>
                        <p className="text-slate-400 font-mono break-all">{log.id}</p>
                      </div>
                    </div>
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <div>
                        <span className="text-[10px] text-slate-600">Metadata</span>
                        <pre className="text-[10px] text-slate-400 bg-slate-950/60 rounded p-2 mt-1 overflow-x-auto">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {filtered.length > showCount && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCount(s => s + 25)}
              className="w-full h-8 text-xs text-slate-500 hover:text-slate-300 border border-slate-800"
            >
              Load {Math.min(25, filtered.length - showCount)} more ({filtered.length - showCount} remaining)
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
