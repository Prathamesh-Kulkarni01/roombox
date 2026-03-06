/**
 * Redis-backed session store for WhatsApp Bot
 *
 * Stores the full WorkflowContext inside session.data.workflowContext
 * so the bot survives server restarts and scales horizontally.
 */

import { Redis } from '@upstash/redis';

// BotState is now a single unified state — workflow tracking is inside
// the WorkflowContext stored in session.data.workflowContext
export type BotState =
    | 'IDLE'
    | 'AWAITING_USER_ROLE';

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

function getRedisClient(): Redis {
    if (!redisClient) {
        redisClient = new Redis({
            url: process.env.UPSTASH_REDIS_REST_URL || '',
            token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
        });
    }
    return redisClient;
}

function sessionKey(phone: string): string {
    return `roombox:wa:session:${phone}`;
}

// ── Get session (returns default if not found) ────────────────────────────────
export async function getSession(phoneNumber: string): Promise<UserSession> {
    try {
        const redis = getRedisClient();
        const session = await redis.get<UserSession>(sessionKey(phoneNumber));
        if (session) {
            await redis.expire(sessionKey(phoneNumber), SESSION_TTL);
            return session;
        }
    } catch (err) {
        console.error('[Session] Read error:', err);
    }
    return freshSession();
}

// ── Update session ─────────────────────────────────────────────────────────────
export async function updateSession(
    phoneNumber: string,
    newState: BotState,
    newData?: Partial<UserSession['data']>
): Promise<void> {
    try {
        const redis = getRedisClient();
        const current = await getSession(phoneNumber);

        const updated: UserSession = {
            state: newState,
            data: { ...current.data, ...(newData || {}) },
            lastUpdated: Date.now(),
        };

        await redis.set(sessionKey(phoneNumber), updated, { ex: SESSION_TTL });
    } catch (err) {
        console.error('[Session] Write error:', err);
    }
}

// ── Clear session ──────────────────────────────────────────────────────────────
export async function clearSession(phoneNumber: string): Promise<void> {
    try {
        const redis = getRedisClient();
        await redis.del(sessionKey(phoneNumber));
    } catch (err) {
        console.error('[Session] Clear error:', err);
    }
}

function freshSession(): UserSession {
    return { state: 'IDLE', data: {}, lastUpdated: Date.now() };
}
