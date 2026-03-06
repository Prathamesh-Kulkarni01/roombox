// Redis-backed session store for WhatsApp Bot conversational state
// Uses Upstash Redis for persistence and production scalability
import { Redis } from '@upstash/redis';

export type BotState =
    | 'IDLE'
    | 'AWAITING_USER_ROLE'
    | 'SELECTING_PG'
    | 'SELECTING_ROOM'
    | 'SELECTING_BED'
    | 'DYNAMIC_FORM_FILLING'
    | 'AWAITING_COMPLAINT_ACTION'
    | 'ADDING_PG_NAME'
    | 'ADDING_PG_CAPACITY'
    | 'SELECTING_TENANT_LIFECYCLE'
    | 'AWAITING_LIFECYCLE_ACTION'
    | 'EDITING_TENANT_FIELD_SELECTION'
    | 'EDITING_TENANT_VALUE'
    | 'AWAITING_KYC_ACTION'
    | 'AWAITING_OWNER_KYC_UPLOAD_PHOTO'
    | 'AWAITING_OWNER_KYC_UPLOAD_AADHAAR'
    | 'SELECTING_PG_DETAILS'
    | 'AWAITING_PG_ACTION'
    | 'RECORDING_PAYMENT_AMOUNT'
    | 'CONFIRMING_VACATE';

interface UserSession {
    state: BotState;
    data: any; // Temporary data collected during a multi-step flow
    lastUpdated: number;
}

let redisClient: Redis | null = null;
const SESSION_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
const SESSION_TTL = 600; // 10 minutes in seconds (for Redis expiry)

function getRedisClient(): Redis {
    if (!redisClient) {
        redisClient = new Redis({
            url: process.env.UPSTASH_REDIS_REST_URL || '',
            token: process.env.UPSTASH_REDIS_REST_TOKEN || ''
        });
    }
    return redisClient;
}

export async function getSession(phoneNumber: string): Promise<UserSession> {
    try {
        const redis = getRedisClient();
        const sessionKey = `whatsapp:session:${phoneNumber}`;
        const sessionData = await redis.get(sessionKey);

        if (sessionData) {
            const session = JSON.parse(sessionData as string) as UserSession;
            // Renew TTL
            await redis.expire(sessionKey, SESSION_TTL);
            return session;
        }

        return { state: 'IDLE', data: {}, lastUpdated: Date.now() };
    } catch (error) {
        console.error('[SessionCache] Error reading session:', error);
        return { state: 'IDLE', data: {}, lastUpdated: Date.now() };
    }
}

export async function updateSession(phoneNumber: string, newState: BotState, newData?: any): Promise<void> {
    try {
        const redis = getRedisClient();
        const currentSession = await getSession(phoneNumber);
        const sessionKey = `whatsapp:session:${phoneNumber}`;

        const updatedSession: UserSession = {
            state: newState,
            data: { ...currentSession.data, ...(newData || {}) },
            lastUpdated: Date.now()
        };

        await redis.setex(sessionKey, SESSION_TTL, JSON.stringify(updatedSession));
    } catch (error) {
        console.error('[SessionCache] Error updating session:', error);
    }
}

export async function clearSession(phoneNumber: string): Promise<void> {
    try {
        const redis = getRedisClient();
        const sessionKey = `whatsapp:session:${phoneNumber}`;
        await redis.del(sessionKey);
    } catch (error) {
        console.error('[SessionCache] Error clearing session:', error);
    }
}
