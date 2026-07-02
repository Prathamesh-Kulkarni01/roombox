import { describe, expect, it } from 'vitest';
import { maskPhone, redactWhatsAppPayload } from '../src/lib/logging/redact';
import { EnterpriseDbUnavailableError } from '../src/lib/errors/enterprise-db';

describe('logging redact', () => {
  it('masks phone numbers showing only last 4 digits', () => {
    expect(maskPhone('919876543210')).toBe('******3210');
    expect(maskPhone('+91-98765-43210')).toBe('******3210');
  });

  it('redacts recipient and template text from WhatsApp payloads', () => {
    const redacted = redactWhatsAppPayload({
      to: '919876543210',
      type: 'template',
      template: {
        name: 'rent_reminder',
        components: [
          {
            parameters: [{ type: 'text', text: 'Rahul Kumar' }],
          },
        ],
      },
    });

    expect(redacted.to).toBe('******3210');
    const components = (redacted.template as { components: Array<{ parameters: Array<{ text: string }> }> }).components;
    expect(components[0].parameters[0].text).toBe('[REDACTED]');
  });
});

describe('EnterpriseDbUnavailableError', () => {
  it('exposes owner id in the error message', () => {
    const error = new EnterpriseDbUnavailableError('owner-123', new Error('init failed'));
    expect(error.message).toContain('owner-123');
    expect(error.name).toBe('EnterpriseDbUnavailableError');
  });
});
