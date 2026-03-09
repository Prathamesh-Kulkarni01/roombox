import { getEnv } from '../env';
import { getAdminDb } from '../firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { WhatsAppLogsService } from './logs-service';

const WHATSAPP_ACCESS_TOKEN = getEnv('WHATSAPP_ACCESS_TOKEN');
const WHATSAPP_PHONE_ID = getEnv('WHATSAPP_PHONE_NUMBER_ID');

const PRICING = {
    TEMPLATE: 1.5,
    SESSION: 0.5,
    AUTH: 2.5
};

const SESSION_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

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

/**
 * Enhanced sender that handles billing and logging.
 */
async function sendWhatsAppWithBilling(
    to: string,
    payload: WhatsAppMessagePayload,
    ownerId?: string,
    targetId?: string
) {
    if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_ID) {
        console.warn('WhatsApp credentials not configured. Mocking send:', { to, payload });
        return { success: true, mock: true };
    }

    // 1. Determine Cost & Session Window
    let cost = 0;
    if (ownerId) {
        try {
            // Check session window in Redis
            const { getSession } = await import('./session-state');
            const session = await getSession(to);
            const isWithinSessionWindow = (Date.now() - session.lastUpdated) < SESSION_WINDOW_MS;

            if (isWithinSessionWindow && payload.type !== 'template') {
                cost = 0; // Free session message
                console.log(`[WhatsApp Billing] Free session message for ${to}`);
            } else {
                // Determine cost based on type
                if (payload.type === 'template' && payload.template) {
                    // Special case for OTP templates
                    cost = (payload.template.name.includes('verification') || payload.template.name.includes('otp'))
                        ? PRICING.AUTH : PRICING.TEMPLATE;
                } else {
                    cost = PRICING.SESSION;
                }
            }

            if (cost > 0) {
                const adminDb = await getAdminDb();
                const ownerRef = adminDb.collection('users').doc(ownerId);

                const creditResult = await adminDb.runTransaction(async (transaction) => {
                    const ownerDoc = await transaction.get(ownerRef);
                    if (!ownerDoc.exists) {
                        return { success: false, error: 'Owner not found' };
                    }

                    const currentCredits = ownerDoc.data()?.subscription?.whatsappCredits || 0;
                    if (currentCredits < cost) {
                        return { success: false, error: 'Insufficient credits' };
                    }

                    transaction.update(ownerRef, {
                        'subscription.whatsappCredits': FieldValue.increment(-cost)
                    });
                    return { success: true };
                });

                if (!creditResult.success) {
                    return creditResult;
                }
                console.log(`[WhatsApp Billing] Deducted ${cost} units from owner ${ownerId} via transaction`);
            }
        } catch (e: any) {
            console.error('[WhatsApp Billing] Failed:', e.message);
            // Default to allowing if billing service is down but log it? 
            // Better to fail safe for the business:
            return { success: false, error: 'Billing service error' };
        }
    }

    // 2. Make the actual API call
    const result = await makeWhatsAppApiCall(payload);

    // 3. Refund if failed & cost was > 0
    if (!result.success && cost > 0 && ownerId) {
        try {
            const adminDb = await getAdminDb();
            await adminDb.collection('users').doc(ownerId).update({
                'subscription.whatsappCredits': FieldValue.increment(cost)
            });
            console.log(`[WhatsApp Billing] Refunded ${cost} units to owner ${ownerId} due to failure`);
        } catch (re: any) {
            console.error('[WhatsApp Billing] Refund failed:', re.message);
        }
    }

    // 4. Log the attempt
    if (ownerId) {
        const content = payload.type === 'text' ? payload.text?.body :
            payload.type === 'template' ? `Template: ${payload.template.name}` :
                `Type: ${payload.type}`;

        await WhatsAppLogsService.logMessage({
            ownerId,
            targetId,
            phone: to,
            direction: 'outbound',
            type: payload.type,
            content: content || '',
            cost: result.success ? cost : 0, // Log zero cost if failure (since refunded)
            status: result.success ? 'success' : 'failed',
            error: result.error ? JSON.stringify(result.error) : undefined
        });
    }

    return result;
}

export async function sendWhatsAppMessage(to: string, messageBody: string, ownerId?: string, targetId?: string) {
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

    return sendWhatsAppWithBilling(to, payload, ownerId, targetId);
}

export async function sendWhatsAppInteractiveMessage(to: string, interactiveData: any, ownerId?: string, targetId?: string) {
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

    return sendWhatsAppWithBilling(to, payload, ownerId, targetId);
}

export async function sendWhatsAppImageMessage(to: string, imageLink: string, ownerId?: string, targetId?: string) {
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

    return sendWhatsAppWithBilling(to, payload, ownerId, targetId);
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
    components: any[] = [],
    ownerId?: string,
    targetId?: string
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

    return sendWhatsAppWithBilling(to, payload, ownerId, targetId);
}

async function makeWhatsAppApiCall(payload: WhatsAppMessagePayload, maxRetries = 3) {
    let lastError: any = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`[WhatsApp API] Sending payload to ${WHATSAPP_PHONE_ID}:`, JSON.stringify(payload, null, 2));
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
                console.error(`WhatsApp API Error (Attempt ${attempt}/${maxRetries}):`, JSON.stringify(errorData, null, 2));
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
