import { NextResponse } from 'next/server';
import { handleIncomingMessage } from '@/lib/whatsapp/smart-router';
import { getEnv } from '@/lib/env';

const WHATSAPP_VERIFY_TOKEN = getEnv('WHATSAPP_VERIFY_TOKEN', 'roombox_whatsapp_dev_token');

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
    try {
        /**
         * 🛡️ SECURITY WARNING: Missing Signature Verification
         * 
         * Production environments MUST verify the X-Hub-Signature-256 header
         * using the WHATSAPP_APP_SECRET and the raw request body.
         * Failure to do so allows ANYONE to spoof messages as any user.
         * 
         * TODO: Implement signature verification once APP_SECRET is configured.
         */

        const body = await req.json();

        if (!body.object) {
            return NextResponse.json({ status: 'received' }, { status: 200 });
        }

        const changes = body.entry?.[0]?.changes?.[0];
        if (!changes?.value?.messages?.[0]) {
            return NextResponse.json({ status: 'received' }, { status: 200 });
        }

        const message = changes.value.messages[0];
        const from = message.from;
        const msgBody = message.text?.body || '';
        const messageType = message.type;

        console.log(`[Webhook] ${messageType} from ${from}: "${msgBody || '[media]'}"`);

        // IMPORTANT: We must AWAIT handleIncomingMessage in serverless environments.
        // If we don't, the function might terminate before the message is processed,
        // session is saved to Redis, or a reply is sent via the WhatsApp API.
        await handleIncomingMessage({ from, msgBody, messageType, rawData: message });

    } catch (error) {
        console.error('[Webhook] POST error:', error);
    }

    // Always respond 200 — Meta requires acknowledgment
    return NextResponse.json({ status: 'received' }, { status: 200 });
}
