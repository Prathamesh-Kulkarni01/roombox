/**
 * Safely retrieves an environment variable, stripping any leading/trailing 
 * quotes (common when setting variables in Netlify UI) and trimming whitespace.
 */
export function getEnv(key: string, defaultValue?: string): string {
    const value = process.env[key];

    if (value === undefined || value === null) {
        if (defaultValue !== undefined) return defaultValue;
        return '';
    }

    // Trim whitespace and remove surrounding " or '
    return value.trim().replace(/^["']|["']$/g, '');
}
