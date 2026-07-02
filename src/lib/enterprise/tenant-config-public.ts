const PUBLIC_CLIENT_CONFIG_KEYS = [
  'apiKey',
  'authDomain',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId',
  'measurementId',
] as const;

export function sanitizeClientConfig(
  config: Record<string, unknown>
): Record<string, string> | null {
  const sanitized: Record<string, string> = {};
  for (const key of PUBLIC_CLIENT_CONFIG_KEYS) {
    const value = config[key];
    if (typeof value === 'string' && value.length > 0) {
      sanitized[key] = value;
    }
  }
  return Object.keys(sanitized).length > 0 ? sanitized : null;
}
