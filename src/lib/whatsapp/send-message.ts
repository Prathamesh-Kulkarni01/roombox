import { getEnv } from '../env';

const WHATSAPP_ACCESS_TOKEN = getEnv('WHATSAPP_ACCESS_TOKEN');
const WHATSAPP_PHONE_ID = getEnv('WHATSAPP_PHONE_NUMBER_ID');

interface WhatsAppMessagePayload {
    messaging_product: "whatsapp";
    recipient_type: "individual";
    to: string;
    type: "text" | "interactive" | "image" | "template";
    text?: {
        preview_url?: boolean;
        body: string;
    };
    interactive?: any;
    image?: {
        link?: string;
        id?: string;
    };
    template?: any;
}

export async function sendWhatsAppMessage(to: string, messageBody: string) {
    if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_ID) {
        console.warn('WhatsApp credentials not configured. Mocking send:', { to, messageBody });
        return { success: true, mock: true };
    }

    // 🛡️ SECURITY: Basic sanitization of dangerous characters
    const sanitizedMsg = messageBody.replace(/[<>\\"]/g, '');

    const payload: WhatsAppMessagePayload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: {
            preview_url: false,
            body: sanitizedMsg
        }
    };

    return makeWhatsAppApiCall(payload);
}

export async function sendWhatsAppInteractiveMessage(to: string, interactiveData: any) {
    if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_ID) {
        console.warn('WhatsApp credentials not configured. Mocking interactive send:', { to, interactiveData });
        return { success: true, mock: true };
    }

    try {
        const fs = require('fs');
        fs.appendFileSync('wa-logs.txt', `\\n💬 [BOT SAYS TO ${to} (INTERACTIVE)]:\\n${JSON.stringify(interactiveData, null, 2)}\\n`);
    } catch (e) { }

    const payload: WhatsAppMessagePayload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "interactive",
        interactive: interactiveData
    };

    return makeWhatsAppApiCall(payload);
}

export async function sendWhatsAppImageMessage(to: string, imageLink: string) {
    if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_ID) {
        console.warn('WhatsApp credentials not configured. Mocking image send:', { to, imageLink });
        return { success: true, mock: true };
    }

    const payload: WhatsAppMessagePayload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "image",
        image: {
            link: imageLink
        }
    };

    return makeWhatsAppApiCall(payload);
}

async function makeWhatsAppApiCall(payload: WhatsAppMessagePayload) {
    try {
        const response = await fetch(`https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_ID}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('WhatsApp API Error:', errorData);
            return { success: false, error: errorData };
        }

        const data = await response.json();
        return { success: true, data };
    } catch (error) {
        console.error('Error calling WhatsApp API:', error);
        return { success: false, error };
    }
}
