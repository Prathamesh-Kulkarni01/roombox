import { NextResponse } from 'next/server';
import { handleIncomingMessage } from '@/lib/whatsapp/smart-router';
import { getEnv } from '@/lib/env';
import { createHmac, timingSafeEqual } from 'crypto';

const WHATSAPP_VERIFY_TOKEN = getEnv('WHATSAPP_VERIFY_TOKEN', 'roombox_whatsapp_dev_token');
const WHATSAPP_APP_SECRET = process.env.WHATSAPP_APP_SECRET;

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
    // ── 1. Read raw body (must happen BEFORE req.json()) ─────────────────────
    const rawBody = await req.arrayBuffer();
    const rawBodyBuffer = Buffer.from(rawBody);

    // ── 2. Signature Verification ─────────────────────────────────────────────
    // When WHATSAPP_APP_SECRET is set, enforce verification strictly.
    // In local dev without the secret, skip verification with a warning.
    if (WHATSAPP_APP_SECRET) {
        const signatureHeader = req.headers.get('x-hub-signature-256');

        if (!signatureHeader) {
            console.error('[Webhook] SECURITY: Missing x-hub-signature-256 header. Rejecting request.');
            return new NextResponse('Unauthorized', { status: 401 });
        }

        // Compute expected signature: sha256=<hex-digest>
        const expectedSignature = 'sha256=' + createHmac('sha256', WHATSAPP_APP_SECRET)
            .update(rawBodyBuffer)
            .digest('hex');

        // Use timingSafeEqual to prevent timing attacks
        try {
            const sigBuffer = Buffer.from(signatureHeader, 'utf8');
            const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

            if (sigBuffer.length !== expectedBuffer.length || !timingSafeEqual(sigBuffer, expectedBuffer)) {
                console.error('[Webhook] SECURITY: Signature mismatch. Possible spoofed request.');
                return new NextResponse('Unauthorized', { status: 401 });
            }
        } catch {
            console.error('[Webhook] SECURITY: Signature comparison failed. Rejecting request.');
            return new NextResponse('Unauthorized', { status: 401 });
        }
    } else {
        console.warn('[Webhook] WHATSAPP_APP_SECRET not set — skipping signature verification (dev mode only).');
    }

    // ── 3. Parse and process ──────────────────────────────────────────────────
    try {
        const body = JSON.parse(rawBodyBuffer.toString('utf8'));

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

        await handleIncomingMessage({ from, msgBody, messageType, rawData: message });

    } catch (error) {
        console.error('[Webhook] POST error:', error);
    }

    // Always respond 200 — Meta requires acknowledgment
    return NextResponse.json({ status: 'received' }, { status: 200 });
}

