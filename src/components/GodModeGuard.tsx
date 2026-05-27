'use client';

/**
 * GodModeGuard.tsx
 *
 * Renders a persistent floating session overlay whenever admin is impersonating an owner.
 * Features:
 *   - Visible countdown timer (30 minutes max)
 *   - Prominent watermark strip across top of screen
 *   - Auto-expiry with server-side audit log on timeout
 *   - "Exit Impersonation" button
 *
 * Mount this ONCE inside the owner dashboard layout when impersonation is active.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Shield, Clock, LogOut, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const GOD_MODE_SESSION_KEY = 'rb_godmode_session';
export const GOD_MODE_DURATION_MS = 30 * 60 * 1000; // 30 minutes

export interface GodModeSession {
  adminId: string;
  adminName: string;
  targetOwnerId: string;
  targetOwnerName: string;
  sessionId: string;
  startedAt: number; // epoch ms
  expiresAt: number; // epoch ms
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function startGodModeSession(
  adminId: string,
  adminName: string,
  targetOwnerId: string,
  targetOwnerName: string,
): GodModeSession {
  const now = Date.now();
  const sessionId = `gm_${adminId}_${now}`;
  const session: GodModeSession = {
    adminId,
    adminName,
    targetOwnerId,
    targetOwnerName,
    sessionId,
    startedAt: now,
    expiresAt: now + GOD_MODE_DURATION_MS,
  };
  sessionStorage.setItem(GOD_MODE_SESSION_KEY, JSON.stringify(session));
  return session;
}

export function getActiveGodModeSession(): GodModeSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(GOD_MODE_SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as GodModeSession;
    if (Date.now() > session.expiresAt) {
      sessionStorage.removeItem(GOD_MODE_SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function clearGodModeSession(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(GOD_MODE_SESSION_KEY);
  }
}

export function isGodModeActive(): boolean {
  return getActiveGodModeSession() !== null;
}

// ─── Overlay Component ────────────────────────────────────────────────────────

interface GodModeGuardProps {
  session: GodModeSession;
  onExit: (expired?: boolean) => void;
}

export default function GodModeGuard({ session, onExit }: GodModeGuardProps) {
  const [secondsLeft, setSecondsLeft] = useState(
    Math.max(0, Math.floor((session.expiresAt - Date.now()) / 1000))
  );
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasExpired = useRef(false);

  const handleExpiry = useCallback(() => {
    if (hasExpired.current) return;
    hasExpired.current = true;
    clearGodModeSession();
    onExit(true);
  }, [onExit]);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.floor((session.expiresAt - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        handleExpiry();
      }
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [session.expiresAt, handleExpiry]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const isWarning = secondsLeft < 300; // last 5 minutes
  const isCritical = secondsLeft < 60;

  const handleExit = () => {
    clearGodModeSession();
    onExit(false);
  };

  return (
    <>
      {/* ── Top Watermark Strip ────────────────────────────────────────── */}
      <div
        className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-between px-4 py-1.5"
        style={{
          background: isCritical
            ? 'repeating-linear-gradient(45deg, #7f1d1d, #7f1d1d 10px, #991b1b 10px, #991b1b 20px)'
            : isWarning
            ? 'repeating-linear-gradient(45deg, #78350f, #78350f 10px, #92400e 10px, #92400e 20px)'
            : 'repeating-linear-gradient(45deg, #1e1b4b, #1e1b4b 10px, #312e81 10px, #312e81 20px)',
        }}
      >
        <div className="flex items-center gap-2">
          <Shield className="h-3.5 w-3.5 text-white" />
          <span className="text-[10px] font-extrabold text-white uppercase tracking-widest">
            GOD MODE ACTIVE — Viewing as{' '}
            <span className="text-yellow-300">{session.targetOwnerName}</span>
          </span>
          <span className="text-[9px] text-white/60 hidden sm:inline">
            Session: {session.sessionId.slice(-8)}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Timer */}
          <div
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
              isCritical
                ? 'bg-red-900/80 text-red-200 animate-pulse'
                : isWarning
                ? 'bg-amber-900/80 text-amber-200'
                : 'bg-indigo-900/80 text-indigo-200'
            }`}
          >
            <Clock className="h-3 w-3" />
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>

          {/* Exit Button */}
          <Button
            size="sm"
            onClick={handleExit}
            className="h-6 px-2.5 text-[10px] font-bold bg-white/10 hover:bg-white/20 border border-white/25 text-white"
          >
            <LogOut className="h-3 w-3 mr-1" />
            Exit
          </Button>
        </div>
      </div>

      {/* ── Expiry Warning Toast (last 60s) ─────────────────────────────── */}
      {isCritical && (
        <div className="fixed bottom-6 right-4 z-[9998] flex items-center gap-3 bg-red-950 border border-red-700 rounded-xl px-4 py-3 shadow-2xl max-w-xs animate-bounce">
          <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
          <div>
            <p className="text-xs font-bold text-red-300">Session expiring in {secondsLeft}s</p>
            <p className="text-[10px] text-red-400/70">God Mode will auto-terminate</p>
          </div>
        </div>
      )}
    </>
  );
}
