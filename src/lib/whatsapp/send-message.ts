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

/**
 * Sends a WhatsApp Template message. 
 * Templates must be pre-approved in the Meta Business Suite.
 * @param to recipient phone number
 * @param templateName name of the approved template
 * @param languageCode language (e.g., 'en_US', 'hi')
 * @param components template components (body parameters, buttons, etc.)
 */
export async function sendWhatsAppTemplate(
    to: string,
    templateName: string,
    languageCode: string = 'en_US',
    components: any[] = []
) {
    if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_ID) {
        console.warn('WhatsApp credentials not configured. Mocking template send:', { to, templateName });
        return { success: true, mock: true };
    }

    const payload: WhatsAppMessagePayload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "template",
        template: {
            name: templateName,
            language: {
                code: languageCode
            },
            components: components
        }
    };

    return makeWhatsAppApiCall(payload);
}

async function makeWhatsAppApiCall(payload: WhatsAppMessagePayload, maxRetries = 3) {
    let lastError: any = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
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
                console.error(`WhatsApp API Error (Attempt ${attempt}/${maxRetries}):`, errorData);
                lastError = errorData;

                // If it's a 4xx error (e.g., bad request, invalid number), don't retry
                if (response.status >= 400 && response.status < 500 && response.status !== 429) {
                    return { success: false, error: errorData };
                }
            } else {
                const data = await response.json();
                return { success: true, data };
            }
        } catch (error) {
            console.error(`Error calling WhatsApp API (Attempt ${attempt}/${maxRetries}):`, error);
            lastError = error;
        }

        // Exponential backoff for retries: 1s, 2s, 4s...
        if (attempt < maxRetries) {
            const delay = Math.pow(2, attempt - 1) * 1000;
            console.log(`Waiting ${delay}ms before retrying WhatsApp message...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    return { success: false, error: lastError };
}
