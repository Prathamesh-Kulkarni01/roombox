
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TermsOfServicePage() {
  return (
    <div className="bg-muted/40 py-12">
      <div className="container mx-auto px-4">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-3xl">Terms of Service</CardTitle>
            <p className="text-muted-foreground">Last updated: August 01, 2024</p>
          </CardHeader>
          <CardContent className="prose dark:prose-invert max-w-none">
            <p>
              Please read these terms and conditions carefully before using Our Service.
            </p>
            
            <h2>1. Agreement to Terms</h2>
            <p>
              By using our Service, you agree to be bound by these Terms. If you disagree with any part of the terms, then you may not access the Service.
            </p>

            <h2>2. Accounts</h2>
            <p>
              When you create an account with us, you must provide us with information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service.
            </p>

            <h2>3. Subscriptions</h2>
            <p>
              Some parts of the Service are billed on a subscription basis. You will be billed in advance on a recurring and periodic basis ("Billing Cycle"). Billing cycles are set on a monthly basis.
            </p>

            <h2>4. Termination</h2>
            <p>
              We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
            </p>
            
            <h2>5. Limitation of Liability</h2>
            <p>
              In no event shall RentSutra, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.
            </p>
            
            <h2>Contact Us</h2>
            <p>If you have any questions about these Terms, please contact us:</p>
            <ul>
                <li>By email: hello@rentsutra.com</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
