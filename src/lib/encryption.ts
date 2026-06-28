import crypto from 'crypto';

const ENCRYPTION_KEY_RAW = process.env.TOKEN_ENCRYPTION_KEY || process.env.FIREBASE_PRIVATE_KEY || 'rentsutra-default-encryption-fallback-key-32chars!';

const getEncryptionKey = (): Buffer => {
  return crypto.createHash('sha256').update(ENCRYPTION_KEY_RAW).digest();
};

const IV_LENGTH = 12; // GCM standard IV length
const AUTH_TAG_LENGTH = 16; // GCM tag length

/**
 * Encrypt a string using AES-256-GCM.
 * Output is formatted as iv:authTag:encryptedText
 */
export function encrypt(text: string): string {
  if (!text) return text;
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt a string using AES-256-GCM.
 * If the string is not formatted as cipher output or decryption fails,
 * it returns the original string (enabling seamless backwards compatibility).
 */
export function decrypt(encryptedData: string): string {
  if (!encryptedData) return encryptedData;
  try {
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      // Not encrypted with this GCM scheme, return as-is (plain text fallback)
      return encryptedData;
    }
    
    const [ivHex, authTagHex, encryptedText] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const key = getEncryptionKey();
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    // Fallback to original data on failure (e.g. legacy plain text)
    return encryptedData;
  }
}

/**
 * Encrypt access_token and refresh_token inside the token object.
 */
export function encryptTokens(tokens: any): any {
  if (!tokens) return tokens;
  const result = { ...tokens };
  if (typeof result.access_token === 'string') {
    result.access_token = encrypt(result.access_token);
  }
  if (typeof result.refresh_token === 'string') {
    result.refresh_token = encrypt(result.refresh_token);
  }
  return result;
}

/**
 * Decrypt access_token and refresh_token inside the token object.
 */
export function decryptTokens(tokens: any): any {
  if (!tokens) return tokens;
  const result = { ...tokens };
  if (typeof result.access_token === 'string') {
    result.access_token = decrypt(result.access_token);
  }
  if (typeof result.refresh_token === 'string') {
    result.refresh_token = decrypt(result.refresh_token);
  }
  return result;
}
