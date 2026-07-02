/** Mask phone numbers for logs: show only last 4 digits. */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 4) return '****';
  return `******${digits.slice(-4)}`;
}

/** Redact PII from WhatsApp API payloads before logging. */
export function redactWhatsAppPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const redacted = { ...payload };
  if (typeof redacted.to === 'string') {
    redacted.to = maskPhone(redacted.to);
  }
  const template = redacted.template as Record<string, unknown> | undefined;
  if (template?.components && Array.isArray(template.components)) {
    redacted.template = {
      ...template,
      components: (template.components as Array<Record<string, unknown>>).map((component) => ({
        ...component,
        parameters: Array.isArray(component.parameters)
          ? (component.parameters as Array<Record<string, unknown>>).map((param) => ({
              ...param,
              text: typeof param.text === 'string' ? '[REDACTED]' : param.text,
            }))
          : component.parameters,
      })),
    };
  }
  const text = redacted.text as Record<string, unknown> | undefined;
  if (text?.body && typeof text.body === 'string') {
    redacted.text = { ...text, body: '[REDACTED]' };
  }
  return redacted;
}
