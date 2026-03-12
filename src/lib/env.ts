/**
 * Safely retrieves an environment variable, stripping any leading/trailing 
 * quotes (common when setting variables in Netlify UI) and trimming whitespace.
 */
export function getEnv(key: string, defaultValue?: string, silent: boolean = false): string {
    const value = process.env[key];

    if (value === undefined || value === null) {
        if (!silent) {
            console.warn(`[getEnv] ${key} is missing, using default: ${defaultValue || 'empty'}`);
        }
        if (defaultValue !== undefined) return defaultValue;
        return '';
    }

    const sanitized = value.trim().replace(/^["']|["']$/g, '');

    // Log the first and last 3 chars for debugging (masked)
    if (!silent) {
        if (sanitized.length > 6) {
            console.log(`[getEnv] Loaded ${key}: ${sanitized.substring(0, 3)}...${sanitized.substring(sanitized.length - 3)} (length: ${sanitized.length})`);
        } else if (sanitized.length > 0) {
            console.log(`[getEnv] Loaded ${key}: ${sanitized} (length: ${sanitized.length})`);
        }
    }

    return sanitized;
}
