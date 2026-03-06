import { NextResponse } from 'next/server';
import { handleIncomingMessage } from '@/lib/whatsapp/smart-router';
import { getEnv } from '@/lib/env';
import { Redis } from '@upstash/redis';

const WHATSAPP_VERIFY_TOKEN = getEnv('WHATSAPP_VERIFY_TOKEN', 'roombox_whatsapp_dev_token');

// Singleton Redis client
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

// ── GET: Webhook verification by Meta ────────────────────────────────────────
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === WHATSAPP_VERIFY_TOKEN) {
        console.log('[Webhook] Verified by Meta');
        return new NextResponse(challenge, { status: 200 });
    }

    return new NextResponse('Forbidden', { status: 403 });
}

// ── POST: Receive messages from Meta ─────────────────────────────────────────
export async function POST(req: Request) {
    // Always respond 200 immediately — Meta requires acknowledgement within 30s
    const responsePromise = NextResponse.json({ status: 'received' }, { status: 200 });

    try {
        const body = await req.json();

        if (!body.object) return responsePromise;

        const changes = body.entry?.[0]?.changes?.[0];
        if (!changes?.value?.messages?.[0]) return responsePromise;

        const message = changes.value.messages[0];
        const from = message.from;
        const msgBody = message.text?.body || '';
        const messageType = message.type;

        console.log(`[Webhook] ${messageType} from ${from}: "${msgBody || '[media]'}"`);

        // Initialize Redis for this request (keeps singleton alive)
        getRedisClient();

        // Process asynchronously — don't await so Meta gets 200 immediately
        handleIncomingMessage({ from, msgBody, messageType, rawData: message })
            .catch((err) => console.error('[Webhook] Handler error:', err));

    } catch (error) {
        console.error('[Webhook] POST error:', error);
    }

    return responsePromise;
}
