export interface PaymentIntentOptions {
  amount: number;
  currency?: string;
  moduleId: 'rent' | 'bazar';
  entityId: string;
  description?: string;
  customer: {
    name?: string;
    phone?: string;
    email?: string;
  };
  metadata?: Record<string, any>;
}

export interface PaymentIntentResult {
  intentId: string;
  amount: number;
  currency: string;
  status: 'created' | 'pending' | 'success' | 'failed';
  upiLink?: string;
  qrCodeUrl?: string;
}

export class CorePaymentGateway {
  createIntent(options: PaymentIntentOptions): PaymentIntentResult {
    const currency = options.currency || 'INR';
    const upiLink = `upi://pay?pa=rentsutra@upi&pn=RentSutra&am=${options.amount}&cu=${currency}&tn=${encodeURIComponent(options.description || options.entityId)}`;
    
    return {
      intentId: `pi_${options.moduleId}_${Date.now()}`,
      amount: options.amount,
      currency,
      status: 'created',
      upiLink,
    };
  }
}

export const corePaymentGateway = new CorePaymentGateway();

