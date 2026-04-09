import { getEnv } from '../env';
import { getAdminDb } from '../firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { WhatsAppLogsService } from './logs-service';
import { ActivityLogsService } from '../activity-logs-service';

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
    let cost = 0;
    let result: { success: boolean; data?: any; error?: any; mock?: boolean } = { success: false };

    // 1. Determine Cost & Session Window
    if (ownerId) {
        try {
            // Check session window in Redis for messaging window (24h)
            const { getSession } = await import('./session-state');
            const session = await getSession(to);
            const isWithinSessionWindow = (Date.now() - (session?.lastUpdated || 0)) < SESSION_WINDOW_MS;

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

                    const subData = ownerDoc.data()?.subscription;
                    const currentCredits = subData?.whatsappCredits || 0;

                    if (currentCredits < cost) {
                        return { success: false, error: 'Insufficient credits' };
                    }

                    // For transactions, we set the absolute value derived from the state we just read
                    // to avoid any ambiguity, though increment() is also valid inside transactions in newer Admin SDKs.
                    transaction.update(ownerRef, {
                        'subscription.whatsappCredits': Number((currentCredits - cost).toFixed(2))
                    });
                    return { success: true };
                });

                if (!creditResult.success) {
                    // Log the failure attempt if it's due to credits
                    await ActivityLogsService.logActivity({
                        ownerId,
                        activityType: 'SYSTEM_LOG',
                        details: `WhatsApp FAILED: Insufficient Credits (${cost} required) for ${to}`,
                        targetId,
                        status: 'failed',
                        error: 'Insufficient credits',
                        module: 'system',
                        performedBy:   {
                            userId: 'system',
                            name: 'System',
                            role: 'system'
                            }
                    });
                    await WhatsAppLogsService.logMessage({
                        ownerId,
                        targetId,
                        phone: to,
                        direction: 'outbound',
                        type: payload.type,
                        content: `FAILED: Insufficient Credits (${cost} required)`,
                        cost: 0,
                        status: 'failed',
                        error: 'Insufficient credits'
                    });
                    return creditResult;
                }
                console.log(`[WhatsApp Billing] Successfully reserved ${cost} units from owner ${ownerId}`);
            }
        } catch (e: any) {
            console.error('[WhatsApp Billing] Error during deduction:', e.message);
            await ActivityLogsService.logActivity({
                ownerId: ownerId || 'system',
                activityType: 'SYSTEM_LOG',
                details: `WhatsApp Billing Service Error for ${to}`,
                targetId,
                status: 'failed',
                error: e.message,
                module: 'system',
                performedBy:   {
                    userId: 'system',
                    name: 'System',
                    role: 'system'
                    }
            });
            // In case of billing error, we might still want to try sending if it's critical, 
            // but for now we follow the fail-safe business rule.
            return { success: false, error: 'Billing service error' };
        }
    }

    // 2. Make the actual API call (or mock if no credentials)
    if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_ID) {
        console.warn('WhatsApp credentials not configured. Mocking API call for:', { to, payload });
        result = { success: true, mock: true };
    } else {
        result = await makeWhatsAppApiCall(payload);
        if (!result.success) {
            console.error('[WhatsApp API] Response Failure:', JSON.stringify(result.error, null, 2));
        }
    }

    // 3. Refund if failed & cost was > 0
    if (!result.success && cost > 0 && ownerId) {
        try {
            const adminDb = await getAdminDb();
            // Refund the credits
            await adminDb.collection('users').doc(ownerId).update({
                'subscription.whatsappCredits': FieldValue.increment(cost)
            });
            console.log(`[WhatsApp Billing] Refunded ${cost} units to owner ${ownerId} due to API failure`);
        } catch (re: any) {
            console.error('[WhatsApp Billing] Refund failed:', re.message);
        }
    }

    // 4. Log the result
    if (ownerId) {
        const content = payload.type === 'text' ? payload.text?.body :
            payload.type === 'template' ? `Template: ${payload.template.name}` :
                `Type: ${payload.type}${result.mock ? ' (MOCK)' : ''}`;

        await WhatsAppLogsService.logMessage({
            ownerId,
            targetId,
            phone: to,
            direction: 'outbound',
            type: payload.type,
            content: (content || '') + (result.mock ? ' [DEV MOCK]' : ''),
            cost: result.success ? cost : 0,
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
 * @param ownerId owner ID for billing
 * @param languageCode language (e.g., 'en_US', 'hi')
 * @param headerValues header parameters
 * @param bodyValues body parameters
 * @param buttonValues button parameters
 * @param targetId optional target ID for logging
 */
export async function sendWhatsAppTemplate(
    to: string,
    templateName: string,
    ownerId: string,
    languageCodeOrComponents: string | any[] = 'en_US',
    headerValuesOrOwnerId: any[] | string = [],
    bodyValues: any[] = [],
    buttonValues: any[] = [],
    targetId?: string
) {
    if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_ID) {
        console.warn('WhatsApp credentials missing. Mocking message.');
        return { success: true, mock: true };
    }

    let languageCode = 'en_US';
    let components: any[] = [];
    let finalOwnerId = ownerId;
    let finalTargetId = targetId;

    // Handle polyfill for older/different caller signatures
    // Pattern A: (to, template, ownerId, lang, header, body, buttons, targetId) -> standard
    // Pattern B: (to, template, languageCode, componentsArr, ownerId, targetId) -> used in some routes
    if (Array.isArray(languageCodeOrComponents)) {
        // Pattern B: (to, templateName, ownerId, componentsArr, actualOwnerId, actualTargetId)
        // In this pattern, the original `ownerId` parameter is actually the languageCode.
        // `languageCodeOrComponents` is the components array.
        // `headerValuesOrOwnerId` is the actual ownerId for billing.
        // `bodyValues` is the actual targetId.
        languageCode = ownerId; // The original ownerId param is the languageCode in this pattern
        components = languageCodeOrComponents;
        finalOwnerId = headerValuesOrOwnerId as string;
        finalTargetId = bodyValues as any; // targetId in this pattern
    } else {
        // Pattern A (Standard): (to, templateName, ownerId, languageCode, headerValues, bodyValues, buttonValues, targetId)
        languageCode = languageCodeOrComponents || 'en_US';
        const headerValues = headerValuesOrOwnerId as any[];
        
        if (headerValues && headerValues.length > 0) {
            components.push({ type: 'header', parameters: headerValues });
        }
        
        if (bodyValues && bodyValues.length > 0) {
            components.push({ type: 'body', parameters: bodyValues });
        }
        
        if (buttonValues && buttonValues.length > 0) {
            // For buttons, Meta requires sub_type and index in v18.0+
            components.push({ 
                type: 'button', 
                sub_type: 'url', // defaulting to url as it's most common for our apps
                index: '0', 
                parameters: buttonValues 
            });
        }
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

    return sendWhatsAppWithBilling(to, payload, finalOwnerId, finalTargetId);
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
                const wamid = data.messages?.[0]?.id;
                if (wamid) {
                    console.log(`[WhatsApp API] Success! Message ID (wamid): ${wamid}`);
                }
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

export const MessageManager = {
    sendWhatsAppMessage,
    sendWhatsAppInteractiveMessage,
    sendWhatsAppImageMessage,
    sendWhatsAppTemplate
};
