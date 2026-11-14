/**
 * Redis-backed session store for WhatsApp Bot
 *
 * Stores the full WorkflowContext inside session.data.workflowContext
 * so the bot survives server restarts and scales horizontally.
 */

import { Redis } from '@upstash/redis';
import { getEnv } from '../env';

// BotState is now a single unified state — workflow tracking is inside
// the WorkflowContext stored in session.data.workflowContext
export type BotState =
    | 'IDLE'
    | 'AWAITING_USER_ROLE'
    | 'AWAITING_ACCOUNT_SELECTION';

export interface UserSession {
    state: BotState;
    data: {
        isAuthenticatedOwner?: boolean;
        isAuthenticatedTenant?: boolean;
        ownerId?: string;
        ownerName?: string;
        workflowContext?: any;   // Serialized WorkflowContext
        workflowId?: string;
        currentStep?: string;
        [key: string]: any;
    };
    lastUpdated: number;
}

const SESSION_TTL = 900; // 15 minutes

let redisClient: Redis | null = null;
let redisDisabledUntil = 0; // Backoff cooldown when Redis host is unresolvable

function isRedisCircuitBroken(): boolean {
    return Date.now() < redisDisabledUntil;
}

function tripRedisCircuit(err: any): void {
    // If DNS host is not found (ENOTFOUND / fetch failed), disable network attempts for 2 minutes
    // so we don't stall incoming webhooks and trigger Meta retry loops
    if (err?.code === 'ENOTFOUND' || err?.message?.includes('ENOTFOUND') || err?.message?.includes('fetch failed')) {
        redisDisabledUntil = Date.now() + 2 * 60 * 1000;
        console.warn('[Session] Redis circuit breaker tripped due to ENOTFOUND. Using in-memory store for 2 minutes.');
    }
}

function getRedisClient(): Redis | null {
    if (isRedisCircuitBroken()) return null;

    if (!redisClient) {
        const url = getEnv('UPSTASH_REDIS_REST_URL');
        const token = getEnv('UPSTASH_REDIS_REST_TOKEN');

        if (!url || !token) {
            console.error('[Redis] CRITICAL: Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN. WhatsApp sessions will fail.');
            return null;
        } else {
            console.log(`[Redis] Initializing with URL: ${url.substring(0, 15)}... (Token length: ${token.length})`);
        }

        // Sanitize URL: ensure it starts with https:// if it doesn't
        let sanitizedUrl = url || '';
        if (sanitizedUrl && !sanitizedUrl.startsWith('http')) {
            sanitizedUrl = `https://${sanitizedUrl}`;
        }

        try {
            redisClient = new Redis({
                url: sanitizedUrl || 'http://missing-url',
                token: token || 'missing-token',
            });
        } catch (err) {
            console.error('[Redis] Failed to instantiate Redis client:', err);
            return null;
        }
    }
    return redisClient;
}

function sessionKey(phone: string): string {
    return `roombox:wa:session:${phone}`;
}

const memoryStore = new Map<string, { session: UserSession; expiresAt: number }>();

function getMemorySession(phoneNumber: string): UserSession | null {
    const entry = memoryStore.get(phoneNumber);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
        memoryStore.delete(phoneNumber);
        return null;
    }
    entry.expiresAt = Date.now() + SESSION_TTL * 1000;
    return entry.session;
}

function setMemorySession(phoneNumber: string, session: UserSession): void {
    memoryStore.set(phoneNumber, {
        session,
        expiresAt: Date.now() + SESSION_TTL * 1000,
    });
}

// Helper to race Redis calls with a strict 1.5s timeout so webhooks never stall
async function withTimeout<T>(promise: Promise<T>, ms = 1500): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Redis timeout')), ms))
    ]);
}

// ── Get session (returns default if not found) ────────────────────────────────
export async function getSession(phoneNumber: string): Promise<UserSession> {
    try {
        const redis = getRedisClient();
        if (redis) {
            const session = await withTimeout(redis.get<UserSession>(sessionKey(phoneNumber)));
            if (session) {
                redis.expire(sessionKey(phoneNumber), SESSION_TTL).catch(() => {});
                setMemorySession(phoneNumber, session);
                return session;
            }
        }
    } catch (err: any) {
        tripRedisCircuit(err);
        const mem = getMemorySession(phoneNumber);
        if (mem) return mem;
        if (process.env.NODE_ENV === 'development') {
            console.warn('[Session] Redis offline, using in-memory session cache:', err?.code || err?.message);
        } else {
            console.error('[Session] Read error:', err?.message || err);
        }
    }
    return getMemorySession(phoneNumber) || freshSession();
}

// ── Update session ─────────────────────────────────────────────────────────────
export async function updateSession(
    phoneNumber: string,
    newState: BotState,
    newData?: Partial<UserSession['data']>
): Promise<void> {
    const current = await getSession(phoneNumber);
    const updated: UserSession = {
        state: newState,
        data: { ...current.data, ...(newData || {}) },
        lastUpdated: Date.now(),
    };

    // Always update memory store immediately so conversations don't break
    setMemorySession(phoneNumber, updated);

    try {
        const redis = getRedisClient();
        if (redis) {
            await withTimeout(redis.set(sessionKey(phoneNumber), updated, { ex: SESSION_TTL }));
        }
    } catch (err: any) {
        tripRedisCircuit(err);
        if (process.env.NODE_ENV === 'development') {
            console.warn('[Session] Redis offline, persisted to in-memory session cache:', err?.code || err?.message);
        } else {
            console.error('[Session] Write error:', err?.message || err);
        }
    }
}

// ── Clear session ──────────────────────────────────────────────────────────────
export async function clearSession(phoneNumber: string): Promise<void> {
    memoryStore.delete(phoneNumber);
    try {
        const redis = getRedisClient();
        if (redis) {
            await withTimeout(redis.del(sessionKey(phoneNumber)));
        }
    } catch (err: any) {
        tripRedisCircuit(err);
        console.error('[Session] Clear error:', err?.message || err);
    }
}

// ── Service Object (allows mocking in tests) ───────────────────────────────
export const SessionManager = {
    getSession,
    updateSession,
    clearSession
};

function freshSession(): UserSession {
    return { state: 'IDLE', data: {}, lastUpdated: Date.now() };
}
