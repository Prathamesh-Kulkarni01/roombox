import { NextResponse } from 'next/server';
import { handleIncomingMessage } from '@/lib/whatsapp/bot-logic';
import { getEnv } from '@/lib/env';
import { Redis } from '@upstash/redis';

const WHATSAPP_VERIFY_TOKEN = getEnv('WHATSAPP_VERIFY_TOKEN', 'roombox_whatsapp_dev_token');

// Initialize Redis client (singleton)
let redisClient: Redis | null = null;

function getRedisClient(): Redis {
    if (!redisClient) {
        redisClient = new Redis({
            url: process.env.UPSTASH_REDIS_REST_URL || '',
            token: process.env.UPSTASH_REDIS_REST_TOKEN || ''
        });
    }
    return redisClient;
}

// Verification endpoint for Meta
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    if (mode && token) {
        if (mode === 'subscribe' && token === WHATSAPP_VERIFY_TOKEN) {
            console.log('WEBHOOK_VERIFIED');
            return new NextResponse(challenge, { status: 200 });
        } else {
            return new NextResponse('Forbidden', { status: 403 });
        }
    }

    return new NextResponse('Bad Request', { status: 400 });
}

// Receive messages from Meta
export async function POST(req: Request) {
    try {
        const body = await req.json();

        if (body.object) {
            if (
                body.entry &&
                body.entry[0].changes &&
                body.entry[0].changes[0] &&
                body.entry[0].changes[0].value.messages &&
                body.entry[0].changes[0].value.messages[0]
            ) {
                const phoneNumberId = body.entry[0].changes[0].value.metadata.phone_number_id;
                const from = body.entry[0].changes[0].value.messages[0].from;
                const msgBody = body.entry[0].changes[0].value.messages[0].text?.body;
                const messageType = body.entry[0].changes[0].value.messages[0].type;

                console.log(`Received ${messageType} message from ${from}: ${msgBody || '[Media]'}`);

                // Initialize Redis for this request
                const redis = getRedisClient();

                // Pass to Bot Logic router with Redis instance
                await handleIncomingMessage({ from, msgBody, messageType, rawData: body.entry[0].changes[0].value.messages[0], redis });

                return new NextResponse('EVENT_RECEIVED', { status: 200 });
            }

            return new NextResponse('EVENT_RECEIVED', { status: 200 }); // Return 200 for other event types (like statuses) to ack
        } else {
            return new NextResponse('Not Found', { status: 404 });
        }
    } catch (error) {
        console.error('Webhook POST Error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
