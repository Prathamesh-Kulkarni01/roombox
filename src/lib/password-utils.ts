import crypto from 'crypto';

/**
 * Hashes a plaintext password using scrypt alongside a random salt.
 * Returns the salt and hash formatted as `salt:hash`.
 */
export function hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
}

/**
 * Verifies a plaintext password against a stored `salt:hash` string.
 * Returns true if the password is correct.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
    if (!password || !storedHash || !storedHash.includes(':')) return false;

    const [salt, hash] = storedHash.split(':');
    const derivedHash = crypto.scryptSync(password, salt, 64).toString('hex');
    return derivedHash === hash;
}
