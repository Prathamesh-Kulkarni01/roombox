
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function RefundPolicyPage() {
  return (
    <div className="bg-muted/40 py-12">
      <div className="container mx-auto px-4">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-3xl">Refund & Cancellation Policy</CardTitle>
            <p className="text-muted-foreground">Last updated: August 01, 2024</p>
          </CardHeader>
          <CardContent className="prose dark:prose-invert max-w-none">
            <p>
              Thank you for subscribing to RentSutra. Our goal is to ensure our users have the best experience. This policy outlines the terms regarding refunds and cancellations for our subscription services.
            </p>
            
            <h2>Subscription Fees</h2>
            <p>
              RentSutra operates on a usage-based billing model for its Pro and Enterprise plans. You are billed at the end of each monthly cycle based on the number of properties and tenants managed, plus any premium features enabled during that cycle.
            </p>

            <h2>Cancellation Policy</h2>
            <p>
              You can cancel your subscription at any time from the "Billing & Subscription" section of your dashboard.
            </p>
            <ul>
              <li>Upon cancellation, your subscription will remain active until the end of your current billing period.</li>
              <li>You will not be charged for any subsequent billing cycles after the cancellation.</li>
              <li>Your account will be automatically downgraded to the Free plan at the end of the billing period, and access to Pro features will be revoked.</li>
            </ul>

            <h2>Refund Policy</h2>
            <p>
              Due to the nature of our usage-based billing, we generally do not offer refunds for subscription fees already paid.
            </p>
            <ul>
              <li>Payments for past billing cycles are non-refundable.</li>
              <li>If you cancel your subscription, you will not receive a refund for the current billing period, but you will retain access to Pro features until the period ends.</li>
              <li>In case of a billing error or an exceptional circumstance, please contact our support team. We will review each case individually and may issue a partial or full refund at our sole discretion.</li>
            </ul>
            
            <h2>Contact Us</h2>
            <p>If you have any questions about our Refund and Cancellation Policy, please contact us:</p>
            <ul>
                <li>By email: hello@rentsutra.com</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
