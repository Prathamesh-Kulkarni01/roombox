import crypto from 'crypto';

export interface SignedPayload {
    jobId: string;
    version: number;
    issuedAt: string;
    expiresAt: string;
    tenantId: string;
    type: string;
    signature?: string;
}

/**
 * Signs a payload using HMAC-SHA256 and the provided secret.
 */
export function signPayload(payload: Omit<SignedPayload, 'signature'>, secret: string): string {
    // Sort keys to ensure consistent stringification
    const sortedPayload = Object.keys(payload)
        .sort()
        .reduce((acc, key) => {
            acc[key as keyof typeof payload] = payload[key as keyof typeof payload] as any;
            return acc;
        }, {} as Record<string, any>);
        
    const data = JSON.stringify(sortedPayload);
    
    return crypto
        .createHmac('sha256', secret)
        .update(data)
        .digest('hex');
}

/**
 * Verifies the HMAC-SHA256 signature of a payload.
 * Also checks if the payload has expired.
 */
export function verifyPayload(payload: SignedPayload, secret: string): boolean {
    const { signature, ...dataToSign } = payload;
    
    if (!signature) {
        return false;
    }
    
    // 1. Verify Expiration
    const expiresAt = new Date(payload.expiresAt);
    const now = new Date();
    
    if (now > expiresAt) {
        console.warn(`[CryptoUtils] Payload rejected: Payload expired at ${expiresAt.toISOString()}`);
        return false;
    }

    // 2. Verify Signature
    const expectedSignature = signPayload(dataToSign as Omit<SignedPayload, 'signature'>, secret);
    
    // Use timingSafeEqual to prevent timing attacks
    const a = Buffer.from(signature);
    const b = Buffer.from(expectedSignature);
    
    if (a.length !== b.length) {
        return false;
    }
    
    return crypto.timingSafeEqual(a, b);
}
